export type Choice = [string, string]

export const CARE_LOG_CATEGORY: Choice[] = [
  ["general", "یادداشت عمومی"],
  ["medication", "دارو"],
  ["meal", "تغذیه"],
  ["mobility", "تحرک و جابجایی"],
  ["vitals", "علائم حیاتی"],
  ["incident", "حادثه یا نگرانی"],
]

export const CARE_LOG_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CARE_LOG_CATEGORY)
export const CARE_LOG_CATEGORY_ICON: Record<string, string> = {
  general: "📝", medication: "💊", meal: "🍽️", mobility: "🚶", vitals: "❤️", incident: "⚠️",
}

/** Gender-appropriate avatar for a caregiver or an elderly patient —
 * distinct pairs for each, not the same icon reused for both roles.
 * Falls back to a neutral icon when gender isn't recorded yet. */
export function caregiverAvatar(gender: string | null | undefined): string {
  if (gender === "male") return "👨‍⚕️"
  if (gender === "female") return "👩‍⚕️"
  return "🧑‍⚕️"
}

export function patientAvatar(gender: string | null | undefined): string {
  if (gender === "male") return "👴"
  if (gender === "female") return "👵"
  return "🧓"
}
