"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { assignmentService, matchingService, type CaregiverSuggestion } from "@/services/assignment.service"
import { patientAvatar, PATIENT_QUESTIONNAIRE_LABELS, PATIENT_AXIS_TO_CAREGIVER_SECTION } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

export default function MatchPage() {
  const { user, loading: authLoading } = useAuth(["admin", "superuser"])
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
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background pb-10">
      <AppHeader title="پیشنهاد مراقب مناسب" maxWidth="max-w-2xl">
        <Button variant="outline" size="sm" className="border-border text-primary-strong hover:bg-secondary" onClick={() => router.push(ROUTES.matchWeights)}>
          تنظیم وزن معیارها
        </Button>
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
      </AppHeader>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <Card className="border-border">
          <CardHeader><CardTitle className="text-foreground">جست‌وجو با کد بیمار</CardTitle></CardHeader>
          <CardContent>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Input placeholder="کد بیمار (مثلاً ELD-7K4P9X)" className="w-56" value={patientCode} onChange={(e) => setPatientCode(e.target.value)} dir="ltr" />
              <Button
                className="bg-gradient-to-l from-primary to-primary shadow-md shadow-primary/30 hover:from-primary hover:to-primary"
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
          <Card className="border-border bg-secondary/30">
            <CardHeader><CardTitle className="text-sm text-foreground">پرسشنامه سازگاری بیمار</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-muted-foreground">
                برای مقایسه با بخش مربوطه در پرسشنامه هر مراقب — «نمایش جزئیات» را در کارت آن مراقب باز کنید.
              </p>
              <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                {Object.entries(PATIENT_QUESTIONNAIRE_LABELS).map(([field, meta]) => {
                  const answer = patientAnswers[field]
                  const answerLabel = meta.choices.find(([v]) => v === answer)?.[1] || answer
                  return (
                    <div key={field} className="rounded border border-border bg-white px-2 py-1">
                      <span className="text-muted-foreground">{meta.label}: </span>
                      <span className="font-medium text-foreground">{answerLabel}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {suggestions !== null && !loading && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
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
                    <div key={s.caregiver_user_id} className="rounded-lg border border-border bg-secondary/40 p-3">
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
                            size="sm" variant="outline" className="border-border text-primary-strong hover:bg-secondary"
                            disabled={assigningId === s.caregiver_user_id}
                            onClick={() => handleAssign(s.caregiver_user_id)}
                          >
                            {assigningId === s.caregiver_user_id ? "..." : "تخصیص"}
                          </Button>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
                        <span className="text-xs font-medium text-foreground">{s.explanation.summary}</span>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          s.match_confidence === "high" && "bg-emerald-100 text-emerald-800",
                          s.match_confidence === "medium" && "bg-amber-100 text-amber-800",
                          s.match_confidence === "low" && "bg-gray-100 text-gray-600",
                        )}>
                          اطمینان {s.match_confidence === "high" ? "بالا" : s.match_confidence === "medium" ? "متوسط" : "کم"}
                        </span>
                      </div>
                      {s.explanation.strengths.length > 0 && (
                        <p className="mt-1 text-xs text-emerald-700">✓ {s.explanation.strengths.join(" · ")}</p>
                      )}
                      {s.explanation.weaknesses.length > 0 && (
                        <p className="mt-1 text-xs text-amber-700">⚠ {s.explanation.weaknesses.join(" · ")}</p>
                      )}

                      <ul className="mt-2 space-y-1 border-t border-border pt-2">
                        {s.objective_reasons.map((reason, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {reason}</li>
                        ))}
                        {s.waterfall_reasons.map((reason, i) => (
                          <li key={`w-${i}`} className="text-xs text-muted-foreground">• {reason}</li>
                        ))}
                      </ul>

                      {(s.flexibility_sections || Object.keys(s.trait_dimension_scores).length > 0) && (
                        <>
                          <button
                            className="mt-2 text-xs text-primary-strong hover:underline"
                            onClick={() => setExpandedId(expandedId === s.caregiver_user_id ? null : s.caregiver_user_id)}
                          >
                            {expandedId === s.caregiver_user_id ? "بستن جزئیات" : "نمایش جزئیات پرسشنامه سازگاری"}
                          </button>
                          {expandedId === s.caregiver_user_id && (
                            <div className="mt-2 space-y-3 border-t border-border pt-2 text-xs">
                              {Object.keys(s.trait_dimension_scores).length > 0 && (
                                <div>
                                  <p className="mb-1 font-medium text-foreground">تناسب روان‌سنجی (بر اساس هر دو پرسشنامه)</p>
                                  {Object.entries(s.trait_dimension_scores).map(([dimensionKey, score]) => (
                                    <div key={dimensionKey} className="flex items-center justify-between">
                                      <span>{s.trait_dimension_labels[dimensionKey] || dimensionKey}</span>
                                      <span className="font-medium text-primary-strong">{score}٪</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {s.flexibility_sections && (
                                <div>
                                  <p className="mb-1 font-medium text-foreground">پرسشنامه مراقب به‌تفکیک بخش</p>
                                  {Object.entries(s.flexibility_sections).map(([section, score]) => {
                                    const matchingAxis = Object.entries(PATIENT_AXIS_TO_CAREGIVER_SECTION).find(([, sec]) => sec === section)?.[0]
                                    return (
                                      <div key={section} className="flex items-center justify-between">
                                        <span>{section}{matchingAxis && <span className="text-muted-foreground"> (معادل «{matchingAxis}» بیمار)</span>}</span>
                                        <span className="font-medium text-primary-strong">{score}٪</span>
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
