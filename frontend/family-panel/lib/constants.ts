export type Choice = [string, string]

export const AGREEMENT_SCALE: Choice[] = [
  ["strongly_agree", "کاملاً موافقم"],
  ["somewhat_agree", "تاحدی موافق"],
  ["somewhat_disagree", "تاحدی مخالف"],
  ["strongly_disagree", "کاملاً مخالف"],
]

export const INTENSITY_SCALE: Choice[] = [
  ["very_high", "خیلی زیاد"],
  ["moderate", "نسبتاً"],
  ["low", "کم"],
  ["none", "اصلاً"],
]

export const YES_NO_PARTIAL: Choice[] = [
  ["yes", "بله"],
  ["no", "خیر"],
  ["partially", "تاحدی"],
]

export const ACCEPTANCE_SCALE: Choice[] = [
  ["fully_accept", "کاملاً می‌پذیرم"],
  ["mostly_accept", "نسبتاً می‌پذیرم"],
  ["reluctantly_accept", "به سختی می‌پذیرم"],
  ["reject", "قطعاً رد می‌کنم"],
]

export const DISTURBANCE_SCALE: Choice[] = [
  ["not_at_all", "اصلاً"],
  ["slightly", "کمی"],
  ["a_lot", "زیاد"],
  ["very_much", "خیلی زیاد"],
]

export const GUARDIANSHIP_STATUS: Choice[] = [
  ["none", "ندارد"],
  ["legal_guardian", "قیم قانونی دارد"],
  ["trustee", "وصی دارد"],
]

// Which scale each questionnaire question uses — mirrors the exact
// field -> TextChoices mapping in apps/families/models.py. Three
// (marked below) are backend placeholders still awaiting real product
// confirmation of their actual option text.
export const QUESTIONNAIRE_FIELDS: { name: string; label: string; scale: Choice[]; axis: string; placeholder?: boolean }[] = [
  { name: "religious_beliefs_priority", label: "اهمیت باورهای دینی", scale: AGREEMENT_SCALE, axis: "محور عقیدتی-مناسکی" },
  { name: "new_treatment_openness", label: "باز بودن به درمان جدید", scale: INTENSITY_SCALE, axis: "محور عقیدتی-مناسکی" },
  { name: "caregiver_as_family_member", label: "مراقب به عنوان عضو خانواده", scale: YES_NO_PARTIAL, axis: "محور جمع‌گرایی" },
  { name: "respectful_disagreement_acceptance", label: "پذیرش نظرات مخالف با احترام", scale: ACCEPTANCE_SCALE, axis: "محور جمع‌گرایی" },
  { name: "privacy_comfort_with_caregiver", label: "راحتی در حضور مراقب", scale: YES_NO_PARTIAL, axis: "محور حریم خصوصی" },
  { name: "noise_smell_sensitivity", label: "حساسیت به صدا و بو", scale: INTENSITY_SCALE, axis: "محور سبک زندگی" },
  { name: "meal_time_strictness", label: "سختی در رعایت زمان وعده غذایی", scale: INTENSITY_SCALE, axis: "محور سبک زندگی", placeholder: true },
  { name: "special_diet_preference", label: "ترجیح داشتن رژیم خاص", scale: YES_NO_PARTIAL, axis: "محور سبک زندگی" },
  { name: "medication_timing_priority", label: "اهمیت زمان‌بندی داروها", scale: INTENSITY_SCALE, axis: "محور جهت‌گیری زمانی", placeholder: true },
  { name: "accent_customs_annoyance", label: "آزردگی از لهجه یا رسوم متفاوت مراقب", scale: DISTURBANCE_SCALE, axis: "محور تفاوت فرهنگی/نسلی" },
  { name: "cultural_respect_expectation", label: "انتظار احترام فرهنگی", scale: YES_NO_PARTIAL, axis: "محور تفاوت فرهنگی/نسلی" },
  { name: "willingness_to_express_opinion", label: "تمایل به ابراز نظر", scale: INTENSITY_SCALE, axis: "محور انعطاف‌پذیری کلی", placeholder: true },
]

export function labelForValue(choices: Choice[], value: string | null | undefined): string {
  if (!value) return "—"
  return choices.find(([v]) => v === value)?.[1] || value
}

export const CARE_LOG_CATEGORY_LABEL: Record<string, string> = {
  general: "یادداشت عمومی", medication: "دارو", meal: "تغذیه",
  mobility: "تحرک و جابجایی", vitals: "علائم حیاتی", incident: "حادثه یا نگرانی",
}

export const CARE_LOG_CATEGORY_ICON: Record<string, string> = {
  general: "📝", medication: "💊", meal: "🍽️", mobility: "🚶", vitals: "❤️", incident: "⚠️",
}

export const RELATION_TYPE: Choice[] = [
  ["child", "فرزند"],
  ["spouse", "همسر"],
  ["father", "پدر"],
  ["mother", "مادر"],
  ["sibling", "خواهر / برادر"],
  ["grandchild", "نوه"],
  ["other", "سایر"],
]

export const LANGUAGE_DIALECT: Choice[] = [
  ["fa", "فارسی"],
  ["az", "ترکی آذربایجانی"],
  ["ku", "کردی"],
  ["lr", "لری"],
  ["gl", "گیلکی"],
  ["mz", "مازندرانی"],
  ["ar", "عربی"],
  ["bl", "بلوچی"],
]
