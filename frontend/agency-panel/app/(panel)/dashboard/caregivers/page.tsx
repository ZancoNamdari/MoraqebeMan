"use client"

import { useEffect, useState } from "react"
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { CheckCircle2, Clock, Siren, Users } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Skeleton } from "@/components/ui/skeleton"
import { KpiTile } from "@/components/dashboard/kpi-tile"
import { DonutChart } from "@/components/dashboard/donut-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { agencyService } from "@/services/agency.service"
import { CATEGORICAL_PALETTE, CHART_CHROME, OTHER_BUCKET_COLOR, STATUS_PALETTE } from "@/lib/dashboard-palette"
import type { DashboardInsights } from "@/types/dashboard"

function countFor(insights: DashboardInsights, status: string) {
  return insights.caregiver_status_breakdown.find((i) => i.status === status)?.count ?? 0
}

export default function CaregiversDashboardPage() {
  const { loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const [insights, setInsights] = useState<DashboardInsights | null>(null)

  useEffect(() => {
    agencyService.dashboardInsights().then(setInsights)
  }, [])

  if (authLoading) return null

  return (
    <div className="p-4 sm:p-6" dir="rtl">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-slate-900">داشبورد خدمت‌دهنده</h1>
        <p className="text-xs text-slate-500">نمای تحلیلی مراقبان آژانس</p>
      </div>

      {!insights ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        // Per the confirmed layout, "نمای کلی" and "ترکیب جمعیتی" no
        // longer sit behind a tab switch — both sections render
        // together on the same page, one under the other, so nothing
        // is hidden behind a click.
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiTile label="کل مراقبان" value={insights.caregiver_total_count} icon={Users} accentColor={CATEGORICAL_PALETTE[0]} />
              <KpiTile label="تأییدشده" value={countFor(insights, "approved")} icon={CheckCircle2} accentColor={CATEGORICAL_PALETTE[2]} />
              <KpiTile label="در انتظار بررسی" value={countFor(insights, "pending")} icon={Clock} accentColor={CATEGORICAL_PALETTE[3]} />
              <KpiTile label="مدارک ناقص" value={countFor(insights, "needs_more_docs")} icon={Siren} accentColor={CATEGORICAL_PALETTE[1]} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* What share of the roster is actually serving a patient
                  right now (an active CaregiverAssignment), vs idle —
                  fixed status colors (green = on duty), not the
                  auto-assigned categorical palette, since this is a
                  true state indicator, not an arbitrary series. */}
              <DonutChart
                title="سهم مراقبان سرکار"
                data={insights.caregiver_on_duty_breakdown.map((i) => ({ label: i.label, value: i.count }))}
                colors={[STATUS_PALETTE.good, OTHER_BUCKET_COLOR]}
              />

              <DonutChart
                title="وضعیت مراقبان"
                data={insights.caregiver_status_breakdown.map((i) => ({ label: i.label, value: i.count }))}
              />

              <Card className="border-slate-200">
                <CardHeader><CardTitle className="text-sm text-slate-900">روند جذب (۸ هفته اخیر)</CardTitle></CardHeader>
                <CardContent>
                  <div dir="ltr" className="h-56 w-full">
                    <ResponsiveContainer>
                      <LineChart data={insights.weekly_growth_trend} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_CHROME.gridline} />
                        <XAxis dataKey="week_label" tick={{ fontSize: 10, fill: CHART_CHROME.mutedText }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_CHROME.mutedText }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="new_caregivers" name="مراقب جدید" stroke={CATEGORICAL_PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="px-1 text-sm font-semibold text-slate-900">ترکیب جمعیتی</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DonutChart
                title="ترکیب جنسیتی مراقبان"
                data={insights.caregiver_gender_breakdown.map((i) => ({ label: i.label, value: i.count }))}
              />

              <Card className="border-slate-200">
                <CardHeader><CardTitle className="text-sm text-slate-900">پراکندگی شهری مراقبان</CardTitle></CardHeader>
                <CardContent>
                  <div dir="ltr" className="h-56 w-full">
                    <ResponsiveContainer>
                      <BarChart
                        data={insights.caregiver_city_breakdown}
                        layout="vertical"
                        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_CHROME.gridline} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: CHART_CHROME.mutedText }} />
                        <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: CHART_CHROME.mutedText }} />
                        <Tooltip />
                        <Bar dataKey="count" fill={CATEGORICAL_PALETTE[0]} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
