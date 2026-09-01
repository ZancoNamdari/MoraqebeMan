export type Choice = [string, string]

// Mirrors apps.families.models.PatientPhysicalCondition / NeededShift
// / RelationType on the backend exactly — same duplication convention
// used across every panel in this project (see family-panel's own
// lib/constants.ts for the identical pattern and reasoning).
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

export const RELATION_TYPE: Choice[] = [
  ["child", "فرزند"],
  ["spouse", "همسر"],
  ["father", "پدر"],
  ["mother", "مادر"],
  ["sibling", "خواهر / برادر"],
  ["grandchild", "نوه"],
  ["other", "سایر"],
]

export const GENDER: Choice[] = [
  ["female", "زن"],
  ["male", "مرد"],
]

export const COMPLAINT_CATEGORY_LABEL: Record<string, string> = {
  service_quality: "کیفیت خدمات",
  behavior: "رفتار نامناسب",
  punctuality: "عدم رعایت زمان‌بندی",
  safety_concern: "نگرانی ایمنی",
  financial: "مسائل مالی",
  communication: "مشکل ارتباطی",
  other: "سایر",
}

export const COMPLAINT_STATUS_LABEL: Record<string, string> = {
  open: "باز",
  under_review: "در حال بررسی",
  resolved: "حل‌شده",
  dismissed: "رد شده",
}

export function labelForValue(choices: Choice[], value: string): string {
  return choices.find(([v]) => v === value)?.[1] || value
}
