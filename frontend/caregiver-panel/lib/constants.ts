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
