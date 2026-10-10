"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar } from "lucide-react"
import { Select } from "@/components/ui/select"
import {
  JALALI_YEAR_RANGE, PERSIAN_MONTH_LIST, daysInJalaliMonth,
  formatJalaliDate, jalaliMonthName, parseJalaliDate,
} from "@/lib/jalali"

// Same outside-click/Escape-to-close behavior as date-range-filter.tsx's
// own — duplicated rather than imported, to keep this component a
// standalone drop-in with no cross-file dependency.
function useOutsideClick(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handler()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [ref, handler])
}

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
export function JalaliDatePicker({
  value, onChange, yearRange, dense,
}: {
  value: string
  onChange: (v: string) => void
  // Defaults to the birth-date-oriented JALALI_YEAR_RANGE (backward
  // compatible with every existing caller). Pass lib/jalali's
  // CONTRACT_JALALI_YEAR_RANGE (or any other list) for a forward-
  // looking date like a contract start/end.
  yearRange?: number[]
  // A narrow Kanban card (~230-270px) has no honest way to fit 3
  // full-size selects side by side — every attempt at shrinking
  // font/padding/the native arrow still clipped "روز"/"ماه"/"سال" and
  // 4-digit years, because the column itself is just too thin for 3
  // legible Persian dropdowns at once. `dense` instead renders a
  // small button showing the picked date (or a placeholder) that
  // opens a floating popover containing the SAME full-size 3-select
  // picker, unconstrained by the card's width.
  dense?: boolean
}) {
  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [day, setDay] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  useOutsideClick(popoverRef, () => setOpen(false))

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
  const years = yearRange ?? JALALI_YEAR_RANGE

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

  const selects = (
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
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </Select>
    </div>
  )

  if (!dense) return selects

  const display = year && month && day ? `${day} ${jalaliMonthName(month)} ${year}` : "انتخاب تاریخ"

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-full items-center justify-center gap-1 rounded-md border border-input bg-background px-1.5 text-[10px] text-slate-700 hover:bg-slate-50"
      >
        <Calendar className="h-2.5 w-2.5 shrink-0 text-slate-400" />
        <span className="min-w-0 truncate text-center">{display}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-[230px] rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {selects}
        </div>
      )}
    </div>
  )
}
