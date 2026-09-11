"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

// Actual hex values, not Tailwind class names — recharts renders SVG
// fill attributes directly and can't resolve Tailwind's utility
// classes, so these are pulled to visually match the same amber/
// emerald/rose/gray already used for the STATUS_CLASS badges
// elsewhere on this page, keeping the chart and the badges in sync.
const STATUS_COLORS: Record<string, string> = {
  "در انتظار بررسی": "#F59E0B",
  "تأییدشده": "#10B981",
  "رد شده": "#F43F5E",
  "مسدود شده": "#DC2626",
  "پیش‌نویس": "#9CA3AF",
}

export function CaregiverStatusChart({
  data,
}: {
  data: { name: string; value: number }[]
}) {
  const nonZero = data.filter((d) => d.value > 0)

  if (nonZero.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        هنوز داده‌ای برای نمایش نمودار وجود ندارد.
      </div>
    )
  }

  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={nonZero}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
          >
            {nonZero.map((entry) => (
              <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#9CA3AF"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ direction: "rtl", fontFamily: "inherit", borderRadius: 8 }}
          />
          <Legend
            formatter={(value) => <span style={{ fontFamily: "inherit" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
