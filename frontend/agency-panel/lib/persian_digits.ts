const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]

/**
 * Converts Western digits (0-9) in a string or number to Persian
 * digits (۰-۹) for display. Deliberately NOT applied to phone numbers
 * or national IDs — those stay in Western digits, matching common
 * practice in Persian production software, since they're values a
 * person might copy into a dialer or another system that expects
 * Western digits. Apply this to counts, percentages, scores, and
 * dates shown to the user, not to values they might need to reuse
 * elsewhere.
 */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])
}
