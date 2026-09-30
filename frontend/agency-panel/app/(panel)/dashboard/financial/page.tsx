"use client"

import { useEffect, useState } from "react"
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { Banknote, FileText, TrendingUp, Wallet } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs } from "@/components/ui/tabs"
import { KpiTile } from "@/components/dashboard/kpi-tile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { agencyService } from "@/services/agency.service"
import { financeService } from "@/services/finance.service"
import { CATEGORICAL_PALETTE, CHART_CHROME } from "@/lib/dashboard-palette"
import type { CaregiverPerformanceRow, FinanceOverview, StaffPerformanceRow } from "@/types/finance"

const TABS = [
  { value: "trend", label: "روند مالی" },
  { value: "performance", label: "عملکرد پرسنل و مراقبان" },
]

function formatToman(value: number) {
  return `${value.toLocaleString("fa-IR")} تومان`
}

export default function FinancialDashboardPage() {
  const { loading: authLoading } = useAuth(["agency", "agency_supervisor"])
  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [overview, setOverview] = useState<FinanceOverview | null>(null)
  const [caregiverRows, setCaregiverRows] = useState<CaregiverPerformanceRow[]>([])
  const [staffRows, setStaffRows] = useState<StaffPerformanceRow[]>([])
  const [tab, setTab] = useState("trend")

  useEffect(() => {
    agencyService.me().then((profile) => setAgencyId(profile.id))
  }, [])

  useEffect(() => {
    if (agencyId === null) return
    financeService.overview(agencyId, "weekly").then(setOverview)
    financeService.caregiverPerformance(agencyId).then(setCaregiverRows)
    financeService.staffPerformance(agencyId).then(setStaffRows)
  }, [agencyId])

  if (authLoading) return null

  const topCaregivers = [...caregiverRows].sort((a, b) => b.billed - a.billed).slice(0, 8)

  return (
    <div className="p-4 sm:p-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">داشبورد مالی</h1>
          <p className="text-xs text-slate-500">نمای تحلیلی درآمد و مطالبات آژانس</p>
        </div>
        <Tabs value={tab} onValueChange={setTab} tabs={TABS} />
      </div>

      {!overview ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : tab === "trend" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiTile label="مجموع صورت‌حساب‌ها" value={formatToman(overview.total_billed)} icon={FileText} accentColor={CATEGORICAL_PALETTE[0]} />
            <KpiTile label="مجموع دریافتی" value={formatToman(overview.total_paid)} icon={Wallet} accentColor={CATEGORICAL_PALETTE[2]} />
            <KpiTile label="مانده مطالبات" value={formatToman(overview.total_outstanding)} icon={Banknote} accentColor={CATEGORICAL_PALETTE[1]} />
            <KpiTile label="تعداد صورت‌حساب" value={overview.invoice_count} icon={TrendingUp} accentColor={CATEGORICAL_PALETTE[6]} />
          </div>

          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-sm text-slate-900">روند صورت‌حساب و دریافتی (هفتگی)</CardTitle></CardHeader>
            <CardContent>
              <div dir="ltr" className="h-64 w-full">
                <ResponsiveContainer>
                  <LineChart data={overview.series} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_CHROME.gridline} />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: CHART_CHROME.mutedText }} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_CHROME.mutedText }} />
                    <Tooltip formatter={(value) => formatToman(Number(value))} />
                    <Legend
                      formatter={(value) => (value === "billed" ? "صورت‌حساب‌شده" : "دریافت‌شده")}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <Line type="monotone" dataKey="billed" stroke={CATEGORICAL_PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="paid" stroke={CATEGORICAL_PALETTE[2]} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-sm text-slate-900">پردرآمدترین مراقبان</CardTitle></CardHeader>
            <CardContent>
              {topCaregivers.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">داده‌ای موجود نیست</p>
              ) : (
                <div dir="ltr" className="h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart
                      data={topCaregivers}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_CHROME.gridline} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: CHART_CHROME.mutedText }} />
                      <YAxis type="category" dataKey="caregiver_name" width={110} tick={{ fontSize: 11, fill: CHART_CHROME.mutedText }} />
                      <Tooltip formatter={(value) => formatToman(Number(value))} />
                      <Bar dataKey="billed" fill={CATEGORICAL_PALETTE[0]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-sm text-slate-900">عملکرد مالی پرسنل</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {staffRows.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">داده‌ای موجود نیست</p>
              ) : (
                <table className="w-full min-w-[480px] text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 font-medium">نام</th>
                      <th className="py-2 font-medium">تعداد بیماران</th>
                      <th className="py-2 font-medium">صورت‌حساب‌شده</th>
                      <th className="py-2 font-medium">دریافت‌شده</th>
                      <th className="py-2 font-medium">مانده</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffRows.map((row) => (
                      <tr key={row.staff_user_id ?? row.staff_name} className="border-b border-slate-100">
                        <td className="py-2 font-medium text-slate-900">{row.staff_name}</td>
                        <td className="py-2 text-slate-700">{row.patient_count}</td>
                        <td className="py-2 text-slate-700">{formatToman(row.billed)}</td>
                        <td className="py-2 text-slate-700">{formatToman(row.paid)}</td>
                        <td className="py-2 text-slate-700">{formatToman(row.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
