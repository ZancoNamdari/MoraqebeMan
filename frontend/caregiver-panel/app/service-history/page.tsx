"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { careService, type ServiceHistoryItem } from "@/services/care.service"
import { ROUTES } from "@/lib/routes"

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
const fa = (v: string | number) => String(v).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)])
// The backend already sends Jalali dates ("1405-07-18") — never re-convert them.
const jalali = (v: string | null) => (v ? fa(v.slice(0, 10).replace(/-/g, "/")) : "")

export default function ServiceHistoryPage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()
  const [items, setItems] = useState<ServiceHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    careService.myServiceHistory()
      .then(setItems)
      .catch(() => setError("دریافت سوابق با خطا مواجه شد."))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">سوابق خدمت من</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <p className="text-xs text-muted-foreground">
          فهرست افرادی که خدمت آن‌ها را پذیرفته‌اید، چه در حال انجام و چه پایان‌یافته.
        </p>
        {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}
        {loading && <Skeleton className="h-20 w-full" />}
        {!loading && !error && items.length === 0 && (
          <Card className="border-pink-100"><CardContent className="p-4 text-sm text-muted-foreground">هنوز خدمتی ثبت نشده است.</CardContent></Card>
        )}
        {items.map((it) => (
          <Card key={it.id} className="border-pink-100">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-foreground">{it.recipient_name}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${it.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                  {it.status === "active" ? "در حال انجام" : "پایان‌یافته"}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {it.service_type_display && <span>نوع خدمت: {it.service_type_display}</span>}
                <span>شروع: {jalali(it.assigned_at)}</span>
                {it.ended_at && <span>پایان: {jalali(it.ended_at)}</span>}
                <span>گزارش‌های ثبت‌شده: {fa(it.report_count)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}
