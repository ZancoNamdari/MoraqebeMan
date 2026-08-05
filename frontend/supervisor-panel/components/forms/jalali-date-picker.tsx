"use client"

import { useEffect, useState } from "react"
import { Select } from "@/components/ui/select"
import {
  JALALI_YEAR_RANGE, PERSIAN_MONTH_LIST, daysInJalaliMonth,
  formatJalaliDate, parseJalaliDate,
} from "@/lib/jalali"

/**
 * Three dropdowns (year/month/day) instead of a "1360-01-15"-style
 * text field.
 *
 * Keeps its OWN state for year/month/day rather than deriving purely
 * from the `value` prop on every render. This matters because the
 * parent only ever stores a fully-formatted date string — and
 * formatJalaliDate() returns "" until all three parts are set. A
 * version that derives its displayed selection straight from the
 * (still-empty) parent value would visually reset the dropdown the
 * instant a supervisor picked just the day, before month/year were
 * also chosen — which is exactly what was happening. Internal state
 * remembers each partial pick; the parent is still told about every
 * change (including partial, empty-string ones), it just isn't the
 * single source of truth for what's currently selected.
 */
export function JalaliDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [day, setDay] = useState<number | null>(null)

  // Sync in from the parent once (mount, or when a caregiver's
  // existing data loads asynchronously after mount during "resume") —
  // not on every render, or a parent round-tripping "" during partial
  // entry would immediately fight the state above right back to null.
  useEffect(() => {
    const parsed = parseJalaliDate(value)
    if (parsed.year && parsed.month && parsed.day) {
      setYear(parsed.year)
      setMonth(parsed.month)
      setDay(parsed.day)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const maxDay = year && month ? daysInJalaliMonth(year, month) : 31
  const dayList = Array.from({ length: maxDay }, (_, i) => i + 1)

  function handleDayChange(v: string) {
    const d = v ? Number(v) : null
    setDay(d)
    onChange(formatJalaliDate(year, month, d))
  }

  function handleMonthChange(v: string) {
    const m = v ? Number(v) : null
    let d = day
    if (m && d && d > daysInJalaliMonth(year ?? 1300, m)) d = daysInJalaliMonth(year ?? 1300, m)
    setMonth(m)
    setDay(d)
    onChange(formatJalaliDate(year, m, d))
  }

  function handleYearChange(v: string) {
    const y = v ? Number(v) : null
    let d = day
    if (y && month && d && d > daysInJalaliMonth(y, month)) d = daysInJalaliMonth(y, month)
    setYear(y)
    setDay(d)
    onChange(formatJalaliDate(y, month, d))
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select value={day ?? ""} onChange={(e) => handleDayChange(e.target.value)}>
        <option value="">روز</option>
        {dayList.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </Select>
      <Select value={month ?? ""} onChange={(e) => handleMonthChange(e.target.value)}>
        <option value="">ماه</option>
        {PERSIAN_MONTH_LIST.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </Select>
      <Select value={year ?? ""} onChange={(e) => handleYearChange(e.target.value)}>
        <option value="">سال</option>
        {JALALI_YEAR_RANGE.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </Select>
    </div>
  )
}
