"use client"

import { useEffect, useState } from "react"
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { GraduationCap, ShieldCheck, UserCog, Users } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs } from "@/components/ui/tabs"
import { KpiTile } from "@/components/dashboard/kpi-tile"
import { DonutChart } from "@/components/dashboard/donut-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { agencyService } from "@/services/agency.service"
import { CATEGORICAL_PALETTE, CHART_CHROME } from "@/lib/dashboard-palette"
import type { StaffDashboardData } from "@/types/dashboard"

const TABS = [
  { value: "overview", label: "نمای کلی" },
  { value: "demographics", label: "ترکیب جمعیتی" },
]

function countFor(data: StaffDashboardData, role: string) {
  return data.by_role.find((i) => i.role === role)?.count ?? 0
}

export default function StaffDashboardPage() {
  const { loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const [data, setData] = useState<StaffDashboardData | null>(null)
  const [tab, setTab] = useState("overview")

  useEffect(() => {
    agencyService.staffDashboard().then(setData)
  }, [])

  if (authLoading) return null

  return (
    <div className="p-4 sm:p-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">داشبورد پرسنل</h1>
          <p className="text-xs text-slate-500">نمای تحلیلی سوپروایزرها و ادمین‌های آژانس</p>
        </div>
        <Tabs value={tab} onValueChange={setTab} tabs={TABS} />
      </div>

      {!data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiTile label="کل پرسنل" value={data.total_staff} icon={Users} accentColor={CATEGORICAL_PALETTE[0]} />
            <KpiTile label="سوپروایزر" value={countFor(data, "supervisor")} icon={UserCog} accentColor={CATEGORICAL_PALETTE[2]} />
            <KpiTile label="ادمین" value={countFor(data, "admin")} icon={ShieldCheck} accentColor={CATEGORICAL_PALETTE[1]} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DonutChart
              title="ترکیب نقش‌ها"
              data={data.by_role.map((i) => ({ label: i.label, value: i.count }))}
            />

            <Card className="border-slate-200">
              <CardHeader><CardTitle className="text-sm text-slate-900">روند افزایش پرسنل (۸ هفته اخیر)</CardTitle></CardHeader>
              <CardContent>
                <div dir="ltr" className="h-56 w-full">
                  <ResponsiveContainer>
                    <LineChart data={data.weekly_trend} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_CHROME.gridline} />
                      <XAxis dataKey="week_label" tick={{ fontSize: 10, fill: CHART_CHROME.mutedText }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_CHROME.mutedText }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="new_staff" name="پرسنل جدید" stroke={CATEGORICAL_PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DonutChart
            title="ترکیب جنسیتی"
            data={data.by_gender.map((i) => ({ label: i.label, value: i.count }))}
          />

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-sm text-slate-900">
                <GraduationCap className="h-4 w-4" /> مدرک تحصیلی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div dir="ltr" className="h-56 w-full">
                <ResponsiveContainer>
                  <BarChart data={data.by_education} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_CHROME.gridline} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART_CHROME.mutedText }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_CHROME.mutedText }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={CATEGORICAL_PALETTE[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 lg:col-span-2">
            <CardHeader><CardTitle className="text-sm text-slate-900">پراکندگی شهری پرسنل</CardTitle></CardHeader>
            <CardContent>
              <div dir="ltr" className="h-56 w-full">
                <ResponsiveContainer>
                  <BarChart
                    data={data.by_city}
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
      )}
    </div>
  )
}
