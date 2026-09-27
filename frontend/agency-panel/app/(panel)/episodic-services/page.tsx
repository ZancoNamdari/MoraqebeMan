"use client"

import { useEffect, useMemo, useState } from "react"
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core"
import { GripVertical, Phone, Plus, User, Receipt, BellRing } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field } from "@/components/forms/fields"
import { SearchTrigger, FilterDropdown, DropdownOption, SortDropdown, FilterRow, FilterToggleButton, SortSection, type SortOption } from "@/components/agency/filter-bar"
import { agencyService } from "@/services/agency.service"
import { episodicService } from "@/services/episodic.service"
import { cn } from "@/lib/utils"
import type { EpisodicCaregiverOption, EpisodicService, EpisodicStage } from "@/types/episodic"
import { EPISODIC_PAYMENT_METHOD_OPTIONS } from "@/types/episodic"

const STAGES: { value: EpisodicStage; label: string }[] = [
  { value: "phone_coordination", label: "هماهنگی تلفنی" },
  { value: "dispatched", label: "اعزام" },
  { value: "settled", label: "تسویه‌حساب" },
  { value: "followup", label: "پیگیری" },
]

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
 * Card content deliberately differs per stage (per the confirmed
 * requirement) — هماهنگی تلفنی shows just contact info, اعزام adds
 * the caregiver picker, تسویه‌حساب shows the real invoice once one
 * exists, and پیگیری is where reminder badges actually matter.
 */
function StageBody({ service, caregivers, onAssignCaregiver }: {
  service: EpisodicService
  caregivers: EpisodicCaregiverOption[]
  onAssignCaregiver: (caregiverId: number | null) => void
}) {
  if (service.stage === "phone_coordination") {
    return (
      <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{service.notes || "یادداشتی ثبت نشده"}</p>
    )
  }
  if (service.stage === "dispatched") {
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
  if (service.stage === "settled") {
    return service.invoice ? (
      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
        <Receipt className="h-3 w-3" /> {service.invoice_amount} تومان — {service.invoice_status_display}
      </p>
    ) : (
      <p className="mt-1 text-[11px] text-amber-600">هنوز تسویه ثبت نشده</p>
    )
  }
  // followup
  return (
    <>
      {service.assigned_caregiver_name && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
          <User className="h-3 w-3" /> {service.assigned_caregiver_name}
        </p>
      )}
      <ReminderBadges service={service} />
    </>
  )
}

function EpisodicCard({ service, caregivers, onMove, onAssignCaregiver, moving }: {
  service: EpisodicService
  caregivers: EpisodicCaregiverOption[]
  onMove: (s: EpisodicService, target: EpisodicStage) => void
  onAssignCaregiver: (s: EpisodicService, caregiverId: number | null) => void
  moving: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: service.id,
    data: { service },
  })
  const stageIndex = STAGES.findIndex((s) => s.value === service.stage)
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("rounded-md border border-slate-200 bg-white p-2.5 shadow-sm", isDragging && "z-50 opacity-50")}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{service.recipient_full_name}</p>
          {service.recipient_phone_number && (
            <p className="flex items-center gap-1 text-[11px] text-slate-500" dir="ltr">
              <Phone className="h-2.5 w-2.5" /> {service.recipient_phone_number}
            </p>
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

      <StageBody service={service} caregivers={caregivers} onAssignCaregiver={(id) => onAssignCaregiver(service, id)} />

      <div className="mt-2 flex items-center justify-between gap-1">
        <button
          className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-30"
          disabled={moving || stageIndex === 0}
          onClick={() => onMove(service, STAGES[stageIndex - 1].value)}
        >
          مرحله قبل
        </button>
        <button
          className="rounded bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-30"
          disabled={moving || stageIndex === STAGES.length - 1}
          onClick={() => onMove(service, STAGES[stageIndex + 1].value)}
        >
          مرحله بعد
        </button>
      </div>
    </div>
  )
}

function StageColumn({ stage, services, caregivers, onMove, onAssignCaregiver, movingId }: {
  stage: (typeof STAGES)[number]
  services: EpisodicService[]
  caregivers: EpisodicCaregiverOption[]
  onMove: (s: EpisodicService, target: EpisodicStage) => void
  onAssignCaregiver: (s: EpisodicService, caregiverId: number | null) => void
  movingId: number | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[240px] flex-col rounded-lg border bg-slate-100 transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-slate-200"
      )}
    >
      <div className="border-b border-slate-200 p-3">
        <p className="text-xs font-bold text-slate-700">{stage.label}</p>
        <p className="text-[11px] text-slate-500">{services.length} مورد</p>
      </div>
      <div className="min-h-[80px] flex-1 space-y-2 p-2">
        {services.length === 0 ? (
          <p className="p-3 text-center text-[11px] text-slate-400">موردی نیست</p>
        ) : (
          services.map((s) => (
            <EpisodicCard
              key={s.id} service={s} caregivers={caregivers}
              onMove={onMove} onAssignCaregiver={onAssignCaregiver} moving={movingId === s.id}
            />
          ))
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const availableCreators = useMemo(
    () => Array.from(new Set(services.map((s) => s.created_by_username).filter((c): c is string => !!c))).sort(),
    [services]
  )
  const filteredServices = useMemo(
    () => sortEpisodicServices(services.filter((s) => matchesEpisodicFilters(s, search, filters)), sortBy),
    [services, search, filters, sortBy]
  )
  const activeFilterCount = countActiveEpisodicFilters(filters)

  const columns = useMemo(
    () => STAGES.map((stage) => ({ stage, services: filteredServices.filter((s) => s.stage === stage.value) })),
    [filteredServices]
  )


  function refresh(id: number) {
    return episodicService.list(id).then(setServices)
  }

  useEffect(() => {
    if (!user) return
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return Promise.all([refresh(profile.id), episodicService.caregiverRoster(profile.id).then(setCaregivers)])
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

  function moveStage(service: EpisodicService, target: EpisodicStage) {
    if (target === "settled" && !service.invoice) {
      setPendingSettlement(service)
      setSettlement(emptySettlement)
      setSettleError("")
      return
    }
    applyStageChange(service, target)
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
        stage: "settled", amount: settlement.amount, method: settlement.method, paid_at: settlement.paid_at,
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
    moveStage(service, String(over.id) as EpisodicStage)
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
        </SortSection>
        </>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s) => <Skeleton key={s.value} className="h-64 rounded-lg" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 lg:grid-cols-4">
            {columns.map(({ stage, services: colServices }) => (
              <StageColumn
                key={stage.value} stage={stage} services={colServices} caregivers={caregivers}
                onMove={moveStage} onAssignCaregiver={assignCaregiver} movingId={movingId}
              />
            ))}
          </div>
          <DragOverlay>
            {activeService && (
              <div className="w-52 rounded-md border border-primary bg-white p-2.5 shadow-lg">
                <p className="truncate text-sm font-medium text-slate-900">{activeService.recipient_full_name}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
