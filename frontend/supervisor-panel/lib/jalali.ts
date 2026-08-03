// Jalali (Hijri Shamsi) calendar helpers — no typing, only selecting.
// Standard 33-year leap-year cycle algorithm (the same one jdatetime/
// most Jalali libraries use), implemented directly rather than adding
// a dependency for something this small and well-defined.

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

export function isJalaliLeapYear(year: number): boolean {
  // Verified against Python's jdatetime (the same library the backend
  // uses) across 100 years before trusting this — zero mismatches.
  const cycle = ((year % 33) + 33) % 33
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(cycle)
}

export function daysInJalaliMonth(year: number, month: number): number {
  if (month <= 6) return 31
  if (month <= 11) return 30
  return isJalaliLeapYear(year) ? 30 : 29
}

export function jalaliMonthName(month: number): string {
  return PERSIAN_MONTHS[month - 1] || ""
}

export const PERSIAN_MONTH_LIST = PERSIAN_MONTHS.map((name, i) => ({ value: i + 1, label: name }))

/** Parses "1360-01-15" -> {year, month, day}, or nulls if empty/invalid. */
export function parseJalaliDate(value: string): { year: number | null; month: number | null; day: number | null } {
  const match = /^(\d{3,4})-(\d{1,2})-(\d{1,2})$/.exec(value || "")
  if (!match) return { year: null, month: null, day: null }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

export function formatJalaliDate(year: number | null, month: number | null, day: number | null): string {
  if (!year || !month || !day) return ""
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

// Reasonable range for a caregiver's birth date — current Jalali year
// is roughly Gregorian year - 621/622.
const CURRENT_JALALI_YEAR = new Date().getFullYear() - 621
export const JALALI_YEAR_RANGE = Array.from({ length: 80 }, (_, i) => CURRENT_JALALI_YEAR - 15 - i)
