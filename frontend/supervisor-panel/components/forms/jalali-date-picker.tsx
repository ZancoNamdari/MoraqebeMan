"use client"

import { Select } from "@/components/ui/select"
import {
  JALALI_YEAR_RANGE, PERSIAN_MONTH_LIST, daysInJalaliMonth,
  formatJalaliDate, parseJalaliDate,
} from "@/lib/jalali"

/**
 * Three dropdowns (year/month/day) instead of a "1360-01-15"-style
 * text field — replaces typing with clicking, and makes an invalid
 * date (e.g. Esfand 30 in a non-leap year) impossible to select in
 * the first place rather than something the backend has to reject.
 */
export function JalaliDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { year, month, day } = parseJalaliDate(value)
  const maxDay = year && month ? daysInJalaliMonth(year, month) : 31
  const dayList = Array.from({ length: maxDay }, (_, i) => i + 1)

  function update(next: { year?: number | null; month?: number | null; day?: number | null }) {
    const y = next.year !== undefined ? next.year : year
    const m = next.month !== undefined ? next.month : month
    let d = next.day !== undefined ? next.day : day
    if (y && m && d && d > daysInJalaliMonth(y, m)) d = daysInJalaliMonth(y, m)
    onChange(formatJalaliDate(y, m, d))
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={day ?? ""} onChange={(e) => update({ day: e.target.value ? Number(e.target.value) : null })}>
        <option value="">روز</option>
        {dayList.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </Select>
      <Select value={month ?? ""} onChange={(e) => update({ month: e.target.value ? Number(e.target.value) : null })}>
        <option value="">ماه</option>
        {PERSIAN_MONTH_LIST.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </Select>
      <Select value={year ?? ""} onChange={(e) => update({ year: e.target.value ? Number(e.target.value) : null })}>
        <option value="">سال</option>
        {JALALI_YEAR_RANGE.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </Select>
    </div>
  )
}
