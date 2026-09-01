"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { complaintReviewService, type ComplaintListItem } from "@/services/complaint_review.service"
import { COMPLAINT_CATEGORY_LABEL, COMPLAINT_STATUS_LABEL } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

const STATUS_FILTER_OPTIONS = [
  ["", "همه وضعیت‌ها"],
  ["open", "باز"],
  ["under_review", "در حال بررسی"],
  ["resolved", "حل‌شده"],
  ["dismissed", "رد شده"],
] as const

const STATUS_CLASS: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
  dismissed: "bg-gray-100 text-gray-600",
}

export default function ComplaintsListPage() {
  const { user, loading: authLoading, logout } = useAuth(["admin", "superuser"])
  const router = useRouter()

  const [complaints, setComplaints] = useState<ComplaintListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    if (!user) return
    setLoading(true)
    complaintReviewService.list(statusFilter || undefined).then(setComplaints).finally(() => setLoading(false))
  }, [user, statusFilter])

  if (authLoading || !user) return null

  const openCount = complaints.filter((c) => c.status === "open").length

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">شکایات و بازخورد</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.patientNotes)}>یادداشت‌ها</Button>
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>مراقبان</Button>
            <Button variant="ghost" size="sm" className="text-rose-600" onClick={logout}>خروج</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {!statusFilter && openCount > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {openCount} شکایت باز، هنوز بررسی نشده است.
          </div>
        )}

        <Card className="border-pink-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-rose-900">فهرست شکایات ({complaints.length})</CardTitle>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTER_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : complaints.length === 0 ? (
              <p className="text-sm text-muted-foreground">موردی یافت نشد.</p>
            ) : (
              <div className="space-y-2">
                {complaints.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => router.push(ROUTES.complaintDetail(c.id))}
                    className="flex w-full items-center justify-between rounded-lg border border-pink-100 bg-pink-50/40 p-3 text-right transition-colors hover:bg-pink-50"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.patient_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{COMPLAINT_CATEGORY_LABEL[c.category] || c.category}</p>
                      {c.caregiver_name && <p className="text-[11px] text-muted-foreground">درباره: {c.caregiver_name}</p>}
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", STATUS_CLASS[c.status])}>
                      {COMPLAINT_STATUS_LABEL[c.status]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
