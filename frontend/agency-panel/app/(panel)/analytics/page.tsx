"use client"

import { useEffect, useState } from "react"
import { BarChart3, Clock, ShieldAlert, HeartPulse } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useAuth } from "@/hooks/useauth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { analyticsService } from "@/services/analytics.service"
import { toPersianDigits } from "@/lib/persian_digits"
import type { AgencyAnalytics } from "@/types/analytics"

function StatTile({ label, value, sub, icon: Icon, colorClass }: {
  label: string; value: string; sub?: string; icon: React.ElementType; colorClass: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor"])
  const [data, setData] = useState<AgencyAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    analyticsService.me()
      .then(setData)
      .catch(() => setError("دریافت اطلاعات تحلیلی با خطا مواجه شد."))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-slate-900">تحلیل</h1>
        <p className="text-xs text-slate-500">تحلیل عمیق‌تر عملکرد آژانس — نه فقط شمارش، بلکه روند و کیفیت.</p>
      </div>

      {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      {loading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* بخش ۱: مراحل پذیرش مراقبان */}
          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold text-slate-900">مراحل پذیرش مراقبان</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="نرخ تأیید" value={`${toPersianDigits(data.vetting_funnel.approval_rate_percent)}٪`}
                sub={`از ${toPersianDigits(data.vetting_funnel.total_candidates)} متقاضی`}
                icon={BarChart3} colorClass="bg-emerald-50 text-emerald-700"
              />
              <StatTile
                label="میانگین زمان تصمیم"
                value={data.vetting_funnel.avg_decision_days !== null ? `${toPersianDigits(data.vetting_funnel.avg_decision_days)} روز` : "—"}
                sub="از درخواست تا تأیید/رد"
                icon={Clock} colorClass="bg-blue-50 text-blue-700"
              />
              <StatTile
                label="در حال بررسی" value={toPersianDigits(data.vetting_funnel.pending_count)}
                icon={BarChart3} colorClass="bg-amber-50 text-amber-700"
              />
              <StatTile
                label="نیاز به مدارک" value={toPersianDigits(data.vetting_funnel.needs_more_docs_count)}
                icon={BarChart3} colorClass="bg-purple-50 text-purple-700"
              />
            </div>
            <Card className="mt-3 border-slate-200">
              <CardContent className="pt-4">
                <div dir="ltr" className="h-48 w-full">
                  <ResponsiveContainer>
                    <BarChart
                      data={[
                        { label: "تأیید شده", count: data.vetting_funnel.approved_count, key: "approved" },
                        { label: "در حال بررسی", count: data.vetting_funnel.pending_count, key: "pending" },
                        { label: "نیاز به مدارک", count: data.vetting_funnel.needs_more_docs_count, key: "needs_docs" },
                        { label: "رد شده", count: data.vetting_funnel.rejected_count, key: "rejected" },
                      ]}
                      margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {["#16a34a", "#f59e0b", "#ea580c", "#dc2626"].map((color, idx) => (
                          <Cell key={idx} fill={color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* بخش ۲: کیفیت خدمات (شکایات) */}
          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold text-slate-900">کیفیت خدمات</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="نسبت شکایت به مراقب تأییدشده"
                value={toPersianDigits(data.complaint_quality.complaints_per_approved_caregiver)}
                sub={`${toPersianDigits(data.complaint_quality.total_complaints)} شکایت ثبت‌شده`}
                icon={ShieldAlert} colorClass="bg-rose-50 text-rose-700"
              />
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-xs font-medium text-slate-500">مراقبان با بیشترین شکایت</p>
                {data.complaint_quality.top_flagged_caregivers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">فعلاً هیچ مراقبی شکایت تکراری ندارد.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.complaint_quality.top_flagged_caregivers.map((c) => (
                      <div key={c.caregiver_id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700">{c.name}</span>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-800">
                          {toPersianDigits(c.complaint_count)} شکایت
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* بخش ۳: درخواست‌های خانواده در انتظار */}
          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold text-slate-900">درخواست‌های عضویت خانواده در انتظار</h2>
            <div className="grid grid-cols-3 gap-3">
              <StatTile
                label="تا ۳ روز" value={toPersianDigits(data.stale_family_requests.within_3_days)}
                icon={Clock} colorClass="bg-emerald-50 text-emerald-700"
              />
              <StatTile
                label="۴ تا ۷ روز" value={toPersianDigits(data.stale_family_requests.within_7_days)}
                icon={Clock} colorClass="bg-amber-50 text-amber-700"
              />
              <StatTile
                label="بیش از ۷ روز (نیاز به رسیدگی)" value={toPersianDigits(data.stale_family_requests.over_7_days)}
                icon={Clock} colorClass="bg-rose-50 text-rose-700"
              />
            </div>
          </div>

          {/* بخش ۴: فعالیت مراقبت */}
          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold text-slate-900">فعالیت مراقبت</h2>
            <div className="grid grid-cols-3 gap-3">
              <StatTile
                label="تخصیص‌های فعال" value={toPersianDigits(data.care_activity.active_assignments_count)}
                icon={HeartPulse} colorClass="bg-blue-50 text-blue-700"
              />
              <StatTile
                label="تخصیص‌های پایان‌یافته" value={toPersianDigits(data.care_activity.ended_assignments_count)}
                icon={HeartPulse} colorClass="bg-slate-100 text-slate-700"
              />
              <StatTile
                label="میانگین مدت یک تخصیص"
                value={data.care_activity.avg_assignment_duration_days !== null ? `${toPersianDigits(data.care_activity.avg_assignment_duration_days)} روز` : "—"}
                icon={HeartPulse} colorClass="bg-purple-50 text-purple-700"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
