"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { caregiverReviewService } from "@/services/caregiver_review.service"
import { STATUS_LABEL, type CaregiverListItem } from "@/types/caregiver_review"
import { ROUTES } from "@/lib/routes"

const STATUS_FILTER_OPTIONS = [
  ["", "همه وضعیت‌ها"],
  ["pending", "در انتظار بررسی"],
  ["approved", "تأییدشده"],
  ["rejected", "رد شده"],
  ["suspended", "مسدود شده"],
  ["draft", "پیش‌نویس"],
] as const

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  suspended: "bg-red-200 text-red-900",
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth(["admin", "superuser"])
  const router = useRouter()

  const [caregivers, setCaregivers] = useState<CaregiverListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    if (!user) return
    caregiverReviewService.list().then(setCaregivers).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  const filtered = caregivers.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false
    if (search && !c.full_name.includes(search) && !c.phone_number.includes(search)) return false
    return true
  })

  const pendingCount = caregivers.filter((c) => c.status === "pending").length

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">بررسی مراقبان</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.complaints)}>شکایات</Button>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.patientNotes)}>یادداشت‌ها</Button>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.auditLogs)}>تاریخچه</Button>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.blacklistAppeals)}>درخواست‌های بازبینی</Button>
          <Button variant="ghost" size="sm" className="text-rose-600" onClick={logout}>خروج</Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {pendingCount > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {pendingCount} مراقب در انتظار بررسی است.
          </div>
        )}

        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <Input
              placeholder="جست‌وجو با نام یا شماره موبایل"
              className="min-w-[220px] flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_FILTER_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card className="border-pink-100">
          <CardHeader><CardTitle className="text-rose-900">مراقبان ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">موردی یافت نشد.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((c) => (
                  <button
                    key={c.user_id}
                    onClick={() => router.push(ROUTES.caregiverDetail(c.user_id))}
                    className="flex w-full items-center justify-between rounded-lg border border-pink-100 bg-pink-50/40 p-3 text-right transition-colors hover:bg-pink-50"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{c.phone_number}</p>
                      <p className="text-[11px] text-muted-foreground">{c.forms_completed} از {c.forms_total} فرم تکمیل‌شده</p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", STATUS_CLASS[c.status])}>
                      {STATUS_LABEL[c.status]}
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
