const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]

/**
 * Converts Western digits (0-9) in a string or number to Persian
 * digits (۰-۹) for display — applied broadly across this panel
 * (counts, percentages, scores, dates, phone numbers, national IDs)
 * per explicit product direction. An earlier version of this utility
 * deliberately excluded phone numbers and national IDs, matching a
 * common convention in Persian software of keeping copyable/dialable
 * values in Western digits — that exclusion was removed after direct
 * feedback that consistency across the whole panel matters more here.
 */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])
}
