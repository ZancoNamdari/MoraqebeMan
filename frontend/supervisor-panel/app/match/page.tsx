"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { assignmentService, matchingService, type CaregiverSuggestion } from "@/services/assignment.service"
import { patientAvatar } from "@/lib/constants"
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
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set())

  if (authLoading || !user) return null

  async function handleSearch() {
    setLoading(true); setError(""); setSuggestions(null)
    try {
      const result = await matchingService.suggestCaregivers(patientCode.trim().toUpperCase())
      setPatientName(result.patient_name)
      setPatientGender(result.patient_gender)
      setSuggestions(result.suggestions)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "کد بیمار معتبر نیست.")
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
                            <p className="text-xs text-muted-foreground">امتیاز تناسب: {s.score} از ۱۰۰</p>
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
                        {s.reasons.map((reason, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {reason}</li>
                        ))}
                      </ul>
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
