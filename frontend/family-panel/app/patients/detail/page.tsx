"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, ChoiceSelect, SelectWithOther } from "@/components/forms/fields"
import { JalaliDatePicker } from "@/components/forms/jalali-date-picker"
import { LocationPicker } from "@/components/forms/location-picker"
import { ErrorSummary } from "@/components/forms/error-summary"
import { parseApiErrors, type ApiFieldError } from "@/lib/field-labels"
import { GUARDIANSHIP_STATUS, QUESTIONNAIRE_FIELDS, RELATION_TYPE, LANGUAGE_DIALECT, CARE_LOG_CATEGORY_LABEL, CARE_LOG_CATEGORY_ICON, labelForValue } from "@/lib/constants"
import { patientService } from "@/services/patient.service"
import { careService } from "@/services/care.service"
import { ROUTES } from "@/lib/routes"
import type { AccessLevel, FamilyLink, PatientListItem, Questionnaire } from "@/types/patient"
import type { CaregiverAssignment, CareLogEntry } from "@/types/care"
import { cn } from "@/lib/utils"

type Tab = "info" | "questionnaire" | "access" | "care"

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
  const id = Number(searchParams.get("id"))

  const [tab, setTab] = useState<Tab>("info")
  const [patient, setPatient] = useState<PatientListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ApiFieldError[]>([])
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!id) return
    patientService.get(id).then(setPatient).finally(() => setLoading(false))
  }, [id])

  if (authLoading || !user) return null

  async function handleSaveInfo() {
    if (!patient) return
    setSaving(true); setError([]); setMessage("")
    try {
      const updated = await patientService.update(id, {
        full_name: patient.full_name, father_name: patient.father_name,
        birth_date: patient.birth_date, national_id: patient.national_id,
        full_address: patient.full_address, province: patient.province,
        city: patient.city, district: patient.district, postal_code: patient.postal_code,
        emergency_contact_phone: patient.emergency_contact_phone,
        guardianship_status: patient.guardianship_status, guardian_details: patient.guardian_details,
        language_dialect: patient.language_dialect, basic_medical_info: patient.basic_medical_info,
      })
      setPatient(updated)
      setMessage("تغییرات ذخیره شد.")
    } catch (err: any) {
      setError(parseApiErrors(err?.response?.data))
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`آیا از حذف اطلاعات «${patient?.full_name}» مطمئن هستید؟ این کار قابل بازگشت نیست.`)) return
    await patientService.remove(id)
    router.push(ROUTES.dashboard)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b border-pink-100 bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="font-bold text-rose-900">{patient?.full_name || "..."}</h1>
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
          </div>
          <div className="flex gap-1 rounded-full bg-pink-50 p-1">
            {([["info", "اطلاعات"], ["questionnaire", "پرسشنامه سازگاری"], ["care", "تیم مراقبت"], ["access", "دسترسی خانواده"]] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex-1 rounded-full py-1.5 text-xs font-medium transition-colors",
                  tab === key ? "bg-white text-rose-700 shadow-sm" : "text-muted-foreground hover:text-rose-600"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        {loading || !patient ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <>
            <ErrorSummary errors={error} />
            {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}

            {tab === "info" && (
              <InfoTab patient={patient} setPatient={setPatient} onSave={handleSaveInfo} onDelete={handleDelete} saving={saving} />
            )}
            {tab === "questionnaire" && <QuestionnaireTab patientId={id} />}
            {tab === "care" && <CareTab patientId={id} />}
            {tab === "access" && <AccessTab patientId={id} patientCode={patient.access_code} />}
          </>
        )}
      </main>
    </div>
  )
}

function InfoTab({
  patient, setPatient, onSave, onDelete, saving,
}: {
  patient: PatientListItem
  setPatient: (p: PatientListItem) => void
  onSave: () => void
  onDelete: () => void
  saving: boolean
}) {
  return (
    <>
      <Card className="border-pink-100">
        <CardHeader><CardTitle className="text-rose-900">اطلاعات هویتی</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="نام و نام خانوادگی" required>
            <Input value={patient.full_name} onChange={(e) => setPatient({ ...patient, full_name: e.target.value })} />
          </Field>
          <Field label="نام پدر">
            <Input value={patient.father_name} onChange={(e) => setPatient({ ...patient, father_name: e.target.value })} />
          </Field>
          <Field label="تاریخ تولد">
            <JalaliDatePicker value={patient.birth_date || ""} onChange={(v) => setPatient({ ...patient, birth_date: v })} />
          </Field>
          <Field label="شماره ملی">
            <Input value={patient.national_id} onChange={(e) => setPatient({ ...patient, national_id: e.target.value })} dir="ltr" />
          </Field>

          <LocationPicker
            province={patient.province} city={patient.city} district={patient.district}
            onChange={(v) => setPatient({ ...patient, ...v })}
          />
          <Field label="نشانی کامل">
            <Textarea value={patient.full_address} onChange={(e) => setPatient({ ...patient, full_address: e.target.value })} />
          </Field>
          <Field label="شماره تماس اضطراری">
            <Input value={patient.emergency_contact_phone} onChange={(e) => setPatient({ ...patient, emergency_contact_phone: e.target.value })} dir="ltr" />
          </Field>

          <Field label="وضعیت سرپرستی">
            <ChoiceSelect choices={GUARDIANSHIP_STATUS} value={patient.guardianship_status} onChange={(v) => setPatient({ ...patient, guardianship_status: v })} />
          </Field>
          {patient.guardianship_status !== "none" && (
            <Field label="اطلاعات وصی/قیم" required>
              <Textarea value={patient.guardian_details} onChange={(e) => setPatient({ ...patient, guardian_details: e.target.value })} />
            </Field>
          )}
          <Field label="زبان و گویش">
            <SelectWithOther choices={LANGUAGE_DIALECT} value={patient.language_dialect} onChange={(v) => setPatient({ ...patient, language_dialect: v })} />
          </Field>
          <Field label="اطلاعات پزشکی پایه">
            <Textarea value={patient.basic_medical_info} onChange={(e) => setPatient({ ...patient, basic_medical_info: e.target.value })} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          className="flex-1 bg-gradient-to-l from-pink-400 to-rose-400 shadow-md shadow-pink-200/50 hover:from-pink-500 hover:to-rose-500"
          size="lg" onClick={onSave} disabled={saving}
        >
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
        <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={onDelete}>
          حذف
        </Button>
      </div>
    </>
  )
}

function QuestionnaireTab({ patientId }: { patientId: number }) {
  const [answers, setAnswers] = useState<Partial<Questionnaire>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    patientService.getQuestionnaire(patientId).then(setAnswers).catch(() => {}).finally(() => setLoading(false))
  }, [patientId])

  async function handleSave() {
    setSaving(true); setMessage("")
    try {
      const saved = await patientService.saveQuestionnaire(patientId, answers as Questionnaire)
      setAnswers(saved)
      setMessage("پرسشنامه ذخیره شد.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton className="h-96 w-full rounded-2xl" />

  const axes = Array.from(new Set(QUESTIONNAIRE_FIELDS.map((f) => f.axis)))

  return (
    <>
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
      {axes.map((axis) => (
        <Card key={axis} className="border-pink-100">
          <CardHeader><CardTitle className="text-sm text-rose-800">{axis}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {QUESTIONNAIRE_FIELDS.filter((f) => f.axis === axis).map((f) => (
              <Field key={f.name} label={f.label}>
                <ChoiceSelect
                  choices={f.scale}
                  value={(answers as any)[f.name] || ""}
                  onChange={(v) => setAnswers({ ...answers, [f.name]: v })}
                />
              </Field>
            ))}
          </CardContent>
        </Card>
      ))}
      <Button
        className="w-full bg-gradient-to-l from-pink-400 to-rose-400 shadow-md shadow-pink-200/50 hover:from-pink-500 hover:to-rose-500"
        size="lg" onClick={handleSave} disabled={saving}
      >
        {saving ? "در حال ذخیره..." : "ذخیره پرسشنامه"}
      </Button>
    </>
  )
}

function AccessTab({ patientId, patientCode }: { patientId: number; patientCode: string }) {
  const [links, setLinks] = useState<FamilyLink[]>([])
  const [pending, setPending] = useState<FamilyLink[]>([])
  const [loading, setLoading] = useState(true)
  const [familyCode, setFamilyCode] = useState("")
  const [relation, setRelation] = useState("")
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("full_access")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  function refresh() {
    return Promise.all([
      patientService.listFamilyLinks(patientId).then(setLinks),
      patientService.listAccessRequests(patientId).then(setPending),
    ])
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [patientId])

  async function handleInvite() {
    setBusy(true); setError("")
    try {
      await patientService.inviteFamilyByCode(patientId, {
        family_code: familyCode.trim().toUpperCase(), relation, access_level: accessLevel,
      })
      setFamilyCode(""); setRelation("")
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.detail || "افزودن با خطا مواجه شد.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDecision(linkId: number, decision: "approve" | "reject") {
    await patientService.decideAccessRequest(patientId, linkId, decision)
    refresh()
  }

  async function handleMakePrimary(linkId: number) {
    await patientService.updateFamilyLink(patientId, linkId, { is_primary_contact: true })
    refresh()
  }

  async function handleRemove(linkId: number) {
    if (!window.confirm("آیا از حذف دسترسی این عضو خانواده مطمئن هستید؟")) return
    try {
      await patientService.removeFamilyLink(patientId, linkId)
      refresh()
    } catch (err: any) {
      window.alert(err?.response?.data?.detail || "حذف با خطا مواجه شد.")
    }
  }

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />

  return (
    <>
      <Card className="border-pink-100 bg-gradient-to-l from-pink-50 to-rose-50">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">کد این بیمار — برای دعوت اعضای خانواده از سمت خودشان</p>
          <p dir="ltr" className="text-left text-lg font-bold tracking-wider text-rose-700">{patientCode}</p>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader><CardTitle className="text-sm text-amber-900">درخواست‌های در انتظار تأیید</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3">
                <div>
                  <p className="text-sm font-medium">{l.family_display_name || l.family_phone_number}</p>
                  <p className="text-xs text-muted-foreground">درخواست دسترسی به عنوان «{l.relation}»</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleDecision(l.id, "approve")}>تأیید</Button>
                  <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => handleDecision(l.id, "reject")}>رد</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-pink-100">
        <CardHeader><CardTitle className="text-rose-900">اعضای خانواده با دسترسی</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {links.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-pink-100 bg-pink-50/50 p-3">
                <div>
                  <p className="text-sm font-medium">{l.family_display_name || l.family_phone_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.relation}{l.is_primary_contact && " · مخاطب اصلی"} · {l.access_level === "full_access" ? "دسترسی کامل" : "فقط مشاهده"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!l.is_primary_contact && (
                    <button className="text-xs text-rose-600 hover:underline" onClick={() => handleMakePrimary(l.id)}>
                      تعیین به عنوان مخاطب اصلی
                    </button>
                  )}
                  <button className="text-xs text-muted-foreground hover:text-rose-600" onClick={() => handleRemove(l.id)}>
                    حذف دسترسی
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border border-dashed border-pink-200 p-3">
            <p className="text-xs font-medium text-muted-foreground">افزودن عضو خانواده با کد عضویت او (باید قبلاً ثبت‌نام کرده باشد)</p>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Input placeholder="کد عضو (مثلاً FAM-92K7XQ)" className="w-44" value={familyCode} onChange={(e) => setFamilyCode(e.target.value)} dir="ltr" />
              <div className="w-28"><ChoiceSelect choices={RELATION_TYPE} value={relation} onChange={setRelation} placeholder="نسبت" /></div>
              <select
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
              >
                <option value="full_access">دسترسی کامل</option>
                <option value="view_only">فقط مشاهده</option>
              </select>
              <Button variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" disabled={busy || !familyCode || !relation} onClick={handleInvite}>
                + افزودن
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function CareTab({ patientId }: { patientId: number }) {
  const [team, setTeam] = useState<CaregiverAssignment[]>([])
  const [timeline, setTimeline] = useState<CareLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([careService.team(patientId), careService.timeline(patientId)])
      .then(([t, tl]) => { setTeam(t); setTimeline(tl) })
      .finally(() => setLoading(false))
  }, [patientId])

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />

  return (
    <>
      <Card className="border-pink-100">
        <CardHeader><CardTitle className="text-rose-900">تیم مراقبت فعلی</CardTitle></CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز مراقبی برای این سالمند تخصیص داده نشده است.</p>
          ) : (
            <div className="space-y-2">
              {team.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-pink-100 bg-pink-50/50 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-rose-300 text-sm">👩‍⚕️</div>
                  <div>
                    <p className="text-sm font-medium">{a.caregiver_name}</p>
                    <p className="text-xs text-muted-foreground">از تاریخ {a.assigned_at.slice(0, 10)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-pink-100">
        <CardHeader><CardTitle className="text-rose-900">جدول زمانی مراقبت</CardTitle></CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز گزارشی ثبت نشده است.</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((entry) => (
                <div key={entry.id} className="flex gap-3 border-r-2 border-pink-200 pr-3">
                  <span className="text-lg leading-none">{CARE_LOG_CATEGORY_ICON[entry.category] || "📝"}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-rose-700">{CARE_LOG_CATEGORY_LABEL[entry.category] || entry.category}</p>
                      <p className="text-xs text-muted-foreground">{entry.created_at.slice(0, 16).replace("T", " — ")}</p>
                    </div>
                    <p className="text-sm">{entry.note}</p>
                    <p className="text-xs text-muted-foreground">توسط {entry.caregiver_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
