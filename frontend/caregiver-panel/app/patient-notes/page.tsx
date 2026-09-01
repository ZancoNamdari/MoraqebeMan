"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, ChoiceSelect } from "@/components/forms/fields"
import { patientNotesService, type PatientNoteListItem } from "@/services/patient_notes.service"
import { careService } from "@/services/care.service"
import type { CaregiverAssignment } from "@/types/care"
import { PATIENT_NOTE_CATEGORY } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"

export default function PatientNotesPage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()

  const [notes, setNotes] = useState<PatientNoteListItem[]>([])
  const [assignments, setAssignments] = useState<CaregiverAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [patientId, setPatientId] = useState<number | null>(null)
  const [category, setCategory] = useState("")
  const [note, setNote] = useState("")
  const [flaggedUrgent, setFlaggedUrgent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function refresh() {
    return patientNotesService.list().then(setNotes)
  }

  useEffect(() => {
    if (!user) return
    Promise.all([refresh(), careService.myPatients().then(setAssignments)]).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  function resetForm() {
    setPatientId(null); setCategory(""); setNote(""); setFlaggedUrgent(false)
  }

  async function handleSubmit() {
    if (!patientId || !category || !note.trim()) return
    setSaving(true); setError("")
    try {
      await patientNotesService.file({ patient: patientId, category, note, flagged_urgent: flaggedUrgent })
      resetForm()
      setShowForm(false)
      await refresh()
    } catch (err: any) {
      const detail = err?.response?.data
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" — ") : "ثبت یادداشت با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">یادداشت درباره سالمند</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <p className="text-xs text-muted-foreground">
          این یادداشت‌ها فقط توسط تیم مراقب من دیده می‌شود، نه خانواده سالمند.
        </p>

        <Card className="border-pink-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-rose-900">ثبت یادداشت جدید</CardTitle>
            {!showForm && assignments.length > 0 && (
              <Button size="sm" onClick={() => setShowForm(true)}>ثبت یادداشت</Button>
            )}
          </CardHeader>
          {showForm && (
            <CardContent className="space-y-3">
              {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}
              <Field label="سالمند مربوطه" required>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={patientId ?? ""}
                  onChange={(e) => setPatientId(Number(e.target.value) || null)}
                >
                  <option value="">انتخاب کنید...</option>
                  {assignments.map((a) => <option key={a.patient} value={a.patient}>{a.patient_name}</option>)}
                </select>
              </Field>
              <Field label="دسته‌بندی" required>
                <ChoiceSelect choices={PATIENT_NOTE_CATEGORY} value={category} onChange={setCategory} />
              </Field>
              <Field label="متن یادداشت" required>
                <Textarea maxLength={2000} rows={5} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={flaggedUrgent} onChange={(e) => setFlaggedUrgent(e.target.checked)} />
                نیازمند توجه فوری تیم (نگرانی ایمنی که نباید منتظر بررسی روتین بماند)
              </label>
              <div className="flex gap-2">
                <Button size="sm" disabled={!patientId || !category || !note.trim() || saving} onClick={handleSubmit}>
                  {saving ? "در حال ثبت..." : "ثبت یادداشت"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); resetForm() }}>انصراف</Button>
              </div>
            </CardContent>
          )}
          {!showForm && assignments.length === 0 && !loading && (
            <CardContent>
              <p className="text-sm text-muted-foreground">در حال حاضر به سالمندی تخصیص ندارید.</p>
            </CardContent>
          )}
        </Card>

        <Card className="border-pink-100">
          <CardHeader><CardTitle className="text-base text-rose-900">یادداشت‌های ثبت‌شده ({notes.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full rounded-2xl" />
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">هنوز یادداشتی ثبت نکرده‌اید.</p>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-pink-100 bg-pink-50/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{n.patient_name || "—"}</span>
                      {n.flagged_urgent && (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-800">فوری</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.acknowledged_at ? "دیده‌شده توسط تیم" : "هنوز دیده نشده"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
