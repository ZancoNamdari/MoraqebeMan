"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core"
import { GripVertical, ChevronRight, ChevronLeft, Phone, Plus, User, Receipt, BellRing } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field } from "@/components/forms/fields"
import { SearchTrigger, FilterDropdown, DropdownOption, SortDropdown, FilterRow, FilterToggleButton, SortSection, type SortOption } from "@/components/agency/filter-bar"
import { agencyService } from "@/services/agency.service"
import { episodicService } from "@/services/episodic.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { PinButton } from "@/components/agency/pin-button"
import { PinnedOnlyToggle } from "@/components/agency/pinned-only-toggle"
import { DateRangeFilter, matchesDateRange, type DateRangeValue } from "@/components/agency/date-range-filter"
import { usePinned } from "@/hooks/use-pinned"
import { cn } from "@/lib/utils"
import type { EpisodicCaregiverOption, EpisodicService, EpisodicStage } from "@/types/episodic"
import { BUILT_IN_EPISODIC_STAGES, EPISODIC_PAYMENT_METHOD_OPTIONS } from "@/types/episodic"

type Stage = { value: string; label: string }

// Same "sticky note" auto-grow behavior as the patient/caregiver
// cards' own note textarea — see those files' identical helper.
function autoGrowNote(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

// Used only until this agency's real stage list has loaded from the
// server (apps.agencies.models.AgencyPipelineStage, pipeline_type=
// "episodic") — same placeholder-only role as patients/page.tsx and
// caregivers/page.tsx's own DEFAULT_STAGES.
const DEFAULT_STAGES: Stage[] = [
  { value: BUILT_IN_EPISODIC_STAGES.PHONE_COORDINATION, label: "هماهنگی تلفنی" },
  { value: BUILT_IN_EPISODIC_STAGES.DISPATCHED, label: "اعزام" },
  { value: BUILT_IN_EPISODIC_STAGES.SETTLED, label: "تسویه‌حساب" },
  { value: BUILT_IN_EPISODIC_STAGES.FOLLOWUP, label: "پیگیری" },
]

// One neutral header style for every column — same reasoning as the
// patient/caregiver boards: no per-stage color coding, so a custom
// stage appended past the 4 built-in ones looks exactly like every
// other column.
const STAGE_HEADER_CLASS = { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" }
const ARROW_DEPTH = 18

const REMINDER_COLOR_CLASS: Record<string, string> = {
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
}

const emptyForm = { recipient_full_name: "", recipient_phone_number: "", notes: "" }
const emptySettlement = { amount: "", method: "cash", paid_at: "" }

const emptyEpisodicFilters = {
  assigned: "" as "" | "assigned" | "unassigned",
  invoiced: "" as "" | "invoiced" | "not_invoiced",
  hasReminder: false,
  createdBy: "" as string,
}
type EpisodicFilters = typeof emptyEpisodicFilters

function countActiveEpisodicFilters(f: EpisodicFilters) {
  return (f.assigned ? 1 : 0) + (f.invoiced ? 1 : 0) + (f.hasReminder ? 1 : 0) + (f.createdBy ? 1 : 0)
}

function matchesEpisodicFilters(service: EpisodicService, search: string, filters: EpisodicFilters) {
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    const haystack = `${service.recipient_full_name} ${service.recipient_phone_number}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  if (filters.assigned === "assigned" && !service.assigned_caregiver) return false
  if (filters.assigned === "unassigned" && service.assigned_caregiver) return false
  if (filters.invoiced === "invoiced" && !service.invoice) return false
  if (filters.invoiced === "not_invoiced" && service.invoice) return false
  if (filters.hasReminder && service.active_reminders.length === 0) return false
  if (filters.createdBy && service.created_by_username !== filters.createdBy) return false
  return true
}

const EPISODIC_SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "name_asc", label: "نام (الف تا ی)" },
  { value: "name_desc", label: "نام (ی تا الف)" },
  { value: "reminder_first", label: "دارای یادآوری اول" },
]

function sortEpisodicServices(list: EpisodicService[], sortBy: string) {
  const sorted = [...list]
  switch (sortBy) {
    case "newest":
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    case "oldest":
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    case "name_asc":
      return sorted.sort((a, b) => a.recipient_full_name.localeCompare(b.recipient_full_name, "fa"))
    case "name_desc":
      return sorted.sort((a, b) => b.recipient_full_name.localeCompare(a.recipient_full_name, "fa"))
    case "reminder_first":
      return sorted.sort((a, b) => Number(b.active_reminders.length > 0) - Number(a.active_reminders.length > 0))
    default:
      return sorted
  }
}

function ReminderBadges({ service }: { service: EpisodicService }) {
  if (service.active_reminders.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {service.active_reminders.map((r, i) => (
        <span
          key={i}
          className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", REMINDER_COLOR_CLASS[r.color] || REMINDER_COLOR_CLASS.red)}
        >
          <BellRing className="h-2.5 w-2.5" /> {r.label} ({r.days_elapsed} روز)
        </span>
      ))}
    </div>
  )
}

/**
 * Only the 4 built-in stages have any special content here — اعزام
 * gets the caregiver picker, تسویه‌حساب shows the real invoice, و
 * پیگیری shows the assigned caregiver's name. A custom stage
 * appended past these renders nothing extra: it's a plain column,
 * same as a custom patient/caregiver stage.
 */
function StageBody({ service, caregivers, onAssignCaregiver }: {
  service: EpisodicService
  caregivers: EpisodicCaregiverOption[]
  onAssignCaregiver: (caregiverId: number | null) => void
}) {
  if (service.stage === BUILT_IN_EPISODIC_STAGES.DISPATCHED) {
    return (
      <div className="mt-1.5">
        <select
          value={service.assigned_caregiver ?? ""}
          onChange={(e) => onAssignCaregiver(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700"
        >
          <option value="">مراقب اعزامی را انتخاب کنید</option>
          {caregivers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      </div>
    )
  }
  if (service.stage === BUILT_IN_EPISODIC_STAGES.SETTLED) {
    return service.invoice ? (
      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
        <Receipt className="h-3 w-3" /> {service.invoice_amount} تومان — {service.invoice_status_display}
      </p>
    ) : (
      <p className="mt-1 text-[11px] text-amber-600">هنوز تسویه ثبت نشده</p>
    )
  }
  if (service.stage === BUILT_IN_EPISODIC_STAGES.FOLLOWUP && service.assigned_caregiver_name) {
    return (
      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
        <User className="h-3 w-3" /> {service.assigned_caregiver_name}
      </p>
    )
  }
  return null
}

function EpisodicCard({ service, stages, caregivers, onMove, onAssignCaregiver, onSaveNote, moving, pinned, onTogglePin }: {
  service: EpisodicService
  stages: Stage[]
  caregivers: EpisodicCaregiverOption[]
  onMove: (s: EpisodicService, direction: 1 | -1) => void
  onAssignCaregiver: (s: EpisodicService, caregiverId: number | null) => void
  onSaveNote: (s: EpisodicService, notes: string) => void
  moving: boolean
  pinned: boolean
  onTogglePin: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: service.id,
    data: { service },
  })
  const stageIndex = stages.findIndex((s) => s.value === service.stage)
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  // Same local-draft-then-save-on-blur pattern as the patient/
  // caregiver note textareas.
  const [noteDraft, setNoteDraft] = useState(service.notes ?? "")
  useEffect(() => setNoteDraft(service.notes ?? ""), [service.notes])
  const noteRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => autoGrowNote(noteRef.current), [noteDraft])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "min-h-[130px] min-w-[170px] max-w-[460px] resize overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "z-50 opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="min-w-0 break-words text-base font-bold text-slate-900">{service.recipient_full_name}</p>
          {/* flex-wrap + min-w-0/break-all on the number itself — a
              long number in a narrow column otherwise overflows
              straight past the card's edge. */}
          {service.recipient_phone_number && (
            <p className="flex flex-nowrap items-center gap-1 text-[10px] text-slate-500">
              <Phone className="h-2.5 w-2.5 shrink-0" />
              <span className="shrink-0">شماره تماس:</span>
              <span className="min-w-0 break-all" dir="ltr">{service.recipient_phone_number}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <PinButton pinned={pinned} onToggle={onTogglePin} />
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
            title="جابجایی با کشیدن"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      <textarea
        ref={noteRef}
        value={noteDraft}
        onChange={(e) => setNoteDraft(e.target.value)}
        onBlur={() => {
          if (noteDraft !== (service.notes ?? "")) onSaveNote(service, noteDraft)
        }}
        placeholder="یادداشت داخلی..."
        rows={3}
        className="mt-2 w-full resize-none overflow-hidden rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:outline-none"
      />

      <StageBody service={service} caregivers={caregivers} onAssignCaregiver={(id) => onAssignCaregiver(service, id)} />
      <ReminderBadges service={service} />

      <div className="mt-3 flex items-center justify-between gap-1 border-t border-slate-100 pt-3">
        <button className="rounded-full p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={moving || stageIndex <= 0} onClick={() => onMove(service, -1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <p className="flex-1 text-center text-[11px] text-slate-400">{stages[stageIndex]?.label}</p>
        <button className="rounded-full p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={moving || stageIndex === -1 || stageIndex === stages.length - 1} onClick={() => onMove(service, 1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function StageColumn({ stage, index, stages, services, caregivers, onMove, onAssignCaregiver, onSaveNote, movingId, onQuickAdd, isPinned, onTogglePin }: {
  stage: Stage
  index: number
  stages: Stage[]
  services: EpisodicService[]
  caregivers: EpisodicCaregiverOption[]
  onMove: (s: EpisodicService, direction: 1 | -1) => void
  onAssignCaregiver: (s: EpisodicService, caregiverId: number | null) => void
  onSaveNote: (s: EpisodicService, notes: string) => void
  movingId: number | null
  onQuickAdd?: () => void
  isPinned: (id: number) => boolean
  onTogglePin: (id: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value })
  const colors = STAGE_HEADER_CLASS
  const isFirst = index === 0

  // Same left-pointing chevron-chain header as the patient/caregiver
  // boards — see those files' own comment for the RTL reasoning.
  const clipPath = isFirst
    ? `polygon(100% 0, ${ARROW_DEPTH}px 0, 0 50%, ${ARROW_DEPTH}px 100%, 100% 100%)`
    : `polygon(100% 0, ${ARROW_DEPTH}px 0, 0 50%, ${ARROW_DEPTH}px 100%, 100% 100%, calc(100% - ${ARROW_DEPTH}px) 50%)`

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[270px] shrink-0 flex-col rounded-xl border-2 bg-slate-50 shadow-sm transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-transparent"
      )}
    >
      <div
        className={cn("flex flex-col items-center justify-center px-7 py-3 text-center shadow-sm", colors.bg, colors.text)}
        style={{ clipPath }}
      >
        <p className="text-sm font-bold leading-tight">{stage.label}</p>
        <p className="text-[11px] opacity-80">{services.length} مورد</p>
      </div>
      <div className="h-[2px] w-full bg-slate-300" />
      <div className="min-h-[120px] flex-1 space-y-3 p-3">
        {services.length === 0 ? (
          <p className="p-3 text-center text-xs text-slate-400">موردی نیست</p>
        ) : (
          services.map((s) => (
            <EpisodicCard
              key={s.id} service={s} stages={stages} caregivers={caregivers}
              onMove={onMove} onAssignCaregiver={onAssignCaregiver} onSaveNote={onSaveNote} moving={movingId === s.id}
              pinned={isPinned(s.id)} onTogglePin={() => onTogglePin(s.id)}
            />
          ))
        )}
        {isFirst && onQuickAdd && (
          <button
            onClick={onQuickAdd}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white py-3 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" /> افزودن خدمت مقطعی سریع
          </button>
        )}
      </div>
    </div>
  )
}

export default function EpisodicServicesPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])

  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [services, setServices] = useState<EpisodicService[]>([])
  const [caregivers, setCaregivers] = useState<EpisodicCaregiverOption[]>([])
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES)
  const [addingStage, setAddingStage] = useState(false)
  const [newStageLabel, setNewStageLabel] = useState("")
  const [savingStage, setSavingStage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [movingId, setMovingId] = useState<number | null>(null)
  const [activeService, setActiveService] = useState<EpisodicService | null>(null)

  // A pending stage move that needs the settlement dialog (moving
  // into تسویه‌حساب for the first time) before it's actually sent —
  // unlike every other transition, which is optimistic/immediate.
  const [pendingSettlement, setPendingSettlement] = useState<EpisodicService | null>(null)
  const [settlement, setSettlement] = useState(emptySettlement)
  const [settleError, setSettleError] = useState("")

  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<EpisodicFilters>(emptyEpisodicFilters)
  const [sortBy, setSortBy] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRangeValue>("all")
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const { pinned: pinnedIds, isPinned, toggle: togglePin } = usePinned("episodic")

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const availableCreators = useMemo(
    () => Array.from(new Set(services.map((s) => s.created_by_username).filter((c): c is string => !!c))).sort(),
    [services]
  )
  const filteredServices = useMemo(() => {
    const base = services.filter((s) =>
      matchesEpisodicFilters(s, search, filters) &&
      matchesDateRange(s.created_at, dateRange) &&
      (!pinnedOnly || pinnedIds.has(s.id))
    )
    return sortEpisodicServices(base, sortBy)
  }, [services, search, filters, sortBy, dateRange, pinnedOnly, pinnedIds])
  const activeFilterCount = countActiveEpisodicFilters(filters)

  function refresh(id: number) {
    return episodicService.list(id).then(setServices)
  }

  function refreshStages(id: number) {
    return agencyManagementService.listPipelineStages(id, "episodic").then(setStages)
  }

  useEffect(() => {
    if (!user) return
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return Promise.all([
        refresh(profile.id),
        refreshStages(profile.id),
        episodicService.caregiverRoster(profile.id).then(setCaregivers),
      ])
    }).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  async function handleCreate() {
    if (agencyId === null) return
    setSaving(true); setError("")
    try {
      const created = await episodicService.create(agencyId, form)
      setServices((prev) => [created, ...prev])
      setForm(emptyForm)
      setShowForm(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ثبت خدمت مقطعی با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  async function applyStageChange(service: EpisodicService, target: EpisodicStage, extra?: Record<string, string>) {
    if (agencyId === null || target === service.stage) return
    const previous = services
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, stage: target } : s)))
    setMovingId(service.id)
    try {
      const updated = await episodicService.updateStage(agencyId, service.id, { stage: target, ...extra })
      setServices((prev) => prev.map((s) => (s.id === service.id ? updated : s)))
    } catch (err: any) {
      setServices(previous)
      window.alert(err?.response?.data?.detail || "جابجایی مرحله با خطا مواجه شد.")
    } finally {
      setMovingId(null)
    }
  }

  function moveToStage(service: EpisodicService, target: EpisodicStage) {
    if (target === BUILT_IN_EPISODIC_STAGES.SETTLED && !service.invoice) {
      setPendingSettlement(service)
      setSettlement(emptySettlement)
      setSettleError("")
      return
    }
    applyStageChange(service, target)
  }

  function moveStage(service: EpisodicService, direction: 1 | -1) {
    const currentIndex = stages.findIndex((s) => s.value === service.stage)
    const nextIndex = currentIndex + direction
    if (nextIndex < 0 || nextIndex >= stages.length) return
    moveToStage(service, stages[nextIndex].value)
  }

  async function handleAddStage() {
    if (agencyId === null || !newStageLabel.trim()) return
    setSavingStage(true)
    try {
      const created = await agencyManagementService.addPipelineStage(agencyId, "episodic", newStageLabel.trim())
      setStages((prev) => [...prev, created])
      setNewStageLabel("")
      setAddingStage(false)
    } catch {
      window.alert("افزودن مرحله با خطا مواجه شد.")
    } finally {
      setSavingStage(false)
    }
  }

  async function confirmSettlement() {
    if (!pendingSettlement || agencyId === null) return
    if (!settlement.amount || !settlement.paid_at) {
      setSettleError("مبلغ و تاریخ پرداخت لازم است.")
      return
    }
    setSettleError("")
    setMovingId(pendingSettlement.id)
    try {
      const updated = await episodicService.updateStage(agencyId, pendingSettlement.id, {
        stage: BUILT_IN_EPISODIC_STAGES.SETTLED, amount: settlement.amount, method: settlement.method, paid_at: settlement.paid_at,
      })
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      setPendingSettlement(null)
    } catch (err: any) {
      setSettleError(err?.response?.data?.detail || "ثبت تسویه‌حساب با خطا مواجه شد.")
    } finally {
      setMovingId(null)
    }
  }

  async function assignCaregiver(service: EpisodicService, caregiverId: number | null) {
    if (agencyId === null) return
    const previous = services
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, assigned_caregiver: caregiverId } : s)))
    try {
      const updated = await episodicService.updateStage(agencyId, service.id, { assigned_caregiver_id: caregiverId })
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } catch {
      setServices(previous)
      window.alert("تخصیص مراقب با خطا مواجه شد.")
    }
  }

  async function handleSaveNote(service: EpisodicService, notes: string) {
    if (agencyId === null) return
    const previous = services
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, notes } : s)))
    try {
      const updated = await episodicService.updateStage(agencyId, service.id, { notes })
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } catch {
      setServices(previous)
      window.alert("ذخیره یادداشت با خطا مواجه شد.")
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const service = event.active.data.current?.service as EpisodicService | undefined
    setActiveService(service ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveService(null)
    const { active, over } = event
    if (!over) return
    const service = active.data.current?.service as EpisodicService | undefined
    if (!service) return
    moveToStage(service, String(over.id))
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">خدمات مقطعی</h1>
          <p className="text-xs text-slate-500">درخواست‌های یک‌باره/مقطعی — مستقل از پرونده‌ی خدمت‌گیرندگان دائمی ({services.length} مورد)</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && (
            <>
              <SearchTrigger search={search} onSearchChange={setSearch} placeholder="جست‌وجو بر اساس نام یا تلفن..." />
              <FilterToggleButton open={filterOpen} onClick={() => setFilterOpen((o) => !o)} active={activeFilterCount > 0} />
            </>
          )}
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> افزودن خدمت مقطعی
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          {error && <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</div>}
          <Field label="نام خدمت‌گیرنده" required>
            <Input value={form.recipient_full_name} onChange={(e) => setForm({ ...form, recipient_full_name: e.target.value })} />
          </Field>
          <Field label="شماره تماس">
            <Input dir="ltr" value={form.recipient_phone_number} onChange={(e) => setForm({ ...form, recipient_phone_number: e.target.value })} />
          </Field>
          <Field label="یادداشت">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" disabled={saving || !form.recipient_full_name} onClick={handleCreate}>
              {saving ? "در حال ثبت..." : "ثبت"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>انصراف</Button>
          </div>
        </div>
      )}

      {pendingSettlement && (
        <div className="mb-4 space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm font-bold text-slate-800">
            ثبت تسویه‌حساب — {pendingSettlement.recipient_full_name}
          </p>
          <p className="text-xs text-slate-500">این کار یک فاکتور و پرداخت واقعی در بخش مالی می‌سازد.</p>
          {settleError && <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{settleError}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="مبلغ (تومان)" required>
              <Input dir="ltr" value={settlement.amount} onChange={(e) => setSettlement({ ...settlement, amount: e.target.value })} />
            </Field>
            <Field label="روش پرداخت">
              <select
                value={settlement.method}
                onChange={(e) => setSettlement({ ...settlement, method: e.target.value })}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                {EPISODIC_PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="تاریخ پرداخت" required>
              <Input dir="ltr" placeholder="1404-02-05" value={settlement.paid_at} onChange={(e) => setSettlement({ ...settlement, paid_at: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={movingId === pendingSettlement.id} onClick={confirmSettlement}>
              {movingId === pendingSettlement.id ? "در حال ثبت..." : "ثبت تسویه و انتقال"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPendingSettlement(null)}>انصراف</Button>
          </div>
        </div>
      )}

      {!loading && (
        <>
        {filterOpen && (
        <FilterRow
          hasActive={activeFilterCount > 0}
          onClearAll={() => setFilters(emptyEpisodicFilters)}
          resultCount={filteredServices.length}
          totalCount={services.length}
        >
          <FilterDropdown label="مراقب اعزامی" active={!!filters.assigned} onClear={() => setFilters((f) => ({ ...f, assigned: "" }))}>
            <DropdownOption selected={filters.assigned === "assigned"} onClick={() => setFilters((f) => ({ ...f, assigned: f.assigned === "assigned" ? "" : "assigned" }))}>
              دارای مراقب
            </DropdownOption>
            <DropdownOption selected={filters.assigned === "unassigned"} onClick={() => setFilters((f) => ({ ...f, assigned: f.assigned === "unassigned" ? "" : "unassigned" }))}>
              بدون مراقب
            </DropdownOption>
          </FilterDropdown>

          <FilterDropdown label="تسویه‌حساب" active={!!filters.invoiced} onClear={() => setFilters((f) => ({ ...f, invoiced: "" }))}>
            <DropdownOption selected={filters.invoiced === "invoiced"} onClick={() => setFilters((f) => ({ ...f, invoiced: f.invoiced === "invoiced" ? "" : "invoiced" }))}>
              دارای فاکتور
            </DropdownOption>
            <DropdownOption selected={filters.invoiced === "not_invoiced"} onClick={() => setFilters((f) => ({ ...f, invoiced: f.invoiced === "not_invoiced" ? "" : "not_invoiced" }))}>
              بدون فاکتور
            </DropdownOption>
          </FilterDropdown>

          <FilterDropdown label="یادآوری" active={filters.hasReminder} onClear={() => setFilters((f) => ({ ...f, hasReminder: false }))}>
            <DropdownOption selected={filters.hasReminder} onClick={() => setFilters((f) => ({ ...f, hasReminder: !f.hasReminder }))}>
              دارای یادآوری فعال
            </DropdownOption>
          </FilterDropdown>

          {availableCreators.length > 0 && (
            <FilterDropdown label="ثبت‌شده توسط" active={!!filters.createdBy} onClear={() => setFilters((f) => ({ ...f, createdBy: "" }))}>
              {availableCreators.map((creator) => (
                <DropdownOption key={creator} selected={filters.createdBy === creator} onClick={() => setFilters((f) => ({ ...f, createdBy: f.createdBy === creator ? "" : creator }))}>
                  {creator}
                </DropdownOption>
              ))}
            </FilterDropdown>
          )}

        </FilterRow>
        )}

        <SortSection>
          <SortDropdown value={sortBy} options={EPISODIC_SORT_OPTIONS} onChange={setSortBy} />
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <div className="mr-auto">
            <PinnedOnlyToggle pinnedOnly={pinnedOnly} onChange={setPinnedOnly} pinnedCount={pinnedIds.size} />
          </div>
        </SortSection>
        </>
      )}

      {loading ? (
        <div className="flex gap-3 overflow-x-auto">
          {DEFAULT_STAGES.map((s) => <Skeleton key={s.value} className="h-72 w-[270px] shrink-0 rounded-xl" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stages.map((stage, index) => (
              <StageColumn
                key={stage.value}
                stage={stage}
                index={index}
                stages={stages}
                services={filteredServices.filter((s) => s.stage === stage.value)}
                caregivers={caregivers}
                onMove={moveStage}
                onAssignCaregiver={assignCaregiver}
                onSaveNote={handleSaveNote}
                movingId={movingId}
                onQuickAdd={index === 0 ? () => setShowForm(true) : undefined}
                isPinned={isPinned}
                onTogglePin={togglePin}
              />
            ))}

            {/* Appends a brand-new stage to the end of this agency's
                own episodic-services pipeline — same
                apps.agencies.models.AgencyPipelineStage row, just
                pipeline_type="episodic". */}
            <div className="flex w-[270px] shrink-0 flex-col items-center justify-start rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-3">
              {addingStage ? (
                <div className="w-full space-y-2">
                  <Input
                    autoFocus
                    value={newStageLabel}
                    onChange={(e) => setNewStageLabel(e.target.value)}
                    placeholder="عنوان مرحله جدید"
                    className="text-xs"
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 flex-1 text-xs" disabled={savingStage || !newStageLabel.trim()} onClick={handleAddStage}>
                      {savingStage ? "..." : "افزودن"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 flex-1 text-xs" onClick={() => { setAddingStage(false); setNewStageLabel("") }}>
                      انصراف
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingStage(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-medium text-slate-500 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" /> افزودن مرحله
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeService && (
              <div className="w-72 rounded-xl border border-primary bg-white p-4 shadow-lg">
                <p className="truncate text-base font-bold text-slate-900">{activeService.recipient_full_name}</p>
                <p className="text-xs text-slate-500" dir="ltr">{activeService.recipient_phone_number}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
