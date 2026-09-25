"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core"
import { ChevronRight, ChevronLeft, Plus, GripVertical, AlertTriangle } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, ChoiceSelect, CheckboxGroup } from "@/components/forms/fields"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { PHYSICAL_CONDITION, NEEDED_SHIFT, RELATION_TYPE, GENDER } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import type { AgencyPatient } from "@/types/agency_management"

const STAGES = [
  { value: "registration", label: "ثبت‌نام ورود" },
  { value: "phone_coordination", label: "هماهنگی تلفنی" },
  { value: "dispatched", label: "اعزام" },
  { value: "caregiver_confirmed", label: "تایید پرستار" },
  { value: "first_week_followup", label: "هفته اول: پیگیری اولیه" },
  { value: "contract_confirmed", label: "قرارداد بسته و تایید شده" },
  { value: "expired", label: "منقضی‌ها" },
] as const

const emptyForm = {
  mode: "standalone" as "standalone" | "with_family",
  full_name: "", gender: "", physical_condition: "", needed_shifts: [] as string[],
  is_urgent: false,
  family_first_name: "", family_last_name: "", family_phone_number: "", relation: "",
}

function PatientCard({ patient, onMove, moving, router }: {
  patient: AgencyPatient
  onMove: (p: AgencyPatient, direction: 1 | -1) => void
  moving: boolean
  router: ReturnType<typeof useRouter>
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: patient.id,
    data: { patient },
  })

  const stageIndex = STAGES.findIndex((s) => s.value === patient.pipeline_status)

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border border-slate-200 bg-white p-2.5 shadow-sm",
        isDragging && "z-50 opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-slate-900">{patient.full_name}</p>
            {patient.is_urgent && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                <AlertTriangle className="h-2.5 w-2.5" /> فوری
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500" dir="ltr">{patient.access_code}</p>
          {patient.created_by && (
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {patient.created_by}
            </span>
          )}
        </div>
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
          title="جابجایی با کشیدن"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button
          className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
          disabled={moving || stageIndex === 0}
          onClick={() => onMove(patient, -1)}
          title="مرحله قبل"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
          onClick={() => router.push(ROUTES.patientMatch(patient.id))}
        >
          یافتن مراقب
        </button>
        <button
          className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
          disabled={moving || stageIndex === STAGES.length - 1}
          onClick={() => onMove(patient, 1)}
          title="مرحله بعد"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function StageColumn({ stage, patients, onMove, movingId, router }: {
  stage: (typeof STAGES)[number]
  patients: AgencyPatient[]
  onMove: (p: AgencyPatient, direction: 1 | -1) => void
  movingId: number | null
  router: ReturnType<typeof useRouter>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[220px] flex-col rounded-lg border bg-slate-100 transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-slate-200"
      )}
    >
      <div className="border-b border-slate-200 p-3">
        <p className="text-xs font-bold text-slate-700">{stage.label}</p>
        <p className="text-[11px] text-slate-500">{patients.length} مورد</p>
      </div>
      <div className="min-h-[80px] flex-1 space-y-2 p-2">
        {patients.length === 0 ? (
          <p className="p-3 text-center text-[11px] text-slate-400">موردی نیست</p>
        ) : (
          patients.map((p) => (
            <PatientCard key={p.id} patient={p} onMove={onMove} moving={movingId === p.id} router={router} />
          ))
        )}
      </div>
    </div>
  )
}

export default function PatientsPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const router = useRouter()

  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [patients, setPatients] = useState<AgencyPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [movingId, setMovingId] = useState<number | null>(null)
  const [activePatient, setActivePatient] = useState<AgencyPatient | null>(null)
  const [successNote, setSuccessNote] = useState<{ accessCode: string; family?: { phone: string; code: string } } | null>(null)

  // A small activation distance, not an instant-drag-on-mousedown
  // sensor — without this, a plain click (e.g. the "یافتن مراقب"
  // button inside a card) would sometimes be swallowed as the start
  // of a drag instead of registering as a click.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function refresh(id: number) {
    return agencyManagementService.listPatients(id).then(setPatients)
  }

  useEffect(() => {
    if (!user) return
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return refresh(profile.id)
    }).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  async function handleCreate() {
    if (agencyId === null) return
    setSaving(true); setError(""); setSuccessNote(null)
    try {
      const payload = form.mode === "standalone"
        ? {
            mode: "standalone" as const,
            patient: { full_name: form.full_name, gender: form.gender || undefined, physical_condition: form.physical_condition || undefined, needed_shifts: form.needed_shifts, is_urgent: form.is_urgent },
          }
        : {
            mode: "with_family" as const,
            patient: { full_name: form.full_name, gender: form.gender || undefined, physical_condition: form.physical_condition || undefined, needed_shifts: form.needed_shifts, is_urgent: form.is_urgent },
            family: { first_name: form.family_first_name, last_name: form.family_last_name, phone_number: form.family_phone_number, relation: form.relation },
          }
      const created = await agencyManagementService.createPatient(agencyId, payload)
      setPatients((prev) => [created, ...prev])
      setSuccessNote({
        accessCode: created.access_code,
        family: created.family ? { phone: created.family.phone_number, code: created.family.access_code } : undefined,
      })
      setForm(emptyForm)
      setShowForm(false)
      await refresh(agencyId)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ثبت خدمت‌گیرنده با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  async function applyStageChange(patient: AgencyPatient, newStage: string) {
    if (agencyId === null || newStage === patient.pipeline_status) return

    // Optimistic update — the card moves instantly instead of
    // waiting for the network round-trip, which is what makes drag-
    // and-drop actually feel like real CRM software; reverted below
    // if the request turns out to fail.
    const previous = patients
    setPatients((prev) => prev.map((p) => (p.id === patient.id ? { ...p, pipeline_status: newStage } : p)))
    setMovingId(patient.id)
    try {
      const updated = await agencyManagementService.updatePipelineStatus(agencyId, patient.id, newStage)
      setPatients((prev) => prev.map((p) => (p.id === patient.id ? updated : p)))
    } catch {
      setPatients(previous)
      window.alert("جابجایی مرحله با خطا مواجه شد.")
    } finally {
      setMovingId(null)
    }
  }

  function moveStage(patient: AgencyPatient, direction: 1 | -1) {
    const currentIndex = STAGES.findIndex((s) => s.value === patient.pipeline_status)
    const nextIndex = currentIndex + direction
    if (nextIndex < 0 || nextIndex >= STAGES.length) return
    applyStageChange(patient, STAGES[nextIndex].value)
  }

  function handleDragStart(event: DragStartEvent) {
    const patient = event.active.data.current?.patient as AgencyPatient | undefined
    setActivePatient(patient ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePatient(null)
    const { active, over } = event
    if (!over) return
    const patient = active.data.current?.patient as AgencyPatient | undefined
    if (!patient) return
    applyStageChange(patient, String(over.id))
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">خدمت‌گیرنده</h1>
          <p className="text-xs text-slate-500">کاریز خدمت‌رسانی به سالمندها ({patients.length} خدمت‌گیرنده)</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> افزودن خدمت‌گیرنده
        </Button>
      </div>

      {successNote && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p>خدمت‌گیرنده ثبت شد — کد: <span dir="ltr" className="font-mono">{successNote.accessCode}</span></p>
          {successNote.family && (
            <p className="mt-1">
              حساب خانواده ساخته شد (<span dir="ltr">{successNote.family.phone}</span>) —
              کد پیوستن: <span dir="ltr" className="font-mono">{successNote.family.code}</span>
            </p>
          )}
        </div>
      )}

      {showForm && (
        <div className="mb-4 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          {error && <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</div>}

          <Field label="نحوه ثبت">
            <div className="flex gap-2">
              <Button
                type="button" size="sm"
                variant={form.mode === "standalone" ? "default" : "outline"}
                onClick={() => setForm({ ...form, mode: "standalone" })}
              >
                فقط خدمت‌گیرنده (خانواده بعداً با کد وصل می‌شود)
              </Button>
              <Button
                type="button" size="sm"
                variant={form.mode === "with_family" ? "default" : "outline"}
                onClick={() => setForm({ ...form, mode: "with_family" })}
              >
                خدمت‌گیرنده + ساخت حساب خانواده
              </Button>
            </div>
          </Field>

          <Field label="نام و نام خانوادگی" required>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="جنسیت">
            <ChoiceSelect choices={GENDER} value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
          </Field>
          <Field label="شرایط جسمانی فعلی">
            <ChoiceSelect choices={PHYSICAL_CONDITION} value={form.physical_condition} onChange={(v) => setForm({ ...form, physical_condition: v })} />
          </Field>
          <Field label="شیفت‌های زمانی مورد نیاز">
            <CheckboxGroup choices={NEEDED_SHIFT} value={form.needed_shifts} onChange={(v) => setForm({ ...form, needed_shifts: v })} />
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_urgent}
              onChange={(e) => setForm({ ...form, is_urgent: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            فوری
          </label>

          {form.mode === "with_family" && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-700">اطلاعات خانواده</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="نام" required>
                  <Input value={form.family_first_name} onChange={(e) => setForm({ ...form, family_first_name: e.target.value })} />
                </Field>
                <Field label="نام خانوادگی" required>
                  <Input value={form.family_last_name} onChange={(e) => setForm({ ...form, family_last_name: e.target.value })} />
                </Field>
              </div>
              <Field label="شماره موبایل خانواده" required>
                <Input dir="ltr" value={form.family_phone_number} onChange={(e) => setForm({ ...form, family_phone_number: e.target.value })} />
              </Field>
              <Field label="نسبت با خدمت‌گیرنده" required>
                <ChoiceSelect choices={RELATION_TYPE} value={form.relation} onChange={(v) => setForm({ ...form, relation: v })} />
              </Field>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={saving || !form.full_name || (form.mode === "with_family" && (!form.family_first_name || !form.family_last_name || !form.family_phone_number || !form.relation))}
              onClick={handleCreate}
            >
              {saving ? "در حال ثبت..." : "ثبت خدمت‌گیرنده"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>انصراف</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-7 gap-3">
          {STAGES.map((s) => <Skeleton key={s.value} className="h-64 rounded-lg" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {STAGES.map((stage) => (
              <StageColumn
                key={stage.value}
                stage={stage}
                patients={patients.filter((p) => p.pipeline_status === stage.value)}
                onMove={moveStage}
                movingId={movingId}
                router={router}
              />
            ))}
          </div>

          <DragOverlay>
            {activePatient && (
              <div className="w-52 rounded-md border border-primary bg-white p-2.5 shadow-lg">
                <p className="truncate text-sm font-medium text-slate-900">{activePatient.full_name}</p>
                <p className="text-[11px] text-slate-500" dir="ltr">{activePatient.access_code}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
