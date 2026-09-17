"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { caregiverService } from "@/services/caregiver.service"
import type { CaregiverListItem } from "@/types/caregiver"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس",
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
  suspended: "تعلیق شده",
}

const STATUS_DOT: Record<string, string> = {
  draft: "bg-slate-400",
  pending: "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-destructive",
  suspended: "bg-orange-500",
}

const STATUS_TEXT: Record<string, string> = {
  draft: "text-slate-600",
  pending: "text-amber-700",
  approved: "text-emerald-700",
  rejected: "text-destructive",
  suspended: "text-orange-700",
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth(["agency_supervisor"])
  const router = useRouter()
  const [caregivers, setCaregivers] = useState<CaregiverListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!user) return
    caregiverService
      .list()
      .then(setCaregivers)
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading) return null

  const doneCount = caregivers.filter((c) => c.forms_completed === c.forms_total).length
  const filtered = caregivers.filter((c) => {
    const q = search.trim()
    if (!q) return true
    return c.full_name.includes(q) || c.phone_number.includes(q)
  })

  async function handleDelete(c: CaregiverListItem) {
    const confirmed = window.confirm(`آیا از حذف «${c.full_name || c.phone_number}» مطمئن هستید؟ این کار قابل بازگشت نیست.`)
    if (!confirmed) return
    setDeletingId(c.user_id)
    try {
      await caregiverService.remove(c.user_id)
      setCaregivers((prev) => prev.filter((x) => x.user_id !== c.user_id))
    } catch {
      window.alert("حذف با خطا مواجه شد. دوباره تلاش کنید.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background pb-10">
      <AppHeader title="پنل ناظر — مراقب من" maxWidth="max-w-6xl">
        {user && <span className="text-sm text-muted-foreground">{user.username}</span>}
        <Button size="sm" variant="outline" className="border-border text-primary-strong hover:bg-secondary" onClick={logout}>خروج</Button>
      </AppHeader>

      <main className="mx-auto max-w-6xl space-y-4 p-4">
        {/* Summary strip — quick counts, admin-dashboard style */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="کل مراقبان" value={caregivers.length} color="bg-secondary text-primary-strong border-border" />
          <SummaryCard label="تکمیل‌شده" value={doneCount} color="bg-emerald-50 text-emerald-700 border-emerald-100" />
          <SummaryCard label="در حال تکمیل" value={caregivers.length - doneCount} color="bg-amber-50 text-amber-700 border-amber-100" />
          <SummaryCard label="تأییدشده" value={caregivers.filter((c) => c.status === "approved").length} color="bg-emerald-50 text-emerald-700 border-emerald-100" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام یا شماره موبایل..."
            className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button className="bg-primary hover:bg-primary" onClick={() => router.push(ROUTES.newCaregiver)}>
            + افزودن مراقب جدید
          </Button>
          <Button variant="outline" className="border-border text-primary-strong hover:bg-secondary" onClick={() => router.push(ROUTES.match)}>
            پیشنهاد مراقب برای بیمار
          </Button>
        </div>

        {/* Main table — Django-admin-changelist style */}
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              {caregivers.length === 0 ? "هنوز هیچ مراقبی ثبت نشده. با دکمه بالا شروع کنید." : "موردی با این جستجو یافت نشد."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">نام</th>
                  <th className="px-4 py-3">شماره موبایل</th>
                  <th className="px-4 py-3">وضعیت</th>
                  <th className="px-4 py-3">پیشرفت فرم‌ها</th>
                  <th className="px-4 py-3">عملیات</th>
                  <th className="px-4 py-3">افزوده‌شده توسط</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c, i) => (
                  <tr key={c.user_id} className={cn("transition-colors hover:bg-secondary/40", i % 2 === 1 && "bg-slate-50/50")}>
                    <td className="px-4 py-3 text-center font-medium text-slate-800">{c.full_name || "(بدون نام)"}</td>
                    <td className="px-4 py-3 text-center text-slate-600" dir="ltr">{c.phone_number}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", STATUS_TEXT[c.status])}>
                        <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[c.status])} />
                        {STATUS_LABEL[c.status] || c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              c.forms_completed === c.forms_total ? "bg-emerald-500" : "bg-primary"
                            )}
                            style={{ width: `${(c.forms_completed / c.forms_total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{c.forms_completed}/{c.forms_total}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          className="rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          onClick={() => router.push(`${ROUTES.review}?id=${c.user_id}`)}
                        >
                          بررسی
                        </button>
                        <button
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-primary-strong hover:bg-secondary"
                          onClick={() => router.push(`${ROUTES.newCaregiver}?id=${c.user_id}`)}
                        >
                          ویرایش
                        </button>
                        <button
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-primary-strong hover:bg-secondary disabled:opacity-50"
                          disabled={deletingId === c.user_id}
                          onClick={() => handleDelete(c)}
                        >
                          {deletingId === c.user_id ? "..." : "حذف"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      {c.created_by || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn("rounded-lg border p-3 text-center", color)}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  )
}
