"use client"

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardInsights } from "@/types/dashboard"

// Kept in one small file rather than one component per chart — these
// four charts share the same data source (one API call) and the same
// "empty state" shape, and splitting them into separate files would
// only add indirection for four ~20-line chart blocks.

const STATUS_COLORS: Record<string, string> = {
  approved: "#16a34a",
  pending: "#f59e0b",
  needs_more_docs: "#ea580c",
  rejected: "#dc2626",
  suspended: "#64748b",
  draft: "#94a3b8",
}

function EmptyChartNote() {
  return <p className="py-10 text-center text-xs text-slate-400">داده‌ای برای نمایش وجود ندارد.</p>
}

function hasAnyCount(items: { count: number }[]) {
  return items.some((i) => i.count > 0)
}

export function InsightCharts({ insights }: { insights: DashboardInsights }) {
  const caregiverData = insights.caregiver_status_breakdown
  const pipelineData = insights.patient_pipeline_breakdown.filter((i) => i.count > 0 || true)
  const complaintsData = insights.complaints_by_category
  const trendData = insights.weekly_growth_trend

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" dir="rtl">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm text-slate-900">
            وضعیت مراقبان (کل: {insights.caregiver_total_count})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnyCount(caregiverData) ? (
            <EmptyChartNote />
          ) : (
            <div dir="ltr" className="h-56 w-full">
              <ResponsiveContainer>
                <BarChart data={caregiverData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {caregiverData.map((entry, idx) => (
                      <Cell key={idx} fill={STATUS_COLORS[entry.status ?? ""] ?? "#2563eb"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm text-slate-900">مراحل سرویس‌دهی سالمندها</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnyCount(pipelineData) ? (
            <EmptyChartNote />
          ) : (
            <div dir="ltr" className="h-56 w-full">
              <ResponsiveContainer>
                <BarChart data={pipelineData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm text-slate-900">شکایات ثبت‌شده بر اساس نوع</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnyCount(complaintsData) ? (
            <EmptyChartNote />
          ) : (
            <div dir="ltr" className="h-56 w-full">
              <ResponsiveContainer>
                <BarChart data={complaintsData} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#dc2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm text-slate-900">روند عضوگیری (۸ هفته اخیر)</CardTitle>
        </CardHeader>
        <CardContent>
          <div dir="ltr" className="h-56 w-full">
            <ResponsiveContainer>
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week_label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend
                  formatter={(value) => (value === "new_families" ? "خانواده جدید" : "مراقب جدید")}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Line type="monotone" dataKey="new_families" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="new_caregivers" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
