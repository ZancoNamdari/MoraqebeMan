"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { assignCategoricalColors, CATEGORICAL_PALETTE } from "@/lib/dashboard-palette"

export interface DonutChartDatum {
  label: string
  value: number
}

export interface DonutChartProps {
  data: DonutChartDatum[]
  title: string
  /** Override the auto-assigned categorical colors, in the same order as `data`. */
  colors?: string[]
}

// Matches insight-charts.tsx's empty-state convention.
function EmptyChartNote() {
  return <p className="py-10 text-center text-xs text-slate-400">داده‌ای موجود نیست</p>
}

function hasAnyValue(items: DonutChartDatum[]) {
  return items.some((i) => i.value > 0)
}

export function DonutChart({ data, title, colors }: DonutChartProps) {
  const isEmpty = data.length === 0 || !hasAnyValue(data)

  // Sort descending by value, then fold anything past the first 3-4 slots
  // into a gray "سایر" bucket — see assignCategoricalColors for why a
  // donut/pie caps at 4 categorical colors instead of using all 8.
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const withColors = colors
    ? sorted.map((item, idx) => ({ ...item, color: colors[idx % colors.length] }))
    : assignCategoricalColors(sorted, 4)

  const total = withColors.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-sm text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyChartNote />
        ) : (
          <div dir="ltr" className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="h-56 w-full sm:w-1/2">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={withColors}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="60%"
                    outerRadius="90%"
                    paddingAngle={2}
                  >
                    {withColors.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom legend: color swatch + label + value/percentage, per
                the dataviz rule that identity is never color-alone. */}
            <ul dir="rtl" className="flex w-full flex-col gap-2 sm:w-1/2">
              {withColors.map((entry, idx) => {
                const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
                return (
                  <li key={idx} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.label}
                    </span>
                    <span className="font-medium text-slate-900">
                      {entry.value} ({pct}%)
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Re-exported for consumers that want the raw palette without going
// through the auto-assignment (e.g. to color a legend elsewhere).
export { CATEGORICAL_PALETTE }
