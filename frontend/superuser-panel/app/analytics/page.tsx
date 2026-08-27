"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { platformAnalyticsService } from "@/services/platform_analytics.service"
import { ROUTES } from "@/lib/routes"
import type { PlatformAnalytics } from "@/types/platform_analytics"

export default function AnalyticsPage() {
  const { user, loading: authLoading, logout } = useAuth(["superuser"])
  const router = useRouter()

  const [data, setData] = useState<PlatformAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    platformAnalyticsService.get()
      .then(setData)
      .catch((err) => setError(err?.response?.data?.detail || "دریافت اطلاعات با خطا مواجه شد."))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">تحلیل کل پلتفرم</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>مدیریت کاربران</Button>
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.agencies)}>آژانس‌ها</Button>
            <Button variant="ghost" size="sm" className="text-rose-600" onClick={logout}>خروج</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : !data ? null : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "آژانس", value: data.totals.agency_count },
                { label: "سوپروایزر", value: data.totals.supervisor_count },
                { label: "مراقب (کل)", value: data.totals.caregiver_count },
                { label: "مراقب تأییدشده", value: data.totals.approved_caregiver_count },
                { label: "سالمند", value: data.totals.patient_count },
                { label: "خانواده", value: data.totals.family_count },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-pink-100 bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-rose-800">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-rose-900">تفکیک بر اساس آژانس</CardTitle></CardHeader>
              <CardContent>
                {data.agencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">هنوز هیچ آژانسی ثبت نشده است.</p>
                ) : (
                  <div className="space-y-2">
                    {data.agencies.map((a) => (
                      <div key={a.id} className="rounded-lg border border-pink-100 bg-pink-50/40 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{a.company_name}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{a.access_code}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>سوپروایزر: {a.supervisor_count}</span>
                          <span>مراقب تأییدشده: {a.approved_caregiver_count}</span>
                          {a.pending_caregiver_requests > 0 && (
                            <span className="font-medium text-amber-700">{a.pending_caregiver_requests} درخواست مراقب در انتظار</span>
                          )}
                          <span>خانواده: {a.approved_family_count}</span>
                          <span>سالمند: {a.patient_count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
