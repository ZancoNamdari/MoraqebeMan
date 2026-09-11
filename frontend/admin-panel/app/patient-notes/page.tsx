"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { patientNoteReviewService, type PatientNoteDetail, type PatientNoteListItem } from "@/services/patient_note_review.service"
import { PATIENT_NOTE_CATEGORY_LABEL } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/layout/sidebar"

type FilterMode = "all" | "urgent" | "unacknowledged"

export default function PatientNotesReviewPage() {
  const { user, loading: authLoading, logout } = useAuth(["admin", "superuser"])

  const [notes, setNotes] = useState<PatientNoteListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterMode>("unacknowledged")
  const [expanded, setExpanded] = useState<Record<number, PatientNoteDetail>>({})
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [acting, setActing] = useState(false)

  function refresh() {
    const params = filter === "urgent" ? { flagged_urgent: true } : filter === "unacknowledged" ? { unacknowledged: true } : undefined
    return patientNoteReviewService.list(params).then(setNotes)
  }

  useEffect(() => {
    if (!user) return
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [user, filter])

  if (authLoading || !user) return null

  async function handleExpand(id: number) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!expanded[id]) {
      const detail = await patientNoteReviewService.detail(id)
      setExpanded((prev) => ({ ...prev, [id]: detail }))
    }
  }

  async function handleAcknowledge(id: number) {
    setActing(true)
    try {
      const updated = await patientNoteReviewService.acknowledge(id)
      setExpanded((prev) => ({ ...prev, [id]: updated }))
      await refresh()
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background">
      <Sidebar onLogout={logout} />

      <div className="sm:mr-64">
        <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
          <div className="p-4 sm:px-6">
            <h1 className="font-bold text-rose-900">یادداشت‌های مراقبان درباره سالمندان</h1>
          </div>
        </header>

        <main className="space-y-4 p-4 sm:p-6">
          <p className="text-xs text-muted-foreground">این یادداشت‌ها هرگز به خانواده سالمند نمایش داده نمی‌شود.</p>

          <Card className="border-pink-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-rose-900">فهرست یادداشت‌ها ({notes.length})</CardTitle>
              <div className="flex gap-1">
                {([["unacknowledged", "دیده‌نشده"], ["urgent", "فوری"], ["all", "همه"]] as [FilterMode, string][]).map(([value, label]) => (
                  <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)}>
                    {label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full rounded-2xl" />
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">موردی یافت نشد.</p>
              ) : (
                <div className="space-y-2">
                  {notes.map((n) => {
                    const detail = expanded[n.id]
                    const isOpen = expandedId === n.id
                    return (
                      <div key={n.id} className="rounded-lg border border-pink-100 bg-pink-50/40">
                        <button onClick={() => handleExpand(n.id)} className="flex w-full items-center justify-between p-3 text-right">
                          <div>
                            <p className="text-sm font-medium">{n.patient_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {PATIENT_NOTE_CATEGORY_LABEL[n.category] || n.category} — از {n.caregiver_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {n.flagged_urgent && (
                              <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-800">فوری</span>
                            )}
                            <span className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-medium",
                              n.acknowledged_at ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
                            )}>
                              {n.acknowledged_at ? "دیده‌شده" : "دیده‌نشده"}
                            </span>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="border-t border-pink-100 p-3">
                            {!detail ? (
                              <Skeleton className="h-16 w-full" />
                            ) : (
                              <>
                                <p className="text-sm leading-relaxed">{detail.note}</p>
                                {!detail.acknowledged_at && (
                                  <Button size="sm" className="mt-3" disabled={acting} onClick={() => handleAcknowledge(n.id)}>
                                    {acting ? "..." : "علامت‌گذاری به‌عنوان دیده‌شده"}
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
