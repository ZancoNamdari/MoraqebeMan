"use client"

import { useEffect, useState } from "react"
import { Users, Building2, HeartHandshake, Handshake, Eye, UserCheck } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Sidebar } from "@/components/layout/sidebar"
import { StatCard } from "@/components/layout/stat-card"
import { analyticsService, type PageViewStats, type PlatformCounts } from "@/services/analytics.service"

export default function AnalyticsPage() {
  const { user, loading: authLoading, logout } = useAuth(["admin", "superuser"])

  const [counts, setCounts] = useState<PlatformCounts | null>(null)
  const [pageStats, setPageStats] = useState<PageViewStats | null>(null)
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState("")

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [pathSearch, setPathSearch] = useState("")

  async function loadPageStats() {
    setLoadingStats(true); setError("")
    try {
      const data = await analyticsService.pageViewStats({
        start: startDate || undefined,
        end: endDate || undefined,
        path: pathSearch || undefined,
      })
      setPageStats(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "دریافت آمار بازدید با خطا مواجه شد.")
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    if (!user) return
    analyticsService.platformCounts().then(setCounts).finally(() => setLoadingCounts(false))
    loadPageStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background">
      <Sidebar onLogout={logout} />

      <div className="sm:mr-64">
        <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
          <div className="p-4 sm:px-6">
            <h1 className="font-bold text-rose-900">آمار و ترافیک</h1>
          </div>
        </header>

        <main className="space-y-6 p-4 sm:p-6">
          {/* Platform-wide counts — straightforward data already in the database */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">آمار کلی پلتفرم</h2>
            {loadingCounts || !counts ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="کل کاربران" value={counts.total_users} icon={Users} color="primary" />
                <StatCard label="آژانس‌ها" value={counts.total_agencies} icon={Building2} color="amber" />
                <StatCard label="مراقبان تأییدشده" value={counts.total_caregivers_approved} icon={UserCheck} color="emerald" />
                <StatCard label="مراجعان آژانس‌ها" value={counts.agency_customers} icon={Handshake} color="rose" />
              </div>
            )}

            {counts && (
              <Card className="border-pink-100">
                <CardHeader><CardTitle className="text-rose-900">کاربران بر اساس نقش</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {Object.entries({
                    "خانواده": counts.users_by_role.family,
                    "سالمند/بیمار": counts.users_by_role.patient,
                    "مراقب": counts.users_by_role.caregiver,
                    "آژانس": counts.users_by_role.agency,
                    "ادمین": counts.users_by_role.admin,
                    "سوپریوزر": counts.users_by_role.superuser,
                  }).map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
                      <p className="text-xl font-bold text-foreground">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>

          {/* Page view / traffic stats — separate section, its own filters */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">بازدید صفحات</h2>

            {pageStats && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="بازدید امروز" value={pageStats.today_visits} icon={Eye} color="primary" />
                <StatCard label="بازدیدکننده یکتای امروز" value={pageStats.today_unique_visitors} icon={HeartHandshake} color="amber" />
              </div>
            )}

            <Card className="border-pink-100">
              <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="path">جست‌وجوی مسیر صفحه</Label>
                  <Input id="path" dir="ltr" placeholder="مثلاً /articles" value={pathSearch} onChange={(e) => setPathSearch(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="start">از تاریخ</Label>
                  <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end">تا تاریخ</Label>
                  <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={loadPageStats} disabled={loadingStats}>
                    {loadingStats ? "در حال جست‌وجو..." : "اعمال فیلتر"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <Card className="border-pink-100">
              <CardHeader>
                <CardTitle className="text-rose-900">
                  پربازدیدترین صفحات
                  {pageStats && ` (${pageStats.range_start} تا ${pageStats.range_end} — مجموع ${pageStats.range_total_visits} بازدید، ${pageStats.range_unique_visitors} بازدیدکننده یکتا)`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-64 w-full rounded-2xl" />
                ) : !pageStats || pageStats.most_viewed_pages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">در این بازه، بازدیدی ثبت نشده است.</p>
                ) : (
                  <div className="space-y-2">
                    {pageStats.most_viewed_pages.map((p) => (
                      <div key={p.path} className="flex items-center justify-between rounded-lg border border-pink-100 bg-pink-50/40 p-3">
                        <p className="text-sm font-medium" dir="ltr">{p.path}</p>
                        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary-strong">
                          {p.views} بازدید
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  )
}
