"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, ChoiceSelect } from "@/components/forms/fields"
import { ErrorSummary } from "@/components/forms/error-summary"
import { parseApiErrors, type ApiFieldError } from "@/lib/field-labels"
import { CARE_LOG_CATEGORY, CARE_LOG_CATEGORY_LABEL, CARE_LOG_CATEGORY_ICON } from "@/lib/constants"
import { careService } from "@/services/care.service"
import { ROUTES } from "@/lib/routes"
import type { CareLogCategory, CareLogEntry, CaregiverAssignment } from "@/types/care"

export default function PatientDetailPage() {
  return (
    <Suspense fallback={null}>
      <PatientDetailInner />
    </Suspense>
  )
}

function PatientDetailInner() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = Number(searchParams.get("id"))

  const [patientName, setPatientName] = useState("")
  const [entries, setEntries] = useState<CareLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [category, setCategory] = useState<CareLogCategory>("general")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ApiFieldError[]>([])

  function refresh() {
    return Promise.all([
      careService.myPatients().then((list: CaregiverAssignment[]) => {
        const match = list.find((a) => a.patient === patientId)
        if (match) setPatientName(match.patient_name)
      }),
      careService.myLogEntries(patientId).then(setEntries),
    ])
  }

  useEffect(() => {
    if (!patientId) return
    refresh().finally(() => setLoading(false))
  }, [patientId])

  if (authLoading || !user) return null

  async function handleSubmit() {
    setSaving(true); setError([])
    try {
      await careService.submitLogEntry(patientId, category, note)
      setNote("")
      await refresh()
    } catch (err: any) {
      const parsed = parseApiErrors(err?.response?.data)
      setError(parsed.length > 0 ? parsed : [{ field: "detail", messages: [err?.response?.data?.detail || "ثبت گزارش با خطا مواجه شد."] }])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b border-pink-100 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">{patientName || "..."}</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <>
            <ErrorSummary errors={error} />

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-rose-900">ثبت گزارش جدید</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="دسته گزارش" required>
                  <ChoiceSelect choices={CARE_LOG_CATEGORY} value={category} onChange={(v) => setCategory(v as CareLogCategory)} />
                </Field>
                <Field label="متن گزارش" required>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="مشاهدات، اقدامات انجام‌شده، یا هر نکته‌ای که خانواده باید بداند..." rows={4} />
                </Field>
                <Button
                  className="w-full bg-gradient-to-l from-pink-400 to-rose-400 shadow-md shadow-pink-200/50 hover:from-pink-500 hover:to-rose-500"
                  size="lg" disabled={saving || !note} onClick={handleSubmit}
                >
                  {saving ? "در حال ثبت..." : "ثبت گزارش"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-rose-900">گزارش‌های قبلی شما</CardTitle></CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">هنوز گزارشی برای این بیمار ثبت نکرده‌اید.</p>
                ) : (
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div key={entry.id} className="flex gap-3 border-r-2 border-pink-200 pr-3">
                        <span className="text-lg leading-none">{CARE_LOG_CATEGORY_ICON[entry.category] || "📝"}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-rose-700">{CARE_LOG_CATEGORY_LABEL[entry.category] || entry.category}</p>
                            <p className="text-xs text-muted-foreground">{entry.created_at.slice(0, 16).replace("T", " — ")}</p>
                          </div>
                          <p className="text-sm">{entry.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
