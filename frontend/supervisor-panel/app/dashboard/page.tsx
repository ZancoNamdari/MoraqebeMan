"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { caregiverService } from "@/services/caregiver.service"
import type { CaregiverListItem } from "@/types/caregiver"
import { ROUTES } from "@/lib/routes"

const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس",
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
  suspended: "تعلیق شده",
}

// Distinct colors per status — the point is being able to tell a
// caregiver's state apart at a glance while scanning 40-50 rows, not
// just reading small text.
const STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  suspended: "bg-orange-100 text-orange-800 border-orange-200",
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [caregivers, setCaregivers] = useState<CaregiverListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    caregiverService
      .list()
      .then(setCaregivers)
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading) return null

  const doneCount = caregivers.filter((c) => c.forms_completed === c.forms_total).length

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
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/40 via-background to-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <div>
            <h1 className="text-lg font-bold text-indigo-900">پنل ناظر — مراقب من</h1>
            {user && <p className="text-sm text-muted-foreground">خوش آمدید، {user.username}</p>}
          </div>
          <Button variant="outline" onClick={logout}>خروج</Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">لیست مراقبان</h2>
            <p className="text-sm text-muted-foreground">
              {caregivers.length} مراقب ثبت‌شده — {doneCount} مورد کامل
            </p>
          </div>
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push(ROUTES.newCaregiver)}>
            + افزودن مراقب جدید
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-8 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : caregivers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              هنوز هیچ مراقبی ثبت نشده. با دکمه بالا شروع کنید.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {caregivers.map((c) => (
              <Card key={c.user_id} className="transition hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{c.full_name || "(بدون نام)"}</p>
                      <Badge className={STATUS_CLASS[c.status] || ""} variant="outline">
                        {STATUS_LABEL[c.status] || c.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground" dir="ltr">{c.phone_number}</p>
                  </div>

                  <div className="w-40 shrink-0">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>{c.forms_completed} از {c.forms_total} فرم</span>
                    </div>
                    <Progress value={(c.forms_completed / c.forms_total) * 100} />
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      onClick={() => router.push(`${ROUTES.newCaregiver}?id=${c.user_id}`)}
                    >
                      ویرایش
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50"
                      disabled={deletingId === c.user_id}
                      onClick={() => handleDelete(c)}
                    >
                      {deletingId === c.user_id ? "در حال حذف..." : "حذف"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
