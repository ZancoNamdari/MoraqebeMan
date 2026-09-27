"use client"

import { Suspense, useEffect, useMemo, useState, type ChangeEvent } from "react"
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, GripVertical, ChevronRight, ChevronLeft, Plus, ClipboardList } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field } from "@/components/forms/fields"
import { SearchTrigger, FilterDropdown, DropdownOption, SortDropdown, FilterRow, FilterToggleButton, SortSection, type SortOption } from "@/components/agency/filter-bar"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { cn } from "@/lib/utils"
import { TagEditor } from "@/components/agency/tag-editor"
import { ReminderBadges } from "@/components/reminders/reminder-badges"
import type { AgencyCaregiverLink } from "@/types/agency"
import type { AgencyCaregiverPipelineItem, CaregiverDocumentField, CaregiverDocumentReviewStatus } from "@/types/agency_management"

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

const STAGES = [
  { value: "registered", label: "ثبت در سایت" },
  { value: "documents_in_progress", label: "تکمیل مدارک" },
  { value: "being_dispatched", label: "در حال اعزام" },
  { value: "on_assignment", label: "در حال مأموریت" },
  { value: "first_week", label: "هفته اول" },
  { value: "confirmed", label: "تأیید شده" },
  { value: "expired", label: "منقضی‌ها" },
] as const

const DOC_CHECKLIST = [
  { field: "doc_no_criminal_record", docType: "no_criminal_record", label: "عدم سوءپیشینه" },
  { field: "doc_no_addiction_test", docType: "no_addiction_test", label: "آزمایش عدم اعتیاد" },
  { field: "doc_identity_verified", docType: "identity_verified", label: "تأیید مدارک هویتی" },
  { field: "doc_personal_photo", docType: "personal_photo", label: "عکس پرسنلی" },
  { field: "doc_mental_health_test", docType: "mental_health_test", label: "آزمون سلامت روان" },
  { field: "doc_promissory_note", docType: "promissory_note", label: "دریافت سفته/ضمانت" },
  { field: "doc_id_card_received", docType: "id_card_received", label: "دریافت مدرک شناسایی" },
] as const satisfies readonly { field: keyof AgencyCaregiverPipelineItem; docType: CaregiverDocumentField; label: string }[]

const DOC_STATUS_LABEL: Record<CaregiverDocumentReviewStatus, string> = {
  pending: "در انتظار بررسی", approved: "تأیید شده", rejected: "رد شده",
}
const DOC_STATUS_COLOR: Record<CaregiverDocumentReviewStatus, string> = {
  pending: "text-amber-700 bg-amber-100", approved: "text-emerald-700 bg-emerald-100", rejected: "text-red-700 bg-red-100",
}

function docsCompletedCount(item: AgencyCaregiverPipelineItem) {
  return DOC_CHECKLIST.filter((d) => item[d.field]).length
}

const emptyCaregiverFilters = {
  urgentOnly: false,
  tags: [] as string[],
  docsStatus: "" as "" | "complete" | "incomplete",
  createdBy: "" as string,
}
type CaregiverFilters = typeof emptyCaregiverFilters

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function countActiveCaregiverFilters(f: CaregiverFilters) {
  return (f.urgentOnly ? 1 : 0) + f.tags.length + (f.docsStatus ? 1 : 0) + (f.createdBy ? 1 : 0)
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
    const complete = docsCompletedCount(item) === DOC_CHECKLIST.length
    if (filters.docsStatus === "complete" && !complete) return false
    if (filters.docsStatus === "incomplete" && complete) return false
  }
  if (filters.createdBy && item.created_by !== filters.createdBy) return false
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

function CaregiverCard({ item, onMove, moving, onAddTag, onRemoveTag }: {
  item: AgencyCaregiverPipelineItem
  onMove: (item: AgencyCaregiverPipelineItem, direction: 1 | -1) => void
  moving: boolean
  onAddTag: (item: AgencyCaregiverPipelineItem, tag: string) => void
  onRemoveTag: (item: AgencyCaregiverPipelineItem, tag: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  })
  const stageIndex = STAGES.findIndex((s) => s.value === item.agency_pipeline_status)
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const isDocsStage = item.agency_pipeline_status === "documents_in_progress"
  const isEndingSoon = item.tags.includes("در شرف اتمام قرارداد")

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("rounded-md border border-slate-200 bg-white p-2.5 shadow-sm", isDragging && "z-50 opacity-50")}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{item.full_name}</p>
          <p className="text-[11px] text-slate-500" dir="ltr">{item.phone_number}</p>
          {item.created_by && (
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {item.created_by}
            </span>
          )}
          {isEndingSoon && (
            <span className="mt-1 mr-1 inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
              <AlertTriangle className="h-2.5 w-2.5" /> در شرف اتمام قرارداد
            </span>
          )}
        </div>
        <button {...attributes} {...listeners} className="shrink-0 cursor-grab touch-none rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <TagEditor
        tags={item.tags}
        suggestions={CARD_TAG_SUGGESTIONS}
        onAdd={(tag) => onAddTag(item, tag)}
        onRemove={(tag) => onRemoveTag(item, tag)}
      />

      {isDocsStage && (
        <p className="mt-1.5 text-[10px] font-medium text-purple-700">
          {docsCompletedCount(item)}/{DOC_CHECKLIST.length} مدرک تکمیل شده
        </p>
      )}

      <ReminderBadges reminders={item.active_reminders} />

      <div className="mt-2 flex items-center justify-between">
        <button className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={moving || stageIndex === 0} onClick={() => onMove(item, -1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={moving || stageIndex === STAGES.length - 1} onClick={() => onMove(item, 1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <Link
          href={`/caregivers/${item.user_id}/register`}
          className="flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
        >
          <ClipboardList className="h-3 w-3" /> ادامه ثبت‌نام
        </Link>
        <Link
          href={`/caregivers/${item.user_id}/profile`}
          className="flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
        >
          مشاهده پروفایل
        </Link>
      </div>
    </div>
  )
}

function StageColumn({ stage, items, onMove, movingId, onAddTag, onRemoveTag }: {
  stage: (typeof STAGES)[number]
  items: AgencyCaregiverPipelineItem[]
  onMove: (item: AgencyCaregiverPipelineItem, direction: 1 | -1) => void
  movingId: number | null
  onAddTag: (item: AgencyCaregiverPipelineItem, tag: string) => void
  onRemoveTag: (item: AgencyCaregiverPipelineItem, tag: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value })
  return (
    <div ref={setNodeRef} className={cn("flex min-w-[220px] flex-col rounded-lg border bg-slate-100 transition-colors", isOver ? "border-primary bg-primary/5" : "border-slate-200")}>
      <div className="border-b border-slate-200 p-3">
        <p className="text-xs font-bold text-slate-700">{stage.label}</p>
        <p className="text-[11px] text-slate-500">{items.length} مورد</p>
      </div>
      <div className="min-h-[80px] flex-1 space-y-2 p-2">
        {items.length === 0 ? (
          <p className="p-3 text-center text-[11px] text-slate-400">موردی نیست</p>
        ) : (
          items.map((item) => (
            <CaregiverCard
              key={item.id} item={item} onMove={onMove} moving={movingId === item.id}
              onAddTag={onAddTag} onRemoveTag={onRemoveTag}
            />
          ))
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
          <input type="file" className="hidden" disabled={busy} onChange={handleFile} />
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
        {DOC_CHECKLIST.map((d) => (
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

  const [agencyId, setAgencyId] = useState<number | null>(null)

  const [requests, setRequests] = useState<AgencyCaregiverLink[]>([])
  const [decidingId, setDecidingId] = useState<number | null>(null)
  const [urgentDrafts, setUrgentDrafts] = useState<Record<number, boolean>>({})

  const [pipelineItems, setPipelineItems] = useState<AgencyCaregiverPipelineItem[]>([])
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const availableTags = useMemo(
    () => Array.from(new Set(pipelineItems.flatMap((i) => i.tags))).sort(),
    [pipelineItems]
  )
  const availableCreators = useMemo(
    () => Array.from(new Set(pipelineItems.map((i) => i.created_by).filter((c): c is string => !!c))).sort(),
    [pipelineItems]
  )
  const filteredPipelineItems = useMemo(
    () => sortCaregivers(pipelineItems.filter((i) => matchesCaregiverFilters(i, search, filters)), sortBy),
    [pipelineItems, search, filters, sortBy]
  )
  const activeFilterCount = countActiveCaregiverFilters(filters)

  function refreshRequests() {
    return agencyService.caregiverRequests().then(setRequests)
  }

  function refreshPipeline(id: number) {
    return agencyManagementService.listCaregiverPipeline(id).then(setPipelineItems)
  }

  useEffect(() => {
    if (!user) return
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return Promise.all([
        refreshRequests(),
        refreshPipeline(profile.id).finally(() => setLoadingPipeline(false)),
      ])
    })
  }, [user])

  // Deep-link from the sidebar's "افزودن خدمت‌دهنده جدید" nav item
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
    const currentIndex = STAGES.findIndex((s) => s.value === item.agency_pipeline_status)
    const nextIndex = currentIndex + direction
    if (nextIndex < 0 || nextIndex >= STAGES.length) return
    applyStageChange(item, STAGES[nextIndex].value)
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
          <h1 className="text-lg font-bold text-slate-900">خدمت‌دهنده</h1>
          <p className="text-xs text-slate-500">{pipelineItems.length} مراقب در استخر آژانس</p>
        </div>
        {!loadingPipeline && (
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
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setCreateError("") }}>انصراف</Button>
          </div>
        </div>
      )}

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
            </SortSection>
            </>
          )}

          {loadingPipeline ? (
            <div className="grid grid-cols-7 gap-3">
              {STAGES.map((s) => <Skeleton key={s.value} className="h-64 rounded-lg" />)}
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
                <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                  {STAGES.map((stage) => (
                    <StageColumn
                      key={stage.value}
                      stage={stage}
                      items={filteredPipelineItems.filter((i) => i.agency_pipeline_status === stage.value)}
                      onMove={moveStage}
                      movingId={movingId}
                      onAddTag={handleAddTag}
                      onRemoveTag={handleRemoveTag}
                    />
                  ))}
                </div>
                <DragOverlay>
                  {activeItem && (
                    <div className="w-52 rounded-md border border-primary bg-white p-2.5 shadow-lg">
                      <p className="truncate text-sm font-medium text-slate-900">{activeItem.full_name}</p>
                      <p className="text-[11px] text-slate-500" dir="ltr">{activeItem.phone_number}</p>
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
    </div>
  )
}
