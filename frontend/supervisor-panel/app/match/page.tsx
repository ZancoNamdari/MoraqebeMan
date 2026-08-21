"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { assignmentService, matchingService, type CaregiverSuggestion } from "@/services/assignment.service"
import { patientAvatar, PATIENT_QUESTIONNAIRE_LABELS, PATIENT_AXIS_TO_CAREGIVER_SECTION } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"

export default function MatchPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [patientCode, setPatientCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [patientName, setPatientName] = useState("")
  const [patientGender, setPatientGender] = useState("")
  const [suggestions, setSuggestions] = useState<CaregiverSuggestion[] | null>(null)
  const [patientAnswers, setPatientAnswers] = useState<Record<string, string> | null>(null)
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set())
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (authLoading || !user) return null

  async function handleSearch() {
    setLoading(true); setError(""); setSuggestions(null); setPatientAnswers(null)
    const code = patientCode.trim().toUpperCase()
    try {
      const result = await matchingService.suggestCaregivers(code)
      setPatientName(result.patient_name)
      setPatientGender(result.patient_gender)
      setSuggestions(result.suggestions)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "کد بیمار معتبر نیست.")
      setLoading(false)
      return
    }
    // Patient questionnaire is optional — a patient not having filled
    // it in yet shouldn't block seeing caregiver suggestions at all.
    try {
      const answers = await matchingService.patientQuestionnaire(code)
      setPatientAnswers(answers)
    } catch {
      setPatientAnswers(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleAssign(caregiverUserId: number) {
    setAssigningId(caregiverUserId)
    try {
      await assignmentService.assign(caregiverUserId, patientCode.trim().toUpperCase())
      setAssignedIds((prev) => new Set(prev).add(caregiverUserId))
    } finally {
      setAssigningId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">پیشنهاد مراقب مناسب</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <Card className="border-pink-100">
          <CardHeader><CardTitle className="text-rose-900">جست‌وجو با کد بیمار</CardTitle></CardHeader>
          <CardContent>
            {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Input placeholder="کد بیمار (مثلاً ELD-7K4P9X)" className="w-56" value={patientCode} onChange={(e) => setPatientCode(e.target.value)} dir="ltr" />
              <Button
                className="bg-gradient-to-l from-brand-pink to-brand-mint-strong shadow-md shadow-brand-pink/30 hover:from-brand-pink-strong hover:to-brand-mint-strong"
                disabled={loading || !patientCode}
                onClick={handleSearch}
              >
                {loading ? "در حال جست‌وجو..." : "جست‌وجو"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading && <Skeleton className="h-64 w-full rounded-2xl" />}

        {patientAnswers && !loading && (
          <Card className="border-pink-100 bg-pink-50/30">
            <CardHeader><CardTitle className="text-sm text-rose-800">پرسشنامه سازگاری بیمار</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-muted-foreground">
                برای مقایسه با بخش مربوطه در پرسشنامه هر مراقب — «نمایش جزئیات» را در کارت آن مراقب باز کنید.
              </p>
              <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                {Object.entries(PATIENT_QUESTIONNAIRE_LABELS).map(([field, meta]) => {
                  const answer = patientAnswers[field]
                  const answerLabel = meta.choices.find(([v]) => v === answer)?.[1] || answer
                  return (
                    <div key={field} className="rounded border border-pink-100 bg-white px-2 py-1">
                      <span className="text-muted-foreground">{meta.label}: </span>
                      <span className="font-medium text-rose-800">{answerLabel}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {suggestions !== null && !loading && (
          <Card className="border-pink-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-900">
                <span className="text-lg">{patientAvatar(patientGender)}</span>
                مراقبان پیشنهادی برای {patientName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">هیچ مراقب تأییدشده‌ای در حال حاضر در دسترس نیست.</p>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((s) => (
                    <div key={s.caregiver_user_id} className="rounded-lg border border-pink-100 bg-pink-50/40 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{patientAvatar(s.caregiver_gender)}</span>
                          <div>
                            <p className="text-sm font-medium">{s.caregiver_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.mcdm_score !== null && <span>امتیاز نهایی (AHP/TOPSIS): {s.mcdm_score.toFixed(1)} از ۱۰۰</span>}
                              {s.objective_fit_score !== null && <span> · تناسب عینی: {s.objective_fit_score}</span>}
                              {s.trait_match_score !== null && <span> · تناسب روان‌سنجی: {s.trait_match_score}</span>}
                              {s.avg_rating !== null && <span> · {"★".repeat(Math.round(s.avg_rating))}{"☆".repeat(5 - Math.round(s.avg_rating))} ({s.avg_rating} از {s.review_count} نظر)</span>}
                              {s.caregiver_cfi !== null && <span> · شاخص انعطاف‌پذیری فرهنگی: {s.caregiver_cfi}٪</span>}
                              <span> · {s.active_patient_count > 0 ? `در حال حاضر ${s.active_patient_count} بیمار دیگر` : "بدون بیمار دیگر"}</span>
                            </p>
                          </div>
                        </div>
                        {assignedIds.has(s.caregiver_user_id) ? (
                          <span className="text-xs font-medium text-emerald-700">✓ تخصیص یافت</span>
                        ) : (
                          <Button
                            size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50"
                            disabled={assigningId === s.caregiver_user_id}
                            onClick={() => handleAssign(s.caregiver_user_id)}
                          >
                            {assigningId === s.caregiver_user_id ? "..." : "تخصیص"}
                          </Button>
                        )}
                      </div>
                      <ul className="mt-2 space-y-1 border-t border-pink-100 pt-2">
                        {s.objective_fit_reasons.map((reason, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {reason}</li>
                        ))}
                      </ul>

                      {(s.flexibility_sections || Object.keys(s.trait_dimension_scores).length > 0) && (
                        <>
                          <button
                            className="mt-2 text-xs text-rose-600 hover:underline"
                            onClick={() => setExpandedId(expandedId === s.caregiver_user_id ? null : s.caregiver_user_id)}
                          >
                            {expandedId === s.caregiver_user_id ? "بستن جزئیات" : "نمایش جزئیات پرسشنامه سازگاری"}
                          </button>
                          {expandedId === s.caregiver_user_id && (
                            <div className="mt-2 space-y-3 border-t border-pink-100 pt-2 text-xs">
                              {Object.keys(s.trait_dimension_scores).length > 0 && (
                                <div>
                                  <p className="mb-1 font-medium text-rose-800">تناسب روان‌سنجی (بر اساس هر دو پرسشنامه)</p>
                                  {Object.entries(s.trait_dimension_scores).map(([dimension, score]) => (
                                    <div key={dimension} className="flex items-center justify-between">
                                      <span>{dimension}</span>
                                      <span className="font-medium text-rose-700">{score}٪</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {s.flexibility_sections && (
                                <div>
                                  <p className="mb-1 font-medium text-rose-800">پرسشنامه مراقب به‌تفکیک بخش</p>
                                  {Object.entries(s.flexibility_sections).map(([section, score]) => {
                                    const matchingAxis = Object.entries(PATIENT_AXIS_TO_CAREGIVER_SECTION).find(([, sec]) => sec === section)?.[0]
                                    return (
                                      <div key={section} className="flex items-center justify-between">
                                        <span>{section}{matchingAxis && <span className="text-muted-foreground"> (معادل «{matchingAxis}» بیمار)</span>}</span>
                                        <span className="font-medium text-rose-700">{score}٪</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
