"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, ChoiceSelect } from "@/components/forms/fields"
import { complaintsService, type ComplaintListItem } from "@/services/complaints.service"
import { patientService } from "@/services/patient.service"
import type { PatientListItem } from "@/types/patient"
import { COMPLAINT_CATEGORY, COMPLAINT_STATUS_LABEL } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

const STATUS_CLASS: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
  dismissed: "bg-gray-100 text-gray-600",
}

export default function ComplaintsPage() {
  const { user, loading: authLoading } = useAuth(["family"])
  const router = useRouter()

  const [complaints, setComplaints] = useState<ComplaintListItem[]>([])
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [patientId, setPatientId] = useState<number | null>(null)
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [voiceNote, setVoiceNote] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function refresh() {
    return complaintsService.list().then(setComplaints)
  }

  useEffect(() => {
    if (!user) return
    Promise.all([refresh(), patientService.list().then(setPatients)]).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  function resetForm() {
    setPatientId(null); setCategory(""); setDescription(""); setVoiceNote(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSubmit() {
    if (!patientId || !category || !description.trim()) return
    setSaving(true); setError("")
    try {
      await complaintsService.file({ patient: patientId, category, description, voice_note: voiceNote })
      resetForm()
      setShowForm(false)
      await refresh()
    } catch (err: any) {
      const detail = err?.response?.data
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" — ") : "ثبت شکایت با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">شکایات و بازخورد</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <Card className="border-pink-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-rose-900">ثبت شکایت جدید</CardTitle>
            {!showForm && patients.length > 0 && (
              <Button size="sm" onClick={() => setShowForm(true)}>ثبت شکایت</Button>
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
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </Field>
              <Field label="دسته‌بندی" required>
                <ChoiceSelect choices={COMPLAINT_CATEGORY} value={category} onChange={setCategory} />
              </Field>
              <Field label="شرح شکایت" required>
                <Textarea maxLength={2000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <Field label="فایل صوتی (اختیاری)">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.m4a,.wav,.ogg,.webm,.aac"
                  onChange={(e) => setVoiceNote(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted-foreground file:ml-3 file:rounded-md file:border-0 file:bg-pink-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-rose-700"
                />
              </Field>
              <div className="flex gap-2">
                <Button size="sm" disabled={!patientId || !category || !description.trim() || saving} onClick={handleSubmit}>
                  {saving ? "در حال ثبت..." : "ثبت شکایت"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); resetForm() }}>انصراف</Button>
              </div>
            </CardContent>
          )}
          {!showForm && patients.length === 0 && !loading && (
            <CardContent>
              <p className="text-sm text-muted-foreground">برای ثبت شکایت، ابتدا باید حداقل یک سالمند به حساب شما متصل باشد.</p>
            </CardContent>
          )}
        </Card>

        <Card className="border-pink-100">
          <CardHeader><CardTitle className="text-base text-rose-900">شکایات ثبت‌شده ({complaints.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full rounded-2xl" />
            ) : complaints.length === 0 ? (
              <p className="text-sm text-muted-foreground">هنوز شکایتی ثبت نکرده‌اید.</p>
            ) : (
              <div className="space-y-2">
                {complaints.map((c) => (
                  <div key={c.id} className="rounded-lg border border-pink-100 bg-pink-50/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.patient_name || "—"}</span>
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", STATUS_CLASS[c.status])}>
                        {COMPLAINT_STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    {c.caregiver_name && <p className="mt-1 text-xs text-muted-foreground">درباره: {c.caregiver_name}</p>}
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
