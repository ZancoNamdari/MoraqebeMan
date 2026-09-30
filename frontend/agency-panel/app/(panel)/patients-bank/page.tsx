"use client"

import { Fragment, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PinButton } from "@/components/agency/pin-button"
import { usePinned } from "@/hooks/use-pinned"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { GENDER, PHYSICAL_CONDITION, GUARDIANSHIP_STATUS, labelForValue } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import { toPersianDigits } from "@/lib/persian_digits"
import { cn } from "@/lib/utils"
import type { AgencyPatient } from "@/types/agency_management"

// Same seven pipeline stages as app/(panel)/patients/page.tsx's kanban
// board — duplicated on purpose (matching how STAGES is already
// duplicated between the caregivers and patients kanban pages in this
// app) rather than importing from that page, since that page doesn't
// export it and a page component's internals shouldn't be reached
// into from another route.
const STAGES = [
  { value: "registration", label: "ثبت‌نام ورود" },
  { value: "phone_coordination", label: "هماهنگی تلفنی" },
  { value: "dispatched", label: "اعزام" },
  { value: "caregiver_confirmed", label: "تایید پرستار" },
  { value: "first_week_followup", label: "هفته اول: پیگیری اولیه" },
  { value: "contract_confirmed", label: "قرارداد بسته و تایید شده" },
  { value: "expired", label: "منقضی‌ها" },
] as const

// Card + donut-slice styling per stage — same "colored stat tiles
// above a donut chart" layout as candidates/page.tsx's own
// STATUS_CLASS/STATUS_HEX pair, just keyed by pipeline_status instead
// of candidate status. Kept as a page-local pair for the same reason
// STAGES above is duplicated rather than imported.
const STAGE_TILE_CLASS: Record<string, string> = {
  registration: "border-slate-200 bg-slate-50/60 text-slate-700",
  phone_coordination: "border-amber-100 bg-amber-50/40 text-amber-700",
  dispatched: "border-purple-100 bg-purple-50/40 text-purple-700",
  caregiver_confirmed: "border-sky-100 bg-sky-50/40 text-sky-700",
  first_week_followup: "border-indigo-100 bg-indigo-50/40 text-indigo-700",
  contract_confirmed: "border-emerald-100 bg-emerald-50/40 text-emerald-700",
  expired: "border-rose-100 bg-rose-50/40 text-rose-700",
}

const STAGE_HEX: Record<string, string> = {
  registration: "#64748b",
  phone_coordination: "#d97706",
  dispatched: "#7e22ce",
  caregiver_confirmed: "#0284c7",
  first_week_followup: "#4f46e5",
  contract_confirmed: "#059669",
  expired: "#e11d48",
}

function PipelineDonutChart({ counts, total }: { counts: Record<string, number>; total: number }) {
  const radius = 60
  const circumference = 2 * Math.PI * radius
  let cumulative = 0

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="20" />
        {total === 0 ? null : STAGES.map((s) => {
          const value = counts[s.value] || 0
          if (value === 0) return null
          const fraction = value / total
          const length = fraction * circumference
          const dashoffset = -cumulative
          cumulative += length
          return (
            <circle
              key={s.value}
              cx="80" cy="80" r={radius} fill="none"
              stroke={STAGE_HEX[s.value]} strokeWidth="20"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashoffset}
            />
          )
        })}
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-1">
        {STAGES.filter((s) => (counts[s.value] || 0) > 0).map((s) => (
          <div key={s.value} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STAGE_HEX[s.value] }} />
            <span className="text-muted-foreground">
              {s.label}: {toPersianDigits(counts[s.value])} ({toPersianDigits(total > 0 ? Math.round((counts[s.value] / total) * 100) : 0)}٪)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * The standalone list/table view of every خدمت‌گیرنده — the patients
 * counterpart of /candidates ("بانک اطلاعات خدمت‌دهندگان"). Replaces
 * the inline Kanban/List toggle that used to live on the patients
 * pipeline page: per the confirmed requirement, a dedicated bank page
 * is enough and the pipeline page stays Kanban-only. Pins here share
 * the same "patients" localStorage namespace as the pipeline page's
 * cards, since both key by the same AgencyPatient.id.
 */
// Empty string means "leave the select on its blank/placeholder
// option" — used for gender/physical_condition/guardianship_status
// drafts, mirroring how the wizard's own ChoiceSelect treats "" as
// unset rather than forcing a default choice on every existing row.
const BLANK = ""

export default function PatientsBankPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const router = useRouter()

  const [patients, setPatients] = useState<AgencyPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const { pinned: pinnedIds, isPinned, toggle: togglePin } = usePinned("patients")
  const [agencyId, setAgencyId] = useState<number | null>(null)

  // Inline "ویرایش" panel — same expandable-row pattern as
  // candidates/page.tsx's own edit feature, scoped to patients'
  // richer field set (every PatientProfileSerializer field that isn't
  // read-only), saved through agencyManagementService.updatePatientDetail
  // which PATCHes AgencyPatientDetailView.
  const [editingId, setEditingId] = useState<number | null>(null)
  const [savingFields, setSavingFields] = useState(false)
  const [editError, setEditError] = useState("")
  const [draft, setDraft] = useState({
    full_name: "", gender: BLANK, father_name: "", birth_date: "",
    national_id: "", emergency_contact_phone: "", full_address: "",
    physical_condition: BLANK, guardianship_status: BLANK,
    guardian_details: "", language_dialect: "", basic_medical_info: "",
  })

  function refresh(id: number) {
    setLoading(true)
    return agencyManagementService.listPatients(id).then(setPatients).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user) return
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      refresh(profile.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (authLoading || !user) return null

  function startEditing(p: AgencyPatient) {
    setDraft({
      full_name: p.full_name || "",
      gender: p.gender || BLANK,
      father_name: p.father_name || "",
      birth_date: p.birth_date || "",
      national_id: p.national_id || "",
      emergency_contact_phone: p.emergency_contact_phone || "",
      full_address: p.full_address || "",
      physical_condition: p.physical_condition || BLANK,
      guardianship_status: p.guardianship_status || BLANK,
      guardian_details: p.guardian_details || "",
      language_dialect: p.language_dialect || "",
      basic_medical_info: p.basic_medical_info || "",
    })
    setEditingId(p.id)
    setEditError("")
  }

  async function handleSaveEdit(patientId: number) {
    if (!agencyId) return
    setSavingFields(true); setEditError("")
    try {
      const updated = await agencyManagementService.updatePatientDetail(agencyId, patientId, draft)
      setPatients((prev) => prev.map((p) => (p.id === patientId ? updated : p)))
      setEditingId(null)
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || "ذخیره تغییرات با خطا مواجه شد.")
    } finally {
      setSavingFields(false)
    }
  }

  const counts = patients.reduce((acc, p) => {
    acc[p.pipeline_status] = (acc[p.pipeline_status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  let filtered = statusFilter ? patients.filter((p) => p.pipeline_status === statusFilter) : patients
  if (pinnedOnly) filtered = filtered.filter((p) => pinnedIds.has(p.id))
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    filtered = filtered.filter((p) => `${p.full_name} ${p.access_code}`.toLowerCase().includes(q))
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">بانک اطلاعات خدمت‌گیرندگان</h1>
          <p className="text-xs text-slate-500">فهرست کامل خدمت‌گیرندگان ({toPersianDigits(patients.length)})</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام یا کد دسترسی..."
            className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button
            size="sm"
            variant={pinnedOnly ? "default" : "outline"}
            onClick={() => setPinnedOnly((v) => !v)}
            disabled={pinnedIds.size === 0 && !pinnedOnly}
          >
            فقط پین‌شده‌ها{pinnedIds.size > 0 && ` (${toPersianDigits(pinnedIds.size)})`}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>چاپ فهرست</Button>
        </div>
      </div>

      {statusFilter && (
        <p className="mb-4 px-1 text-xs text-muted-foreground print:hidden">
          نمایش فقط خدمت‌گیرندگان با مرحله «{STAGES.find((s) => s.value === statusFilter)?.label ?? statusFilter}» —{" "}
          <button className="font-medium text-slate-700 underline" onClick={() => setStatusFilter(null)}>نمایش همه</button>
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
        <button
          onClick={() => setStatusFilter(null)}
          className={cn(
            "rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
            statusFilter === null && "ring-2 ring-slate-400"
          )}
        >
          <p className="text-3xl font-bold text-slate-900">{toPersianDigits(patients.length)}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">تعداد کل</p>
        </button>
        {STAGES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter((cur) => (cur === s.value ? null : s.value))}
            className={cn(
              "rounded-2xl border p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
              STAGE_TILE_CLASS[s.value],
              statusFilter === s.value && "ring-2 ring-slate-400"
            )}
          >
            <p className="text-3xl font-bold">{toPersianDigits(counts[s.value] || 0)}</p>
            <p className="mt-1 text-xs font-medium opacity-80">{s.label}</p>
          </button>
        ))}
      </div>

      {patients.length > 0 && (
        <Card className="mb-4 border-slate-200 print:hidden">
          <CardHeader><CardTitle className="text-slate-900">نمودار وضعیت خدمت‌گیرندگان</CardTitle></CardHeader>
          <CardContent>
            <PipelineDonutChart counts={counts} total={patients.length} />
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">لیست خدمت‌گیرندگان ({toPersianDigits(filtered.length)})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">موردی یافت نشد.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="w-8 p-2 print:hidden"></th>
                    <th className="p-2 text-right">نام</th>
                    <th className="p-2 text-right">جنسیت</th>
                    <th className="p-2 text-right">کد دسترسی</th>
                    <th className="p-2 text-right">شهر</th>
                    <th className="p-2 text-right">مرحله</th>
                    <th className="p-2 text-right">ثبت‌شده توسط</th>
                    <th className="p-2 text-center">فوری</th>
                    <th className="p-2 text-center print:hidden">اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, index) => {
                    const stage = STAGES.find((s) => s.value === p.pipeline_status)
                    const isEditing = editingId === p.id
                    return (
                      <Fragment key={p.id}>
                        <tr className={cn("border-b border-slate-100", !isEditing && "last:border-0", index % 2 === 1 && "bg-slate-50/50")}>
                          <td className="p-2 print:hidden">
                            <PinButton pinned={isPinned(p.id)} onToggle={() => togglePin(p.id)} />
                          </td>
                          <td className="p-2 font-medium text-slate-900">{p.full_name}</td>
                          <td className="p-2 text-slate-500">{p.gender ? labelForValue(GENDER, p.gender) : "—"}</td>
                          <td className="p-2 text-slate-500" dir="ltr">{p.access_code}</td>
                          <td className="p-2 text-slate-500">{p.city_name || "—"}</td>
                          <td className="p-2 text-slate-600">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">{stage?.label ?? p.pipeline_status}</span>
                          </td>
                          <td className="p-2 text-slate-500">{p.created_by || "—"}</td>
                          <td className="p-2 text-center">
                            {p.is_urgent && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">فوری</span>}
                          </td>
                          <td className="p-2 text-center print:hidden">
                            <div className="flex justify-center gap-1">
                              <button
                                className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                                onClick={() => (isEditing ? setEditingId(null) : startEditing(p))}
                              >
                                {isEditing ? "بستن" : "ویرایش"}
                              </button>
                              <button
                                className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                                onClick={() => router.push(`${ROUTES.patients}/${p.id}/register`)}
                                title="تکمیل هویت، پرسشنامه و مدارک"
                              >
                                تکمیل پرونده
                              </button>
                              <button
                                className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                                onClick={() => router.push(ROUTES.patientMatch(p.id))}
                              >
                                یافتن مراقب
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isEditing && (
                          <tr className={cn("border-b border-slate-100 last:border-0", index % 2 === 1 && "bg-slate-50/50")}>
                            <td colSpan={9} className="p-3 print:hidden">
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="mb-3 text-xs font-medium text-slate-700">ویرایش اطلاعات خدمت‌گیرنده</p>
                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">نام و نام خانوادگی</label>
                                    <input value={draft.full_name} onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))} className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">جنسیت</label>
                                    <select value={draft.gender} onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value }))} className="w-full rounded-md border border-input bg-background p-2 text-sm">
                                      <option value="">—</option>
                                      {GENDER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">نام پدر</label>
                                    <input value={draft.father_name} onChange={(e) => setDraft((d) => ({ ...d, father_name: e.target.value }))} className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">تاریخ تولد (شمسی)</label>
                                    <input value={draft.birth_date} onChange={(e) => setDraft((d) => ({ ...d, birth_date: e.target.value }))} dir="ltr" placeholder="۱۳۵۰/۰۱/۰۱" className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">کد ملی</label>
                                    <input value={draft.national_id} onChange={(e) => setDraft((d) => ({ ...d, national_id: e.target.value }))} dir="ltr" className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">تلفن تماس اضطراری</label>
                                    <input value={draft.emergency_contact_phone} onChange={(e) => setDraft((d) => ({ ...d, emergency_contact_phone: e.target.value }))} dir="ltr" className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                  <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs text-muted-foreground">آدرس کامل</label>
                                    <input value={draft.full_address} onChange={(e) => setDraft((d) => ({ ...d, full_address: e.target.value }))} className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">وضعیت جسمی</label>
                                    <select value={draft.physical_condition} onChange={(e) => setDraft((d) => ({ ...d, physical_condition: e.target.value }))} className="w-full rounded-md border border-input bg-background p-2 text-sm">
                                      <option value="">—</option>
                                      {PHYSICAL_CONDITION.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">وضعیت قیمومیت</label>
                                    <select value={draft.guardianship_status} onChange={(e) => setDraft((d) => ({ ...d, guardianship_status: e.target.value }))} className="w-full rounded-md border border-input bg-background p-2 text-sm">
                                      <option value="">—</option>
                                      {GUARDIANSHIP_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">مشخصات قیم/وصی</label>
                                    <input value={draft.guardian_details} onChange={(e) => setDraft((d) => ({ ...d, guardian_details: e.target.value }))} className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">زبان/لهجه</label>
                                    <input value={draft.language_dialect} onChange={(e) => setDraft((d) => ({ ...d, language_dialect: e.target.value }))} className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                  <div className="space-y-1 sm:col-span-3">
                                    <label className="text-xs text-muted-foreground">اطلاعات پایه پزشکی</label>
                                    <textarea value={draft.basic_medical_info} onChange={(e) => setDraft((d) => ({ ...d, basic_medical_info: e.target.value }))} rows={2} className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                </div>
                                {editError && <p className="mt-2 text-xs text-red-600">{editError}</p>}
                                <div className="mt-3 flex gap-2">
                                  <Button size="sm" disabled={savingFields} onClick={() => handleSaveEdit(p.id)}>
                                    {savingFields ? "در حال ذخیره..." : "ذخیره تغییرات"}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>انصراف</Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
