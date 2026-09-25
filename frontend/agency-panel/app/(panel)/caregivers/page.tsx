"use client"

import { useEffect, useState } from "react"
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core"
import { AlertTriangle, GripVertical, ChevronRight, ChevronLeft } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { cn } from "@/lib/utils"
import { TagEditor } from "@/components/agency/tag-editor"
import type { AgencyCaregiverLink } from "@/types/agency"
import type { AgencyCaregiverPipelineItem } from "@/types/agency_management"

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
  { field: "doc_no_criminal_record", label: "عدم سوءپیشینه" },
  { field: "doc_no_addiction_test", label: "آزمایش عدم اعتیاد" },
  { field: "doc_identity_verified", label: "تأیید مدارک هویتی" },
  { field: "doc_personal_photo", label: "عکس پرسنلی" },
  { field: "doc_mental_health_test", label: "آزمون سلامت روان" },
  { field: "doc_promissory_note", label: "دریافت سفته/ضمانت" },
  { field: "doc_id_card_received", label: "دریافت مدرک شناسایی" },
] as const

function docsCompletedCount(item: AgencyCaregiverPipelineItem) {
  return DOC_CHECKLIST.filter((d) => item[d.field]).length
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

      <div className="mt-2 flex items-center justify-between">
        <button className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={moving || stageIndex === 0} onClick={() => onMove(item, -1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={moving || stageIndex === STAGES.length - 1} onClick={() => onMove(item, 1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
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

function DocumentChecklistDrawer({ item, agencyId, onUpdated }: {
  item: AgencyCaregiverPipelineItem
  agencyId: number
  onUpdated: (updated: AgencyCaregiverPipelineItem) => void
}) {
  const [saving, setSaving] = useState<string | null>(null)

  async function toggle(field: (typeof DOC_CHECKLIST)[number]["field"]) {
    setSaving(field)
    try {
      const updated = await agencyManagementService.updateCaregiverPipeline(agencyId, item.id, {
        [field]: !item[field],
      })
      onUpdated(updated)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/40 p-3">
      <p className="mb-2 text-xs font-bold text-purple-900">{item.full_name} — چک‌لیست مدارک</p>
      <div className="space-y-1.5">
        {DOC_CHECKLIST.map((d) => (
          <label key={d.field} className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={item[d.field]}
              disabled={saving === d.field}
              onChange={() => toggle(d.field)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {d.label}
          </label>
        ))}
      </div>
    </div>
  )
}

export default function CaregiversPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])

  const [agencyId, setAgencyId] = useState<number | null>(null)

  const [requests, setRequests] = useState<AgencyCaregiverLink[]>([])
  const [decidingId, setDecidingId] = useState<number | null>(null)
  const [urgentDrafts, setUrgentDrafts] = useState<Record<number, boolean>>({})

  const [pipelineItems, setPipelineItems] = useState<AgencyCaregiverPipelineItem[]>([])
  const [loadingPipeline, setLoadingPipeline] = useState(true)
  const [movingId, setMovingId] = useState<number | null>(null)
  const [activeItem, setActiveItem] = useState<AgencyCaregiverPipelineItem | null>(null)
  const [checklistOpenId, setChecklistOpenId] = useState<number | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

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

  if (authLoading || !user) return null

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
      <div className="mb-4">
        <h1 className="text-lg font-bold text-slate-900">خدمت‌دهنده</h1>
        <p className="text-xs text-slate-500">{pipelineItems.length} مراقب در استخر آژانس</p>
      </div>

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
                      items={pipelineItems.filter((i) => i.agency_pipeline_status === stage.value)}
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
              {pipelineItems.length > 0 && (
                <Card className="border-slate-200">
                  <CardHeader><CardTitle className="text-slate-900">همه مراقبان ({pipelineItems.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {pipelineItems.map((item) => (
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
