"use client"

import { RegistrationReviews } from "@/components/agency/registration-reviews"
import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, GripVertical, ChevronRight, ChevronLeft, Plus, Phone } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field } from "@/components/forms/fields"
import { JalaliDatePicker } from "@/components/wizard-forms/jalali-date-picker"
import { CONTRACT_JALALI_YEAR_RANGE } from "@/lib/jalali"
import { SearchTrigger, FilterDropdown, DropdownOption, SortDropdown, FilterRow, FilterToggleButton, SortSection, type SortOption } from "@/components/agency/filter-bar"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { TagEditor } from "@/components/agency/tag-editor"
import { PinButton } from "@/components/agency/pin-button"
import { PinnedOnlyToggle } from "@/components/agency/pinned-only-toggle"
import { usePinned } from "@/hooks/use-pinned"
import type { AgencyCaregiverLink } from "@/types/agency"
import type { AgencyCaregiverPipelineItem, CaregiverDocumentField, CaregiverDocumentReviewStatus } from "@/types/agency_management"
import * as C from "@/lib/wizard-constants"

const COLUMN_PAGE_SIZE = 12

function serviceTypeLabel(value: string) {
  return C.ALL_SERVICE_TYPE.find((c) => c[0] === value)?.[1] ?? value
}

// One distinct, fixed color per service type — never cycled/computed
// — so the same type always reads as the same color across every
// card and the filter dropdown's active-chip styling. Falls back to
// the plain slate pair for any value that isn't one of the 5 known
// types (shouldn't happen, but a caregiver's service_types comes
// from the server).
const SERVICE_TYPE_COLOR: Record<string, string> = {
  salmandyar: "bg-sky-100 text-sky-700",
  nezafatchi: "bg-emerald-100 text-emerald-700",
  madaryar: "bg-pink-100 text-pink-700",
  parastar: "bg-violet-100 text-violet-700",
  behyar: "bg-orange-100 text-orange-700",
}

// A more saturated dot to go with each badge's pale background above
// — used in the filter dropdown where a solid dot reads better than
// a pale fill at that size.
const SERVICE_TYPE_DOT_COLOR: Record<string, string> = {
  salmandyar: "bg-sky-500",
  nezafatchi: "bg-emerald-500",
  madaryar: "bg-pink-500",
  parastar: "bg-violet-500",
  behyar: "bg-orange-500",
}

function serviceTypeColor(value: string) {
  return SERVICE_TYPE_COLOR[value] ?? "bg-slate-100 text-slate-700"
}

function serviceTypeDotColor(value: string) {
  return SERVICE_TYPE_DOT_COLOR[value] ?? "bg-slate-400"
}

// "Sticky note" behavior for the card's note textarea — the box
// itself grows to fit the text (including a fresh line from Enter)
// instead of ever scrolling inside a fixed-height box. Resetting to
// "auto" first is required before reading scrollHeight, otherwise a
// box that already grew tall would never be able to shrink back down
// when text is deleted.
function autoGrowNote(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

// Quick-add suggestion chips for the tag editor — service categories
// only. The 12 matching-process labels (در دسترس بودن، در شرف اتمام
// قرارداد، etc.) are no longer suggested here, though they can still
// be typed as free text and are stored in the same tags list either
// way, so the reminder banner's check for "در شرف اتمام قرارداد"
// keeps working regardless of how that tag was entered.
const CARD_TAG_SUGGESTIONS = [
  "پرستار", "کمک پرستار", "مادریار", "سالمندیار", "نظافتچی",
]

const CAREGIVER_STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس", pending: "در انتظار بررسی پلتفرم", approved: "تأییدشده در پلتفرم",
  rejected: "رد شده در پلتفرم", suspended: "معلق",
}

type Stage = { value: string; label: string }

// Used only until the agency's real, per-agency stage list has
// loaded from the server (apps.agencies.models.AgencyPipelineStage,
// via agencyManagementService.listPipelineStages) — a brand-new
// agency's first fetch seeds these exact 7 defaults server-side, so
// this is purely a same-shape placeholder for the loading skeleton
// and initial render, never the source of truth for stage moves.
const DEFAULT_STAGES: Stage[] = [
  { value: "registered", label: "ثبت در سایت" },
  { value: "documents_in_progress", label: "تکمیل مدارک" },
  { value: "being_dispatched", label: "اعزام" },
  { value: "on_assignment", label: "در حال مأموریت" },
  { value: "first_week", label: "هفته اول: پیگیری اولیه" },
  { value: "confirmed", label: "قرارداد بسته و تایید شده" },
  { value: "expired", label: "نزدیک به اتمام قرارداد" },
]

// One neutral header style for every column, regardless of stage —
// same reasoning as patients/page.tsx's own STAGE_HEADER_CLASS: no
// more per-stage color coding, and a custom stage appended past the
// original 7 looks exactly like every other column.
const STAGE_HEADER_CLASS = { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" }

// How deep the arrow tip cuts into each chevron header, in px.
const ARROW_DEPTH = 18

const DOC_CHECKLIST = [
  { field: "doc_no_criminal_record", docType: "no_criminal_record", label: "عدم سوءپیشینه" },
  { field: "doc_no_addiction_test", docType: "no_addiction_test", label: "آزمایش عدم اعتیاد" },
  { field: "doc_identity_verified", docType: "identity_verified", label: "تأیید مدارک هویتی" },
  { field: "doc_personal_photo", docType: "personal_photo", label: "عکس پروفایل (پرسنلی)" },
  { field: "doc_mental_health_test", docType: "mental_health_test", label: "آزمون سلامت روان" },
  { field: "doc_promissory_note", docType: "promissory_note", label: "دریافت سفته/ضمانت" },
  { field: "doc_id_card_received", docType: "id_card_received", label: "دریافت مدرک شناسایی" },
  { field: "doc_residency_documents", docType: "residency_documents", label: "مدارک اقامت اتباع (پاسپورت/اقامت)" },
] as const satisfies readonly { field: keyof AgencyCaregiverPipelineItem; docType: CaregiverDocumentField; label: string }[]

const DOC_STATUS_LABEL: Record<CaregiverDocumentReviewStatus, string> = {
  pending: "در انتظار بررسی", approved: "تأیید شده", rejected: "رد شده",
}
const DOC_STATUS_COLOR: Record<CaregiverDocumentReviewStatus, string> = {
  pending: "text-amber-700 bg-amber-100", approved: "text-emerald-700 bg-emerald-100", rejected: "text-red-700 bg-red-100",
}

// The residency-documents row only applies to اتباع (non-Iranian)
// caregivers — an Iranian caregiver keeps the original 7-item
// checklist, never an unexplained 8th row with nothing to upload.
function docChecklistFor(item: AgencyCaregiverPipelineItem) {
  return item.is_non_iranian_national ? DOC_CHECKLIST : DOC_CHECKLIST.filter((d) => d.field !== "doc_residency_documents")
}

function docsCompletedCount(item: AgencyCaregiverPipelineItem) {
  return docChecklistFor(item).filter((d) => item[d.field]).length
}

const emptyCaregiverFilters = {
  urgentOnly: false,
  tags: [] as string[],
  docsStatus: "" as "" | "complete" | "incomplete",
  createdBy: "" as string,
  serviceTypes: [] as string[],
}
type CaregiverFilters = typeof emptyCaregiverFilters

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function countActiveCaregiverFilters(f: CaregiverFilters) {
  return (f.urgentOnly ? 1 : 0) + f.tags.length + (f.docsStatus ? 1 : 0) + (f.createdBy ? 1 : 0) + f.serviceTypes.length
}

function matchesCaregiverFilters(item: AgencyCaregiverPipelineItem, search: string, filters: CaregiverFilters) {
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    const haystack = `${item.full_name} ${item.phone_number}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  if (filters.urgentOnly && !item.is_urgent) return false
  if (filters.tags.length && !filters.tags.some((t) => item.tags.includes(t))) return false
  if (filters.docsStatus) {
    const complete = docsCompletedCount(item) === docChecklistFor(item).length
    if (filters.docsStatus === "complete" && !complete) return false
    if (filters.docsStatus === "incomplete" && complete) return false
  }
  if (filters.createdBy && item.created_by !== filters.createdBy) return false
  if (filters.serviceTypes.length && !filters.serviceTypes.some((t) => (item.service_types || []).includes(t))) return false
  return true
}

const CAREGIVER_SORT_OPTIONS: SortOption[] = [
  { value: "name_asc", label: "نام (الف تا ی)" },
  { value: "name_desc", label: "نام (ی تا الف)" },
  { value: "urgent_first", label: "فوری‌ها اول" },
  { value: "docs_most", label: "بیشترین مدارک تکمیل‌شده" },
  { value: "docs_least", label: "کمترین مدارک تکمیل‌شده" },
]

function sortCaregivers(list: AgencyCaregiverPipelineItem[], sortBy: string) {
  const sorted = [...list]
  switch (sortBy) {
    case "name_asc":
      return sorted.sort((a, b) => a.full_name.localeCompare(b.full_name, "fa"))
    case "name_desc":
      return sorted.sort((a, b) => b.full_name.localeCompare(a.full_name, "fa"))
    case "urgent_first":
      return sorted.sort((a, b) => Number(b.is_urgent) - Number(a.is_urgent))
    case "docs_most":
      return sorted.sort((a, b) => docsCompletedCount(b) - docsCompletedCount(a))
    case "docs_least":
      return sorted.sort((a, b) => docsCompletedCount(a) - docsCompletedCount(b))
    default:
      return sorted
  }
}

function CaregiverCard({ item, stages, onMove, moving, onAddTag, onRemoveTag, pinned, onTogglePin, onSaveNote, onSaveContractDate }: {
  item: AgencyCaregiverPipelineItem
  stages: Stage[]
  onMove: (item: AgencyCaregiverPipelineItem, direction: 1 | -1) => void
  moving: boolean
  onAddTag: (item: AgencyCaregiverPipelineItem, tag: string) => void
  onRemoveTag: (item: AgencyCaregiverPipelineItem, tag: string) => void
  pinned: boolean
  onTogglePin: () => void
  onSaveNote: (item: AgencyCaregiverPipelineItem, notes: string) => void
  onSaveContractDate: (item: AgencyCaregiverPipelineItem, field: "contract_start_date" | "contract_end_date", date: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  })
  const stageIndex = stages.findIndex((s) => s.value === item.agency_pipeline_status)
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const isDocsStage = item.agency_pipeline_status === "documents_in_progress"
  const isEndingSoon = item.tags.includes("در شرف اتمام قرارداد")

  // Card content differs by stage, per the confirmed requirement:
  // once a caregiver has actually FINISHED the documents stage,
  // "ادامه ثبت‌نام" no longer makes sense (there's nothing left to
  // continue registering) — it's replaced by the matching action that
  // finds them a suitable patient. docsIndex === -1 (custom stage
  // list without that stage at all) is treated as "not past it yet",
  // so the fallback stays the safe, always-available option.
  const docsIndex = stages.findIndex((s) => s.value === "documents_in_progress")
  const pastDocsStage = docsIndex !== -1 && stageIndex > docsIndex
  const isOnAssignment = item.agency_pipeline_status === "on_assignment"

  // Local draft so typing doesn't round-trip to the server on every
  // keystroke — saved on blur, only when the text actually changed.
  const [noteDraft, setNoteDraft] = useState(item.staff_notes ?? "")
  useEffect(() => setNoteDraft(item.staff_notes ?? ""), [item.staff_notes])

  // Sticky-note behavior — the box itself grows to fit whatever's
  // typed (including on Enter/new line) instead of scrolling inside
  // a fixed-height box. autoGrowNote sets the height directly on the
  // element from its own scrollHeight, so it works the same whether
  // the growth came from typing or from the note loading with
  // existing multi-line text.
  const noteRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => autoGrowNote(noteRef.current), [noteDraft])

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
          {/* No avatar — the name gets the full card width and wraps
              instead of truncating, so it's always shown complete
              rather than cut off with "...". */}
          <p className="min-w-0 break-words text-base font-bold text-slate-900">{item.full_name}</p>
          {/* Per the confirmed layout, the top of the card is kept to
              just the name and their one contact number — extra
              on-file numbers and reminder badges added clutter
              without earning their place here; the note/tags/buttons
              below carry everything that actually matters day to
              day. The ending-soon flag stays, right by the name,
              since it's the one status a supervisor needs to catch
              at a glance. */}
          {/* flex-wrap + min-w-0/break-all on the number itself —
              without these, a long number in a narrow ~230px column
              doesn't wrap and instead overflows straight past the
              card's edge. */}
          {(item.phone_number || item.extra_contacts?.[0]?.phone) && (
            <p className="flex flex-nowrap items-center gap-1 text-[10px] text-slate-500">
              <Phone className="h-2.5 w-2.5 shrink-0" />
              <span className="shrink-0">شماره تماس:</span>
              <span className="min-w-0 break-all" dir="ltr">{item.phone_number || item.extra_contacts?.[0]?.phone}</span>
            </p>
          )}
          {item.service_types?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.service_types.map((t) => (
                <span key={t} className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold", serviceTypeColor(t))}>
                  {serviceTypeLabel(t)}
                </span>
              ))}
            </div>
          )}
          {isEndingSoon && (
            <span className="mt-1.5 mr-1 inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
              <AlertTriangle className="h-2.5 w-2.5" /> در شرف اتمام قرارداد
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <PinButton pinned={pinned} onToggle={onTogglePin} />
          <button {...attributes} {...listeners} className="cursor-grab touch-none rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing">
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Card body order, per the confirmed layout: note first (and
          a bit bigger — rows=3, not 2), then tags, then the docs-
          progress line (stage-specific detail), then the action
          buttons, then created_by at the very bottom. */}
      <textarea
        ref={noteRef}
        value={noteDraft}
        onChange={(e) => setNoteDraft(e.target.value)}
        onBlur={() => {
          if (noteDraft !== (item.staff_notes ?? "")) onSaveNote(item, noteDraft)
        }}
        placeholder="یادداشت داخلی..."
        rows={3}
        className="mt-2 w-full resize-none overflow-hidden rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:outline-none"
      />

      <TagEditor
        tags={item.tags}
        suggestions={CARD_TAG_SUGGESTIONS}
        onAdd={(tag) => onAddTag(item, tag)}
        onRemove={(tag) => onRemoveTag(item, tag)}
      />

      {isDocsStage && (
        <p className="mt-1.5 text-xs font-medium text-purple-700">
          {docsCompletedCount(item)}/{docChecklistFor(item).length} مدرک تکمیل شده
        </p>
      )}

      {/* Entered once, right when a mission actually starts (stage =
          "در حال مأموریت") — see CaregiverProfile.contract_start_date/
          contract_end_date's own docstrings — so agencies can track
          نزدیک‌شدن به پایان قرارداد from real data instead of a
          manually-typed tag. `dense` + CONTRACT_JALALI_YEAR_RANGE:
          the default picker sizing/year-list is birth-date-oriented
          (small text clipped inside this ~270px card, years capped
          well before 1405) — wrong for a forward-looking contract
          date. */}
      {isOnAssignment && (
        <div className="mt-1.5 space-y-1">
          <div>
            <p className="mb-0.5 text-[10px] font-medium text-slate-500">تاریخ شروع قرارداد فعلی</p>
            <JalaliDatePicker
              dense
              yearRange={CONTRACT_JALALI_YEAR_RANGE}
              value={item.contract_start_date ?? ""}
              onChange={(v) => onSaveContractDate(item, "contract_start_date", v)}
            />
          </div>
          <div>
            <p className="mb-0.5 text-[10px] font-medium text-slate-500">تاریخ پایان قرارداد فعلی</p>
            <JalaliDatePicker
              dense
              yearRange={CONTRACT_JALALI_YEAR_RANGE}
              value={item.contract_end_date ?? ""}
              onChange={(v) => onSaveContractDate(item, "contract_end_date", v)}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-1 border-t border-slate-100 pt-3">
        <button className="rounded-full p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={moving || stageIndex === 0} onClick={() => onMove(item, -1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="flex flex-1 flex-col gap-1">
          {pastDocsStage ? (
            <Link
              href={ROUTES.caregiverMatch(item.id)}
              className="flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
            >
              یافتن خدمت‌گیرنده مناسب
            </Link>
          ) : (
            <Link
              href={`/caregivers/${item.user_id}/register`}
              className="flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
            >
              ادامه ثبت‌نام
            </Link>
          )}
          <Link
            href={`/caregivers/${item.user_id}/profile`}
            className="flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
          >
            مشاهده پروفایل
          </Link>
        </div>
        <button className="rounded-full p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={moving || stageIndex === stages.length - 1} onClick={() => onMove(item, 1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      {item.created_by && (
        <p className="mt-2 text-center text-[11px] text-slate-400">ساخته شده توسط: {item.created_by}</p>
      )}
    </div>
  )
}

function StageColumn({ stage, index, stages, items, onMove, movingId, onAddTag, onRemoveTag, isPinned, onTogglePin, onQuickAdd, onSaveNote, onSaveContractDate }: {
  stage: Stage
  index: number
  stages: Stage[]
  items: AgencyCaregiverPipelineItem[]
  onMove: (item: AgencyCaregiverPipelineItem, direction: 1 | -1) => void
  movingId: number | null
  onAddTag: (item: AgencyCaregiverPipelineItem, tag: string) => void
  onRemoveTag: (item: AgencyCaregiverPipelineItem, tag: string) => void
  isPinned: (id: number) => boolean
  onTogglePin: (id: number) => void
  // Only the first stage gets a quick-add box — the only stage a new
  // caregiver candidate can actually be created into.
  onQuickAdd?: () => void
  onSaveNote: (item: AgencyCaregiverPipelineItem, notes: string) => void
  onSaveContractDate: (item: AgencyCaregiverPipelineItem, field: "contract_start_date" | "contract_end_date", date: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value })
  // فقط تعداد محدودی کارت را رندر می‌کنیم؛ رندر ده‌ها کارت drag-and-drop سنگین است.
  const [visibleCount, setVisibleCount] = useState(COLUMN_PAGE_SIZE)
  const colors = STAGE_HEADER_CLASS
  const isFirst = index === 0

  // Same left-pointing chevron-chain header as patients/page.tsx's
  // StageColumn — see that file's comment for the RTL reasoning.
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
        <p className="text-[11px] opacity-80">{items.length} مورد</p>
      </div>
      {/* A plain, un-clipped divider under the chevron header — since
          the chevron shape itself is clip-path'd (a border on it
          would get cut off at the point), this straight bar is what
          actually separates the title area from the card list. */}
      <div className="h-[2px] w-full bg-slate-300" />
      <div className="min-h-[120px] flex-1 space-y-3 p-3">
        {items.length === 0 ? (
          <p className="p-3 text-center text-xs text-slate-400">موردی نیست</p>
        ) : (
          items.slice(0, visibleCount).map((item) => (
            <CaregiverCard
              key={item.id} item={item} stages={stages} onMove={onMove} moving={movingId === item.id}
              onAddTag={onAddTag} onRemoveTag={onRemoveTag}
              pinned={isPinned(item.id)} onTogglePin={() => onTogglePin(item.id)} onSaveNote={onSaveNote}
              onSaveContractDate={onSaveContractDate}
            />
          ))
        )}
        {items.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((c) => c + COLUMN_PAGE_SIZE)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            نمایش بیشتر ({items.length - visibleCount} مورد دیگر)
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
            <Plus className="h-4 w-4" /> افزودن خدمت‌دهنده سریع
          </button>
        )}
      </div>
    </div>
  )
}

function DocumentChecklistRow({ item, agencyId, docType, label, canReview, onUpdated }: {
  item: AgencyCaregiverPipelineItem
  agencyId: number
  docType: CaregiverDocumentField
  label: string
  canReview: boolean
  onUpdated: (updated: AgencyCaregiverPipelineItem) => void
}) {
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const upload = item.documents?.[docType] ?? null

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setBusy(true)
    try {
      await agencyManagementService.uploadCaregiverDocument(agencyId, item.id, docType, file)
      // Re-pull the whole caregiver row rather than hand-patching one
      // upload into it — the fast-read doc_* boolean the Kanban badge
      // uses is recomputed server-side on upload too (reset to
      // false), and re-fetching keeps both in sync with zero risk of
      // drifting apart.
      const refreshed = await agencyManagementService.updateCaregiverPipeline(agencyId, item.id, {})
      onUpdated(refreshed)
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove() {
    setBusy(true)
    try {
      await agencyManagementService.approveCaregiverDocument(item.user_id, docType)
      const refreshed = await agencyManagementService.updateCaregiverPipeline(agencyId, item.id, {})
      onUpdated(refreshed)
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!reason.trim()) return
    setBusy(true)
    try {
      await agencyManagementService.rejectCaregiverDocument(item.user_id, docType, reason.trim())
      const refreshed = await agencyManagementService.updateCaregiverPipeline(agencyId, item.id, {})
      onUpdated(refreshed)
      setRejecting(false)
      setReason("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-700">{label}</span>
        {upload ? (
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", DOC_STATUS_COLOR[upload.status])}>
            {DOC_STATUS_LABEL[upload.status]}
          </span>
        ) : (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">آپلود نشده</span>
        )}
      </div>

      {upload?.status === "rejected" && upload.rejection_reason && (
        <p className="mt-1 text-[10px] text-red-600">دلیل رد: {upload.rejection_reason}</p>
      )}

      <div className="mt-1.5 flex items-center gap-2">
        <label className={cn(
          "flex-1 cursor-pointer rounded border border-dashed border-slate-300 py-1 text-center text-[10px] text-slate-500 hover:bg-slate-50",
          busy && "pointer-events-none opacity-50",
        )}>
          {upload ? "آپلود مجدد فایل" : "آپلود فایل"}
          <input type="file" accept={docType === "personal_photo" ? "image/*" : undefined} className="hidden" disabled={busy} onChange={handleFile} />
        </label>
        {upload?.file && (
          <a href={upload.file} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-700 underline">
            مشاهده فایل
          </a>
        )}
      </div>

      {canReview && upload && upload.status === "pending" && (
        <div className="mt-1.5 flex items-center gap-2">
          <Button size="sm" className="h-6 flex-1 text-[10px]" disabled={busy} onClick={handleApprove}>تأیید</Button>
          <Button size="sm" variant="outline" className="h-6 flex-1 text-[10px] text-red-600" disabled={busy} onClick={() => setRejecting(true)}>رد</Button>
        </div>
      )}

      {canReview && rejecting && (
        <div className="mt-1.5 space-y-1">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="دلیل رد شدن"
            className="h-6 text-[10px]"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="destructive" className="h-6 flex-1 text-[10px]" disabled={busy || !reason.trim()} onClick={handleReject}>ثبت رد</Button>
            <Button size="sm" variant="ghost" className="h-6 flex-1 text-[10px]" disabled={busy} onClick={() => { setRejecting(false); setReason("") }}>انصراف</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentChecklistDrawer({ item, agencyId, canReview, onUpdated }: {
  item: AgencyCaregiverPipelineItem
  agencyId: number
  canReview: boolean
  onUpdated: (updated: AgencyCaregiverPipelineItem) => void
}) {
  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/40 p-3">
      <p className="mb-2 text-xs font-bold text-purple-900">{item.full_name} — چک‌لیست مدارک</p>
      <div className="space-y-1.5">
        {docChecklistFor(item).map((d) => (
          <DocumentChecklistRow
            key={d.field}
            item={item}
            agencyId={agencyId}
            docType={d.docType}
            label={d.label}
            canReview={canReview}
            onUpdated={onUpdated}
          />
        ))}
      </div>
    </div>
  )
}

export default function CaregiversPage() {
  return (
    <Suspense fallback={null}>
      <CaregiversPageInner />
    </Suspense>
  )
}

function CaregiversPageInner() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const searchParams = useSearchParams()
  const router = useRouter()

  // Deep-linked from the sidebar's "افزودن خدمت‌دهنده" nav item
  // (?add=1) — this view hides the Kanban board/cards entirely and
  // shows just the add-caregiver form, per the confirmed requirement
  // that this shortcut should show ONLY the add flow, not the list.
  const isAddOnly = searchParams.get("add") === "1"

  const [agencyId, setAgencyId] = useState<number | null>(null)

  const [requests, setRequests] = useState<AgencyCaregiverLink[]>([])
  const [decidingId, setDecidingId] = useState<number | null>(null)
  const [urgentDrafts, setUrgentDrafts] = useState<Record<number, boolean>>({})

  const [pipelineItems, setPipelineItems] = useState<AgencyCaregiverPipelineItem[]>([])
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES)
  const [addingStage, setAddingStage] = useState(false)
  const [newStageLabel, setNewStageLabel] = useState("")
  const [savingStage, setSavingStage] = useState(false)
  const [loadingPipeline, setLoadingPipeline] = useState(true)
  const [movingId, setMovingId] = useState<number | null>(null)
  const [activeItem, setActiveItem] = useState<AgencyCaregiverPipelineItem | null>(null)
  const [checklistOpenId, setChecklistOpenId] = useState<number | null>(null)

  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<CaregiverFilters>(emptyCaregiverFilters)
  const [sortBy, setSortBy] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ first_name: "", last_name: "", phone_number: "" })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const [pinnedOnly, setPinnedOnly] = useState(false)
  const { pinned: pinnedIds, isPinned, toggle: togglePin } = usePinned("caregivers")

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const availableTags = useMemo(
    () => Array.from(new Set(pipelineItems.flatMap((i) => i.tags))).sort(),
    [pipelineItems]
  )
  const availableCreators = useMemo(
    () => Array.from(new Set(pipelineItems.map((i) => i.created_by).filter((c): c is string => !!c))).sort(),
    [pipelineItems]
  )
  const filteredPipelineItems = useMemo(() => {
    const base = pipelineItems.filter((i) => matchesCaregiverFilters(i, search, filters) && (!pinnedOnly || pinnedIds.has(i.id)))
    return sortCaregivers(base, sortBy)
  }, [pipelineItems, search, filters, sortBy, pinnedOnly, pinnedIds])
  const activeFilterCount = countActiveCaregiverFilters(filters)

  function refreshRequests() {
    return agencyService.caregiverRequests().then(setRequests)
  }

  function refreshPipeline(id: number) {
    return agencyManagementService.listCaregiverPipeline(id).then(setPipelineItems)
  }

  function refreshStages(id: number) {
    return agencyManagementService.listPipelineStages(id, "caregiver").then(setStages)
  }

  useEffect(() => {
    if (!user) return
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return Promise.all([
        refreshRequests(),
        refreshStages(profile.id),
        refreshPipeline(profile.id).finally(() => setLoadingPipeline(false)),
      ])
    })
  }, [user])

  // Deep-link from the sidebar's "افزودن خدمت‌دهنده" nav item
  // (?add=1) — opens the same form the page's own header button
  // does, so that link works as a direct shortcut into this page
  // rather than just landing on the list and requiring another click.
  useEffect(() => {
    if (searchParams.get("add") === "1") setShowForm(true)
  }, [searchParams])

  if (authLoading || !user) return null

  async function handleCreateCaregiver() {
    if (agencyId === null) return
    setCreating(true); setCreateError("")
    try {
      const created = await agencyManagementService.createCaregiverCandidate(agencyId, form)
      if (isAddOnly) {
        // Came from the sidebar's add-only shortcut — continue
        // straight into that caregiver's registration wizard instead
        // of landing back on a list this view never showed.
        router.push(`${ROUTES.caregivers}/${created.user_id}/register`)
        return
      }
      setPipelineItems((prev) => [created, ...prev])
      setForm({ first_name: "", last_name: "", phone_number: "" })
      setShowForm(false)
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || "ثبت خدمت‌دهنده با خطا مواجه شد.")
    } finally {
      setCreating(false)
    }
  }

  async function handleDecision(link: AgencyCaregiverLink, decision: "approve" | "reject") {
    setDecidingId(link.id)
    try {
      await agencyService.decideCaregiverRequest(link.id, decision)
      // فوری is set once, right here at approval time, per the
      // confirmed requirement — not something toggled later on an
      // existing card. Only applied when the checkbox for this
      // specific request was checked, and only on approval (a
      // rejected caregiver never enters the pipeline at all).
      if (decision === "approve" && urgentDrafts[link.id] && agencyId !== null) {
        await agencyManagementService.updateCaregiverPipeline(agencyId, link.caregiver, { is_urgent: true })
      }
      await refreshRequests()
      if (agencyId !== null) await refreshPipeline(agencyId)
    } finally {
      setDecidingId(null)
    }
  }

  async function applyStageChange(item: AgencyCaregiverPipelineItem, newStage: string) {
    if (agencyId === null || newStage === item.agency_pipeline_status) return
    const previous = pipelineItems
    setPipelineItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, agency_pipeline_status: newStage } : i)))
    setMovingId(item.id)
    try {
      const updated = await agencyManagementService.updateCaregiverPipeline(agencyId, item.id, { agency_pipeline_status: newStage })
      setPipelineItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
    } catch {
      setPipelineItems(previous)
      window.alert("جابجایی مرحله با خطا مواجه شد.")
    } finally {
      setMovingId(null)
    }
  }

  function moveStage(item: AgencyCaregiverPipelineItem, direction: 1 | -1) {
    const currentIndex = stages.findIndex((s) => s.value === item.agency_pipeline_status)
    const nextIndex = currentIndex + direction
    if (nextIndex < 0 || nextIndex >= stages.length) return
    applyStageChange(item, stages[nextIndex].value)
  }

  async function handleAddStage() {
    if (agencyId === null || !newStageLabel.trim()) return
    setSavingStage(true)
    try {
      const created = await agencyManagementService.addPipelineStage(agencyId, "caregiver", newStageLabel.trim())
      setStages((prev) => [...prev, created])
      setNewStageLabel("")
      setAddingStage(false)
    } catch {
      window.alert("افزودن مرحله با خطا مواجه شد.")
    } finally {
      setSavingStage(false)
    }
  }

  async function persistTags(item: AgencyCaregiverPipelineItem, newTags: string[]) {
    if (agencyId === null) return
    const previous = pipelineItems
    setPipelineItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, tags: newTags } : i)))
    try {
      const updated = await agencyManagementService.updateCaregiverPipeline(agencyId, item.id, { tags: newTags })
      setPipelineItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
    } catch {
      setPipelineItems(previous)
      window.alert("تغییر برچسب‌ها با خطا مواجه شد.")
    }
  }

  async function handleSaveNote(item: AgencyCaregiverPipelineItem, staff_notes: string) {
    if (agencyId === null) return
    const previous = pipelineItems
    setPipelineItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, staff_notes } : i)))
    try {
      const updated = await agencyManagementService.updateCaregiverPipeline(agencyId, item.id, { staff_notes })
      setPipelineItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
    } catch {
      setPipelineItems(previous)
      window.alert("ذخیره یادداشت با خطا مواجه شد.")
    }
  }

  async function handleSaveContractDate(
    item: AgencyCaregiverPipelineItem, field: "contract_start_date" | "contract_end_date", date: string,
  ) {
    if (agencyId === null) return
    const previous = pipelineItems
    setPipelineItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [field]: date } : i)))
    try {
      const updated = await agencyManagementService.updateCaregiverPipeline(agencyId, item.id, { [field]: date })
      setPipelineItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
    } catch {
      setPipelineItems(previous)
      window.alert(field === "contract_start_date" ? "ذخیره تاریخ شروع قرارداد با خطا مواجه شد." : "ذخیره تاریخ پایان قرارداد با خطا مواجه شد.")
    }
  }

  function handleAddTag(item: AgencyCaregiverPipelineItem, tag: string) {
    persistTags(item, [...item.tags, tag])
  }

  function handleRemoveTag(item: AgencyCaregiverPipelineItem, tag: string) {
    persistTags(item, item.tags.filter((t) => t !== tag))
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveItem((event.active.data.current?.item as AgencyCaregiverPipelineItem) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (!over) return
    const item = active.data.current?.item as AgencyCaregiverPipelineItem | undefined
    if (!item) return
    applyStageChange(item, String(over.id))
  }

  const docsStageItems = pipelineItems.filter((i) => i.agency_pipeline_status === "documents_in_progress")
  const endingSoonItems = pipelineItems.filter((i) => i.tags.includes("در شرف اتمام قرارداد"))

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{isAddOnly ? "افزودن خدمت‌دهنده" : "خدمت‌دهنده"}</h1>
          {!isAddOnly && <p className="text-xs text-slate-500">{pipelineItems.length} مراقب در استخر آژانس</p>}
        </div>
        {!isAddOnly && !loadingPipeline && (
          <div className="flex items-center gap-2">
            <SearchTrigger search={search} onSearchChange={setSearch} placeholder="جست‌وجو بر اساس نام یا تلفن..." />
            <FilterToggleButton open={filterOpen} onClick={() => setFilterOpen((o) => !o)} active={activeFilterCount > 0} />
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> افزودن خدمت‌دهنده
            </Button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="mb-4 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          {createError && <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{createError}</div>}
          <p className="text-xs text-slate-500">
            حساب مراقب با همین نام و شماره ساخته می‌شود — رمز عبور بعداً از طریق شماره موبایل خودِ مراقب بازیابی می‌شود.
            این کاندید فقط زیر نظر همون کسی که الان ثبتش می‌کنه (شما، یا سوپروایزر/مدیر بالادستتون) در این کاریز دیده می‌شه.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="نام" required>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </Field>
            <Field label="نام خانوادگی" required>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </Field>
          </div>
          <Field label="شماره موبایل" required>
            <Input dir="ltr" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="09xxxxxxxxx" />
          </Field>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={creating || !form.first_name || !form.last_name || !form.phone_number}
              onClick={handleCreateCaregiver}
            >
              {creating ? "در حال ثبت..." : "ثبت خدمت‌دهنده"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                // In the add-only deep-link, ?add=1 is what reopens
                // this form (see the effect above) — closing it here
                // without leaving that view would just have it pop
                // back open, so cancel goes back to the plain list
                // instead of merely hiding the form.
                if (isAddOnly) { router.push(ROUTES.caregivers); return }
                setShowForm(false); setCreateError("")
              }}
            >
              انصراف
            </Button>
          </div>
        </div>
      )}

      {!isAddOnly && (
        <div className="space-y-4">
          {endingSoonItems.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/60">
              <CardHeader><CardTitle className="text-sm text-orange-900">یادآوری تمدید قرارداد</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-orange-800">
                  {endingSoonItems.length} مراقب در مرحله «در شرف اتمام قرارداد» هستند — برای جلوگیری از قطع خدمت، قرارداد را تمدید کنید.
                </p>
                <div className="mt-2 space-y-1">
                  {endingSoonItems.map((i) => (
                    <p key={i.id} className="text-xs font-medium text-orange-900">{i.full_name}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <RegistrationReviews onChanged={() => { if (agencyId !== null) refreshPipeline(agencyId) }} />

          {requests.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardHeader><CardTitle className="text-sm text-amber-900">درخواست‌های در انتظار تأیید</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="rounded-lg border border-amber-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{r.caregiver_display_name}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{r.caregiver_phone_number}</p>
                        <p className="text-xs text-muted-foreground">وضعیت در پلتفرم: {CAREGIVER_STATUS_LABEL[r.caregiver_status] || r.caregiver_status}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={decidingId === r.id} onClick={() => handleDecision(r, "approve")}>تأیید</Button>
                        <Button size="sm" variant="outline" className="border-slate-200 text-blue-700 hover:bg-slate-50" disabled={decidingId === r.id} onClick={() => handleDecision(r, "reject")}>رد</Button>
                      </div>
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={!!urgentDrafts[r.id]}
                        onChange={(e) => setUrgentDrafts((prev) => ({ ...prev, [r.id]: e.target.checked }))}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      فوری (در صورت تأیید)
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!loadingPipeline && (
            <>
            {filterOpen && (
            <FilterRow
              hasActive={activeFilterCount > 0}
              onClearAll={() => setFilters(emptyCaregiverFilters)}
              resultCount={filteredPipelineItems.length}
              totalCount={pipelineItems.length}
            >
              <FilterDropdown label="فوری" active={filters.urgentOnly} onClear={() => setFilters((f) => ({ ...f, urgentOnly: false }))}>
                <DropdownOption selected={filters.urgentOnly} onClick={() => setFilters((f) => ({ ...f, urgentOnly: !f.urgentOnly }))}>
                  فقط فوری‌ها
                </DropdownOption>
              </FilterDropdown>

              <FilterDropdown label="مدارک" active={!!filters.docsStatus} onClear={() => setFilters((f) => ({ ...f, docsStatus: "" }))}>
                <DropdownOption selected={filters.docsStatus === "complete"} onClick={() => setFilters((f) => ({ ...f, docsStatus: f.docsStatus === "complete" ? "" : "complete" }))}>
                  مدارک کامل
                </DropdownOption>
                <DropdownOption selected={filters.docsStatus === "incomplete"} onClick={() => setFilters((f) => ({ ...f, docsStatus: f.docsStatus === "incomplete" ? "" : "incomplete" }))}>
                  مدارک ناقص
                </DropdownOption>
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

              <FilterDropdown label="نوع خدمت" active={filters.serviceTypes.length > 0} onClear={() => setFilters((f) => ({ ...f, serviceTypes: [] }))}>
                {C.SERVICE_TYPE.map(([value, label]) => (
                  <DropdownOption key={value} selected={filters.serviceTypes.includes(value)} onClick={() => setFilters((f) => ({ ...f, serviceTypes: toggleInList(f.serviceTypes, value) }))}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", serviceTypeDotColor(value))} />
                      {label}
                    </span>
                  </DropdownOption>
                ))}
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
              <SortDropdown value={sortBy} options={CAREGIVER_SORT_OPTIONS} onChange={setSortBy} />
              <div className="mr-auto">
                <PinnedOnlyToggle pinnedOnly={pinnedOnly} onChange={setPinnedOnly} pinnedCount={pinnedIds.size} />
              </div>
            </SortSection>
            </>
          )}

          {loadingPipeline ? (
            <div className="flex gap-3 overflow-x-auto">
              {DEFAULT_STAGES.map((s) => <Skeleton key={s.value} className="h-72 w-[270px] shrink-0 rounded-xl" />)}
            </div>
          ) : (
            <>
              {docsStageItems.length > 0 && (
                <div>
                  <button
                    className="mb-2 text-xs font-medium text-purple-700 underline"
                    onClick={() => setChecklistOpenId(checklistOpenId ? null : docsStageItems[0].id)}
                  >
                    {checklistOpenId ? "بستن چک‌لیست‌ها" : `مشاهده چک‌لیست مدارک (${docsStageItems.length} نفر در این مرحله)`}
                  </button>
                  {checklistOpenId && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {docsStageItems.map((item) => (
                        <DocumentChecklistDrawer
                          key={item.id}
                          item={item}
                          agencyId={agencyId!}
                          canReview={user?.role === "agency" || user?.role === "agency_supervisor"}
                          onUpdated={(updated) => setPipelineItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                {/* A wide, horizontally-scrolling pipeline strip — same
                    layout as patients/page.tsx's own board. */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {stages.map((stage, index) => (
                    <StageColumn
                      key={stage.value}
                      stage={stage}
                      index={index}
                      stages={stages}
                      items={filteredPipelineItems.filter((i) => i.agency_pipeline_status === stage.value)}
                      onMove={moveStage}
                      movingId={movingId}
                      onAddTag={handleAddTag}
                      onRemoveTag={handleRemoveTag}
                      isPinned={isPinned}
                      onTogglePin={togglePin}
                      onQuickAdd={index === 0 ? () => setShowForm(true) : undefined}
                      onSaveNote={handleSaveNote}
                      onSaveContractDate={handleSaveContractDate}
                    />
                  ))}

                  {/* Appends a brand-new stage to the end of this
                      agency's own caregiver pipeline. */}
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
                  {activeItem && (
                    <div className="w-72 rounded-xl border border-primary bg-white p-4 shadow-lg">
                      <p className="truncate text-base font-bold text-slate-900">{activeItem.full_name}</p>
                      <p className="text-xs text-slate-500" dir="ltr">{activeItem.phone_number}</p>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>

              {/* فوری is no longer toggleable from a list here — per
                  the confirmed requirement, it's set once when a
                  request is approved (see the approval banner above),
                  not something meant to live on every card by
                  default. */}
              {filteredPipelineItems.length > 0 && (
                <Card className="border-slate-200">
                  <CardHeader><CardTitle className="text-slate-900">همه مراقبان ({filteredPipelineItems.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {filteredPipelineItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-medium">{item.full_name}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{item.phone_number}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
