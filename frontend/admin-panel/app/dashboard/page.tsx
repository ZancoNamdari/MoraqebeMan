"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
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
  rejected: "bg-destructive/10 text-destructive",
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
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background pb-10">
      <AppHeader title="بررسی مراقبان">
        <Button variant="ghost" size="sm" className="text-primary-strong" onClick={logout}>خروج</Button>
      </AppHeader>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {pendingCount > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {pendingCount} مراقب در انتظار بررسی است.
          </div>
        )}

        <Card className="border-border">
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

        <Card className="border-border">
          <CardHeader><CardTitle className="text-foreground">مراقبان ({filtered.length})</CardTitle></CardHeader>
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
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/40 p-3 text-right transition-colors hover:bg-secondary"
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
