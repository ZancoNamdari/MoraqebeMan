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

// Resolved 2026-08-23 — real option text for meal_time_strictness and
// medication_timing_priority (previously both sat on the generic
// INTENSITY_SCALE as an unconfirmed placeholder). See docs/MATCHING.md.
export const TIMING_STRICTNESS_SCALE: Choice[] = [
  ["very_strict", "بسیار مهم است و باید دقیقاً رعایت شود"],
  ["moderately_strict", "نسبتاً مهم است، کمی تأخیر قابل قبول است"],
  ["flexible", "چندان مهم نیست، انعطاف‌پذیر است"],
  ["not_important", "اهمیتی ندارد"],
]

// Resolved 2026-08-23 — real option text for
// willingness_to_express_opinion (previously on the generic
// INTENSITY_SCALE placeholder). See docs/MATCHING.md.
export const EXPRESSION_WILLINGNESS_SCALE: Choice[] = [
  ["very_willing", "همیشه نظر خود را بیان می‌کند"],
  ["somewhat_willing", "بیشتر مواقع نظر خود را می‌گوید"],
  ["rarely_willing", "به‌ندرت نظر خود را بیان می‌کند"],
  ["not_willing", "تمایلی به بیان نظر ندارد"],
]

export const GUARDIANSHIP_STATUS: Choice[] = [
  ["none", "ندارد"],
  ["legal_guardian", "قیم قانونی دارد"],
  ["trustee", "وصی دارد"],
]

// Which scale each questionnaire question uses — mirrors the exact
// field -> TextChoices mapping in apps/families/models.py.
export const QUESTIONNAIRE_FIELDS: { name: string; label: string; scale: Choice[]; axis: string; placeholder?: boolean }[] = [
  { name: "religious_beliefs_priority", label: "اهمیت باورهای دینی", scale: AGREEMENT_SCALE, axis: "محور عقیدتی-مناسکی" },
  { name: "new_treatment_openness", label: "باز بودن به درمان جدید", scale: INTENSITY_SCALE, axis: "محور عقیدتی-مناسکی" },
  { name: "caregiver_as_family_member", label: "مراقب به عنوان عضو خانواده", scale: YES_NO_PARTIAL, axis: "محور جمع‌گرایی" },
  { name: "respectful_disagreement_acceptance", label: "پذیرش نظرات مخالف با احترام", scale: ACCEPTANCE_SCALE, axis: "محور جمع‌گرایی" },
  { name: "privacy_comfort_with_caregiver", label: "راحتی در حضور مراقب", scale: YES_NO_PARTIAL, axis: "محور حریم خصوصی" },
  { name: "noise_smell_sensitivity", label: "حساسیت به صدا و بو", scale: INTENSITY_SCALE, axis: "محور سبک زندگی" },
  { name: "meal_time_strictness", label: "سختی در رعایت زمان وعده غذایی", scale: TIMING_STRICTNESS_SCALE, axis: "محور سبک زندگی" },
  { name: "special_diet_preference", label: "ترجیح داشتن رژیم خاص", scale: YES_NO_PARTIAL, axis: "محور سبک زندگی" },
  { name: "medication_timing_priority", label: "اهمیت زمان‌بندی داروها", scale: TIMING_STRICTNESS_SCALE, axis: "محور جهت‌گیری زمانی" },
  { name: "accent_customs_annoyance", label: "آزردگی از لهجه یا رسوم متفاوت مراقب", scale: DISTURBANCE_SCALE, axis: "محور تفاوت فرهنگی/نسلی" },
  { name: "cultural_respect_expectation", label: "انتظار احترام فرهنگی", scale: YES_NO_PARTIAL, axis: "محور تفاوت فرهنگی/نسلی" },
  { name: "willingness_to_express_opinion", label: "آمادگی برای بیان نظر", scale: EXPRESSION_WILLINGNESS_SCALE, axis: "محور انعطاف‌پذیری کلی" },
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

export const GENDER: Choice[] = [
  ["female", "زن"],
  ["male", "مرد"],
]

// Mirrors apps.families.models.PatientPhysicalCondition /
// NeededShift on the backend exactly — same duplication convention
// as GENDER above (families and caregivers don't share choice
// modules), chosen specifically so these values line up 1:1 with
// the caregiver's own accepted_physical_conditions/available_shifts
// for the matching tie-breaker (see docs/MATCHING.md).
export const PHYSICAL_CONDITION: Choice[] = [
  ["independent", "سالمند مستقل"],
  ["low_mobility", "سالمند کم‌توان (همراهی در راه رفتن)"],
  ["limited_mobility_bedridden", "سالمند دارای محدودیت حرکتی (روی تخت)"],
  ["bedridden_diaper", "سالمند بستری در منزل (پوشکی)"],
  ["alzheimers", "سالمند مبتلا به آلزایمر"],
  ["parkinsons", "سالمند مبتلا به پارکینسون"],
  ["hospital_companion_needed", "سالمند نیازمند همراهی بیمارستانی"],
]

export const NEEDED_SHIFT: Choice[] = [
  ["morning", "صبح"],
  ["afternoon", "عصر"],
  ["night", "شب"],
  ["24h", "شبانه‌روزی"],
]

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

export const COMPLAINT_CATEGORY: Choice[] = [
  ["service_quality", "کیفیت خدمات"],
  ["behavior", "رفتار نامناسب"],
  ["punctuality", "عدم رعایت زمان‌بندی"],
  ["safety_concern", "نگرانی ایمنی"],
  ["financial", "مسائل مالی"],
  ["communication", "مشکل ارتباطی"],
  ["other", "سایر"],
]

export const COMPLAINT_STATUS_LABEL: Record<string, string> = {
  open: "باز",
  under_review: "در حال بررسی",
  resolved: "حل‌شده",
  dismissed: "رد شده",
}
