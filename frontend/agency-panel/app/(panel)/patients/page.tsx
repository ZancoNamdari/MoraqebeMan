"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core"
import { ChevronRight, ChevronLeft, Plus, GripVertical, AlertTriangle, Phone } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, ChoiceSelect, CheckboxGroup } from "@/components/forms/fields"
import { LocationPicker, type LocationValue } from "@/components/wizard-forms/location-picker"
import { JalaliDatePicker } from "@/components/wizard-forms/jalali-date-picker"
import { CONTRACT_JALALI_YEAR_RANGE } from "@/lib/jalali"
import { SearchTrigger, FilterDropdown, DropdownOption, SortDropdown, FilterRow, FilterToggleButton, SortSection, type SortOption } from "@/components/agency/filter-bar"
import { PinButton } from "@/components/agency/pin-button"
import { PinnedOnlyToggle } from "@/components/agency/pinned-only-toggle"
import { TagEditor } from "@/components/agency/tag-editor"
import { usePinned } from "@/hooks/use-pinned"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { PHYSICAL_CONDITION, NEEDED_SHIFT, RELATION_TYPE, GENDER } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import type { AgencyPatient } from "@/types/agency_management"

type Stage = { value: string; label: string }

// "Sticky note" behavior for the card's note textarea — the box
// itself grows to fit the text (including a fresh line from Enter)
// instead of ever scrolling inside a fixed-height box. Resetting to
// "auto" first is required before reading scrollHeight, otherwise a
// box that already grew tall would never be able to shrink back down
// when text is deleted.
const COLUMN_PAGE_SIZE = 12

function autoGrowNote(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

// Used only until the agency's real, per-agency stage list has
// loaded from the server (apps.agencies.models.AgencyPipelineStage —
// see agencyManagementService.listPipelineStages) — a brand-new
// agency's first fetch seeds these exact 7 defaults server-side, so
// this is purely a same-shape placeholder for the loading skeleton
// and initial render, never the source of truth for stage moves.
const DEFAULT_STAGES: Stage[] = [
  { value: "registration", label: "ثبت در سایت" },
  { value: "phone_coordination", label: "هماهنگی تلفنی" },
  { value: "dispatched", label: "اعزام" },
  { value: "caregiver_confirmed", label: "تایید پرستار" },
  { value: "first_week_followup", label: "هفته اول: پیگیری اولیه" },
  { value: "contract_confirmed", label: "قرارداد بسته و تایید شده" },
  { value: "expired", label: "نزدیک به اتمام قرارداد" },
]

// One neutral header style for every column, regardless of stage —
// per the confirmed requirement to drop the per-stage color coding
// (it read as noisy/arbitrary rather than meaningful) in favor of a
// plain, uniform chevron strip. Kept as a single constant object
// (not an array) so a custom stage appended past the original 7
// looks exactly like every other column, with nothing to run out of.
const STAGE_HEADER_CLASS = { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" }

// How deep the arrow tip cuts into each chevron header, in px — used
// both in the clip-path math and to size the extra padding on the
// pointed side so the label text never sits under the point.
const ARROW_DEPTH = 18

const emptyForm = {
  mode: "standalone" as "standalone" | "with_family",
  full_name: "", gender: "", physical_condition: "", needed_shifts: [] as string[],
  is_urgent: false,
  // Same fields the real patient registration (family-panel's
  // "افزودن سالمند جدید") collects up front — birth date, full
  // province/city/district location, address and an emergency
  // contact number — so a patient entered here by an agency ends up
  // with the same complete record a family would have created
  // themselves, not a thin stub.
  birth_date: "",
  location: { province: null, city: null, district: null } as LocationValue,
  full_address: "", emergency_contact_phone: "",
  family_first_name: "", family_last_name: "", family_phone_number: "", relation: "",
}

const emptyFilters = {
  gender: "" as string,
  urgentOnly: false,
  physicalConditions: [] as string[],
  neededShifts: [] as string[],
  tags: [] as string[],
  createdBy: "" as string,
}
type PatientFilters = typeof emptyFilters

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function countActiveFilters(f: PatientFilters) {
  return (
    (f.gender ? 1 : 0) +
    (f.urgentOnly ? 1 : 0) +
    f.physicalConditions.length +
    f.neededShifts.length +
    f.tags.length +
    (f.createdBy ? 1 : 0)
  )
}

function matchesFilters(patient: AgencyPatient, search: string, filters: PatientFilters) {
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    const haystack = `${patient.full_name} ${patient.access_code}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  if (filters.gender && patient.gender !== filters.gender) return false
  if (filters.urgentOnly && !patient.is_urgent) return false
  if (filters.physicalConditions.length && !filters.physicalConditions.includes(patient.physical_condition)) return false
  if (filters.neededShifts.length && !filters.neededShifts.some((s) => patient.needed_shifts.includes(s))) return false
  if (filters.tags.length && !filters.tags.some((t) => patient.tags.includes(t))) return false
  if (filters.createdBy && patient.created_by !== filters.createdBy) return false
  return true
}

const SORT_OPTIONS: SortOption[] = [
  { value: "name_asc", label: "نام (الف تا ی)" },
  { value: "name_desc", label: "نام (ی تا الف)" },
  { value: "family_asc", label: "نام خانوادگی (الف تا ی)" },
  { value: "family_desc", label: "نام خانوادگی (ی تا الف)" },
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "urgent_first", label: "فوری‌ها اول" },
]

// full_name only ever comes as one string ("نام نام‌خانوادگی"), so the
// family-name sort splits on the first space and treats everything
// after it as the surname — handles multi-word family names too.
function familyNameOf(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(" ") : fullName
}

function sortPatients(list: AgencyPatient[], sortBy: string) {
  const sorted = [...list]
  switch (sortBy) {
    case "name_asc":
      return sorted.sort((a, b) => a.full_name.localeCompare(b.full_name, "fa"))
    case "name_desc":
      return sorted.sort((a, b) => b.full_name.localeCompare(a.full_name, "fa"))
    case "family_asc":
      return sorted.sort((a, b) => familyNameOf(a.full_name).localeCompare(familyNameOf(b.full_name), "fa"))
    case "family_desc":
      return sorted.sort((a, b) => familyNameOf(b.full_name).localeCompare(familyNameOf(a.full_name), "fa"))
    case "newest":
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    case "oldest":
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    case "urgent_first":
      return sorted.sort((a, b) => Number(b.is_urgent) - Number(a.is_urgent))
    default:
      return sorted
  }
}

function PatientCard({ patient, stages, onMove, moving, router, pinned, onTogglePin, onSaveNote, onAddTag, onRemoveTag, onSaveContractDate }: {
  patient: AgencyPatient
  stages: Stage[]
  onMove: (p: AgencyPatient, direction: 1 | -1) => void
  moving: boolean
  router: ReturnType<typeof useRouter>
  pinned: boolean
  onTogglePin: () => void
  onSaveNote: (patient: AgencyPatient, notes: string) => void
  onAddTag: (patient: AgencyPatient, tag: string) => void
  onRemoveTag: (patient: AgencyPatient, tag: string) => void
  onSaveContractDate: (patient: AgencyPatient, field: "contract_start_date" | "contract_end_date", date: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: patient.id,
    data: { patient },
  })

  // Local draft so typing doesn't round-trip to the server on every
  // keystroke — saved on blur, only when the text actually changed.
  const [noteDraft, setNoteDraft] = useState(patient.notes ?? "")
  useEffect(() => setNoteDraft(patient.notes ?? ""), [patient.notes])

  // Sticky-note behavior — the box itself grows to fit whatever's
  // typed (including on Enter/new line) instead of scrolling inside
  // a fixed-height box.
  const noteRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => autoGrowNote(noteRef.current), [noteDraft])

  const stageIndex = stages.findIndex((s) => s.value === patient.pipeline_status)

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        // resize + overflow-auto turn on the browser's own drag handle
        // (bottom corner) so agency staff can make a card bigger or
        // smaller to taste; min/max keep it from collapsing to
        // nothing or swallowing the whole column. Not persisted
        // across reloads — plain native CSS resize, no extra state.
        "min-h-[150px] min-w-[170px] max-w-[460px] resize overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "z-50 opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* No avatar — the name gets the full card width and
                wraps instead of truncating, so it's always shown
                complete rather than cut off with "...". min-w-0 is
                required here: a flex child otherwise refuses to
                shrink below its unwrapped text width, which silently
                defeats break-words and pushes the name off the
                (overflow-auto, so scrollable-but-invisible) card. */}
            <p className="min-w-0 break-words text-base font-bold text-slate-900">{patient.full_name}</p>
            {patient.is_urgent && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                <AlertTriangle className="h-2.5 w-2.5" /> فوری
              </span>
            )}
          </div>
          {/* Per the confirmed layout, the top of the card is kept to
              just the name and one contact number — access code,
              every extra family number, and reminder badges all
              added clutter without earning their place here. The
              number itself falls back to the first approved family
              member's own phone when emergency_contact_phone was
              never filled in — for a patient registered through
              "with_family", that's usually the ONLY number on file,
              so showing nothing here (the previous bug) meant most
              cards displayed no phone at all. */}
          {/* flex-wrap + min-w-0/break-all on the number itself —
              without these, a long number in a narrow ~230px column
              doesn't wrap and instead overflows straight past the
              card's edge (the bug the screenshot showed). */}
          {(patient.emergency_contact_phone || patient.family_contacts?.[0]?.phone) && (
            <p className="flex flex-nowrap items-center gap-1 text-[10px] text-slate-500">
              <Phone className="h-2.5 w-2.5 shrink-0" />
              <span className="shrink-0">شماره تماس:</span>
              <span className="min-w-0 break-all" dir="ltr">{patient.emergency_contact_phone || patient.family_contacts?.[0]?.phone}</span>
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

      {/* Card body order, per the confirmed layout: note first (and
          a bit bigger — rows=3, not 2), then tags, then the action
          buttons, then created_by at the very bottom. */}
      <textarea
        ref={noteRef}
        value={noteDraft}
        onChange={(e) => setNoteDraft(e.target.value)}
        onBlur={() => {
          if (noteDraft !== (patient.notes ?? "")) onSaveNote(patient, noteDraft)
        }}
        placeholder="یادداشت داخلی..."
        rows={3}
        className="mt-2 w-full resize-none overflow-hidden rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:outline-none"
      />

      <TagEditor
        tags={patient.tags}
        onAdd={(tag) => onAddTag(patient, tag)}
        onRemove={(tag) => onRemoveTag(patient, tag)}
      />

      {/* Entered once the patient reaches "قرارداد بسته و تایید شده" —
          see PatientProfile.contract_start_date/contract_end_date's
          own docstrings, same pattern as the caregiver card's own
          contract dates. `dense` + CONTRACT_JALALI_YEAR_RANGE: the
          default picker is birth-date-oriented (small text clipped in
          this narrow card, years capped well before 1405) — wrong for
          a forward-looking contract date. */}
      {patient.pipeline_status === "contract_confirmed" && (
        <div className="mt-1.5 space-y-1">
          <div>
            <p className="mb-0.5 text-[10px] font-medium text-slate-500">تاریخ شروع قرارداد فعلی</p>
            <JalaliDatePicker
              dense
              yearRange={CONTRACT_JALALI_YEAR_RANGE}
              value={patient.contract_start_date ?? ""}
              onChange={(v) => onSaveContractDate(patient, "contract_start_date", v)}
            />
          </div>
          <div>
            <p className="mb-0.5 text-[10px] font-medium text-slate-500">تاریخ پایان قرارداد فعلی</p>
            <JalaliDatePicker
              dense
              yearRange={CONTRACT_JALALI_YEAR_RANGE}
              value={patient.contract_end_date ?? ""}
              onChange={(v) => onSaveContractDate(patient, "contract_end_date", v)}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-1 border-t border-slate-100 pt-3">
        <button
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
          disabled={moving || stageIndex === 0}
          onClick={() => onMove(patient, -1)}
          title="مرحله قبل"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="flex flex-1 flex-col gap-1">
          <button
            className="flex items-center justify-center rounded-md border border-slate-200 px-1 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
            onClick={() => router.push(`${ROUTES.patients}/${patient.id}/register`)}
            title="تکمیل هویت، پرسشنامه و مدارک"
          >
            تکمیل پرونده
          </button>
          <button
            className="flex items-center justify-center rounded-md border border-slate-200 px-1 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
            onClick={() => router.push(ROUTES.patientMatch(patient.id))}
          >
            یافتن مراقب
          </button>
        </div>
        <button
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
          disabled={moving || stageIndex === stages.length - 1}
          onClick={() => onMove(patient, 1)}
          title="مرحله بعد"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      {patient.created_by && (
        <p className="mt-2 text-center text-[11px] text-slate-400">ساخته شده توسط: {patient.created_by}</p>
      )}
    </div>
  )
}

function StageColumn({ stage, index, stages, patients, onMove, movingId, router, isPinned, onTogglePin, onQuickAdd, onSaveNote, onAddTag, onRemoveTag, onSaveContractDate }: {
  stage: Stage
  index: number
  stages: Stage[]
  patients: AgencyPatient[]
  onMove: (p: AgencyPatient, direction: 1 | -1) => void
  movingId: number | null
  router: ReturnType<typeof useRouter>
  isPinned: (id: number) => boolean
  onTogglePin: (id: number) => void
  // Only the first stage gets a quick-add box — that's the only stage
  // new patients can actually be created into (see handleCreate), so
  // a "+" box on a later column would be a button that lies about
  // what it does.
  onQuickAdd?: () => void
  onSaveNote: (patient: AgencyPatient, notes: string) => void
  onAddTag: (patient: AgencyPatient, tag: string) => void
  onRemoveTag: (patient: AgencyPatient, tag: string) => void
  onSaveContractDate: (patient: AgencyPatient, field: "contract_start_date" | "contract_end_date", date: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value })
  // فقط تعداد محدودی کارت را رندر می‌کنیم؛ رندر ده‌ها کارت drag-and-drop سنگین است.
  const [visibleCount, setVisibleCount] = useState(COLUMN_PAGE_SIZE)
  const colors = STAGE_HEADER_CLASS
  const urgentCount = patients.filter((p) => p.is_urgent).length
  const isFirst = index === 0

  // Left-pointing chevron ("<"-shaped) header — an arrow-chain like a
  // CRM deal pipeline's stage bar. The first column has a flat right
  // edge (nothing precedes it to nest into); every other column has a
  // matching notch on its right edge so consecutive headers read as
  // one continuous arrow strip, RTL (point toward the next stage,
  // which sits to its left).
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
        <p className="text-[11px] opacity-80">
          {patients.length} مورد{urgentCount > 0 && ` · ${urgentCount} فوری`}
        </p>
      </div>
      {/* A plain, un-clipped divider under the chevron header — since
          the chevron shape itself is clip-path'd (a border on it
          would get cut off at the point), this straight bar is what
          actually separates the title area from the card list. */}
      <div className="h-[2px] w-full bg-slate-300" />
      <div className="min-h-[120px] flex-1 space-y-3 p-3">
        {patients.length === 0 ? (
          <p className="p-3 text-center text-xs text-slate-400">موردی نیست</p>
        ) : (
          patients.slice(0, visibleCount).map((p) => (
            <PatientCard
              key={p.id} patient={p} stages={stages} onMove={onMove} moving={movingId === p.id} router={router}
              pinned={isPinned(p.id)} onTogglePin={() => onTogglePin(p.id)} onSaveNote={onSaveNote}
              onAddTag={onAddTag} onRemoveTag={onRemoveTag} onSaveContractDate={onSaveContractDate}
            />
          ))
        )}
        {patients.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((c) => c + COLUMN_PAGE_SIZE)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            نمایش بیشتر ({patients.length - visibleCount} مورد دیگر)
          </button>
        )}
        {/* Quick-add sits below every card in the column, not above,
            so it doesn't push the existing cards down every time the
            column is scanned. Neutral gray/dashed, matching the
            "افزودن مرحله" tile — no accent color. */}
        {isFirst && onQuickAdd && (
          <button
            onClick={onQuickAdd}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white py-3 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" /> افزودن خدمت‌گیرنده سریع
          </button>
        )}
      </div>
    </div>
  )
}

export default function PatientsPage() {
  return (
    <Suspense fallback={null}>
      <PatientsPageInner />
    </Suspense>
  )
}

function PatientsPageInner() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const router = useRouter()
  const searchParams = useSearchParams()
  // Deep-links into this page with ?add=1 (from icon-rail's "افزودن
  // خدمت‌گیرنده" shortcut), showing ONLY the add-patient form — same
  // isAddOnly pattern already used by caregivers/page.tsx's own
  // "افزودن خدمت‌دهنده" shortcut. Submitting continues straight into
  // the new patient's wizard at patients/[id]/register, exactly like
  // that one continues into caregivers/[id]/register.
  const isAddOnly = searchParams.get("add") === "1"

  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [patients, setPatients] = useState<AgencyPatient[]>([])
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
  const [activePatient, setActivePatient] = useState<AgencyPatient | null>(null)

  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<PatientFilters>(emptyFilters)
  const [sortBy, setSortBy] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const { pinned: pinnedIds, isPinned, toggle: togglePin } = usePinned("patients")

  // A small activation distance, not an instant-drag-on-mousedown
  // sensor — without this, a plain click (e.g. the "یافتن مراقب"
  // button inside a card) would sometimes be swallowed as the start
  // of a drag instead of registering as a click.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const availableTags = useMemo(
    () => Array.from(new Set(patients.flatMap((p) => p.tags))).sort(),
    [patients]
  )
  const availableCreators = useMemo(
    () => Array.from(new Set(patients.map((p) => p.created_by).filter((c): c is string => !!c))).sort(),
    [patients]
  )
  const filteredPatients = useMemo(() => {
    const base = patients.filter((p) => matchesFilters(p, search, filters) && (!pinnedOnly || pinnedIds.has(p.id)))
    return sortPatients(base, sortBy)
  }, [patients, search, filters, sortBy, pinnedOnly, pinnedIds])
  const activeFilterCount = countActiveFilters(filters)

  function refresh(id: number) {
    return agencyManagementService.listPatients(id).then(setPatients)
  }

  function refreshStages(id: number) {
    return agencyManagementService.listPipelineStages(id, "patient").then(setStages)
  }

  useEffect(() => {
    if (!user) return
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return Promise.all([refresh(profile.id), refreshStages(profile.id)])
    }).finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (searchParams.get("add") === "1") setShowForm(true)
  }, [searchParams])

  if (authLoading || !user) return null

  async function handleCreate() {
    if (agencyId === null) return
    setSaving(true); setError("")
    try {
      const patientFields = {
        full_name: form.full_name,
        gender: form.gender || undefined,
        physical_condition: form.physical_condition || undefined,
        needed_shifts: form.needed_shifts,
        is_urgent: form.is_urgent,
        birth_date: form.birth_date || undefined,
        province: form.location.province ?? undefined,
        city: form.location.city ?? undefined,
        district: form.location.district ?? undefined,
        full_address: form.full_address || undefined,
        emergency_contact_phone: form.emergency_contact_phone || undefined,
      }
      const payload = form.mode === "standalone"
        ? { mode: "standalone" as const, patient: patientFields }
        : {
            mode: "with_family" as const,
            patient: patientFields,
            family: { first_name: form.family_first_name, last_name: form.family_last_name, phone_number: form.family_phone_number, relation: form.relation },
          }
      const created = await agencyManagementService.createPatient(agencyId, payload)
      setForm(emptyForm)
      setShowForm(false)
      // Per the confirmed requirement, clicking "افزودن خدمت‌گیرنده"
      // continues straight into the same multi-step registration path
      // used for a خدمت‌دهنده — identity completion, then the
      // (optional) compatibility questionnaire, then identity
      // documents — instead of stopping at this quick create. The
      // access code (and, in with_family mode, the family's own
      // access code) is passed along in the query string so the
      // wizard's first screen can still show it, since this page is
      // about to navigate away from where successNote used to render it.
      const query = new URLSearchParams({ access_code: created.access_code })
      if (created.family) {
        query.set("family_phone", created.family.phone_number)
        query.set("family_code", created.family.access_code)
      }
      router.push(`${ROUTES.patients}/${created.id}/register?${query.toString()}`)
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

  async function handleSaveNote(patient: AgencyPatient, notes: string) {
    if (agencyId === null) return
    const previous = patients
    setPatients((prev) => prev.map((p) => (p.id === patient.id ? { ...p, notes } : p)))
    try {
      await agencyManagementService.updatePatientDetail(agencyId, patient.id, { notes })
    } catch {
      setPatients(previous)
      window.alert("ذخیره یادداشت با خطا مواجه شد.")
    }
  }

  async function handleSaveContractDate(
    patient: AgencyPatient, field: "contract_start_date" | "contract_end_date", date: string,
  ) {
    if (agencyId === null) return
    const previous = patients
    setPatients((prev) => prev.map((p) => (p.id === patient.id ? { ...p, [field]: date } : p)))
    try {
      await agencyManagementService.updatePatientDetail(agencyId, patient.id, { [field]: date })
    } catch {
      setPatients(previous)
      window.alert(field === "contract_start_date" ? "ذخیره تاریخ شروع قرارداد با خطا مواجه شد." : "ذخیره تاریخ پایان قرارداد با خطا مواجه شد.")
    }
  }

  async function persistTags(patient: AgencyPatient, newTags: string[]) {
    if (agencyId === null) return
    const previous = patients
    setPatients((prev) => prev.map((p) => (p.id === patient.id ? { ...p, tags: newTags } : p)))
    try {
      const updated = await agencyManagementService.updatePatientTags(agencyId, patient.id, newTags)
      setPatients((prev) => prev.map((p) => (p.id === patient.id ? updated : p)))
    } catch {
      setPatients(previous)
      window.alert("تغییر برچسب‌ها با خطا مواجه شد.")
    }
  }

  function handleAddTag(patient: AgencyPatient, tag: string) {
    persistTags(patient, [...patient.tags, tag])
  }

  function handleRemoveTag(patient: AgencyPatient, tag: string) {
    persistTags(patient, patient.tags.filter((t) => t !== tag))
  }

  function moveStage(patient: AgencyPatient, direction: 1 | -1) {
    const currentIndex = stages.findIndex((s) => s.value === patient.pipeline_status)
    const nextIndex = currentIndex + direction
    if (nextIndex < 0 || nextIndex >= stages.length) return
    applyStageChange(patient, stages[nextIndex].value)
  }

  async function handleAddStage() {
    if (agencyId === null || !newStageLabel.trim()) return
    setSavingStage(true)
    try {
      const created = await agencyManagementService.addPipelineStage(agencyId, "patient", newStageLabel.trim())
      setStages((prev) => [...prev, created])
      setNewStageLabel("")
      setAddingStage(false)
    } catch {
      window.alert("افزودن مرحله با خطا مواجه شد.")
    } finally {
      setSavingStage(false)
    }
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
          <h1 className="text-lg font-bold text-slate-900">{isAddOnly ? "افزودن خدمت‌گیرنده" : "خدمت‌گیرنده"}</h1>
          {!isAddOnly && <p className="text-xs text-slate-500">کاریز خدمت‌رسانی به سالمندها ({patients.length} خدمت‌گیرنده)</p>}
        </div>
        {!isAddOnly && (
          <div className="flex items-center gap-2">
            {!loading && (
              <>
                <SearchTrigger search={search} onSearchChange={setSearch} placeholder="جست‌وجو بر اساس نام یا کد..." />
                <FilterToggleButton open={filterOpen} onClick={() => setFilterOpen((o) => !o)} active={activeFilterCount > 0} />
              </>
            )}
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> افزودن خدمت‌گیرنده
            </Button>
          </div>
        )}
      </div>


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
          <Field label="تاریخ تولد">
            <JalaliDatePicker value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} />
          </Field>
          <LocationPicker
            province={form.location.province} city={form.location.city} district={form.location.district}
            onChange={(v) => setForm({ ...form, location: v })}
          />
          <Field label="نشانی کامل">
            <Input value={form.full_address} onChange={(e) => setForm({ ...form, full_address: e.target.value })} />
          </Field>
          <Field label="شماره تماس اضطراری">
            <Input dir="ltr" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                // In the add-only deep-link, ?add=1 is what reopens
                // this form (see the effect above) — closing it here
                // without leaving that view would just have it pop
                // back open, so cancel goes back to the plain list
                // instead of merely hiding the form. Same pattern as
                // caregivers/page.tsx's own add-only cancel.
                if (isAddOnly) { router.push(ROUTES.patients); return }
                setShowForm(false); setError("")
              }}
            >
              انصراف
            </Button>
          </div>
        </div>
      )}

      {!isAddOnly && !loading && (
        <>
        {filterOpen && (
        <FilterRow
          hasActive={activeFilterCount > 0}
          onClearAll={() => setFilters(emptyFilters)}
          resultCount={filteredPatients.length}
          totalCount={patients.length}
        >
          <FilterDropdown label="جنسیت" active={!!filters.gender} onClear={() => setFilters((f) => ({ ...f, gender: "" }))}>
            {GENDER.map(([value, label]) => (
              <DropdownOption key={value} selected={filters.gender === value} onClick={() => setFilters((f) => ({ ...f, gender: f.gender === value ? "" : value }))}>
                {label}
              </DropdownOption>
            ))}
          </FilterDropdown>

          <FilterDropdown label="فوری" active={filters.urgentOnly} onClear={() => setFilters((f) => ({ ...f, urgentOnly: false }))}>
            <DropdownOption selected={filters.urgentOnly} onClick={() => setFilters((f) => ({ ...f, urgentOnly: !f.urgentOnly }))}>
              فقط فوری‌ها
            </DropdownOption>
          </FilterDropdown>

          <FilterDropdown
            label="شرایط جسمانی"
            active={filters.physicalConditions.length > 0}
            onClear={() => setFilters((f) => ({ ...f, physicalConditions: [] }))}
          >
            {PHYSICAL_CONDITION.map(([value, label]) => (
              <DropdownOption
                key={value}
                selected={filters.physicalConditions.includes(value)}
                onClick={() => setFilters((f) => ({ ...f, physicalConditions: toggleInList(f.physicalConditions, value) }))}
              >
                {label}
              </DropdownOption>
            ))}
          </FilterDropdown>

          <FilterDropdown
            label="شیفت مورد نیاز"
            active={filters.neededShifts.length > 0}
            onClear={() => setFilters((f) => ({ ...f, neededShifts: [] }))}
          >
            {NEEDED_SHIFT.map(([value, label]) => (
              <DropdownOption
                key={value}
                selected={filters.neededShifts.includes(value)}
                onClick={() => setFilters((f) => ({ ...f, neededShifts: toggleInList(f.neededShifts, value) }))}
              >
                {label}
              </DropdownOption>
            ))}
          </FilterDropdown>

          {availableTags.length > 0 && (
            <FilterDropdown label="برچسب‌ها" active={filters.tags.length > 0} onClear={() => setFilters((f) => ({ ...f, tags: [] }))}>
              {availableTags.map((tag) => (
                <DropdownOption key={tag} selected={filters.tags.includes(tag)} onClick={() => setFilters((f) => ({ ...f, tags: toggleInList(f.tags, tag) }))}>
                  {tag}
                </DropdownOption>
              ))}
            </FilterDropdown>
          )}

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
          <SortDropdown value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} />
          <div className="mr-auto">
            <PinnedOnlyToggle pinnedOnly={pinnedOnly} onChange={setPinnedOnly} pinnedCount={pinnedIds.size} />
          </div>
        </SortSection>
        </>
      )}

      {!isAddOnly && (loading ? (
        <div className="flex gap-3 overflow-x-auto">
          {DEFAULT_STAGES.map((s) => <Skeleton key={s.value} className="h-72 w-[270px] shrink-0 rounded-xl" />)}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* A wide, horizontally-scrolling pipeline strip — every
              column keeps its full 320-360px width instead of
              shrinking to fit, so cards stay big and legible even
              with all 7 stages on screen. */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stages.map((stage, index) => (
              <StageColumn
                key={stage.value}
                stage={stage}
                index={index}
                stages={stages}
                patients={filteredPatients.filter((p) => p.pipeline_status === stage.value)}
                onMove={moveStage}
                movingId={movingId}
                router={router}
                isPinned={isPinned}
                onTogglePin={togglePin}
                onQuickAdd={index === 0 ? () => setShowForm(true) : undefined}
                onSaveNote={handleSaveNote}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                onSaveContractDate={handleSaveContractDate}
              />
            ))}

            {/* Appends a brand-new stage to the end of this agency's
                own pipeline — apps.agencies.models.AgencyPipelineStage,
                per-agency, not a platform-wide change. */}
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
            {activePatient && (
              <div className="w-72 rounded-xl border border-primary bg-white p-4 shadow-lg">
                <p className="truncate text-base font-bold text-slate-900">{activePatient.full_name}</p>
                <p className="text-xs text-slate-500" dir="ltr">{activePatient.access_code}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ))}
    </div>
  )
}

