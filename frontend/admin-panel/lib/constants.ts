export type Choice = [string, string]

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

export const PATIENT_NOTE_CATEGORY_LABEL: Record<string, string> = {
  additional_needs: "نیازهای اضافی افشا نشده",
  safety_concern: "نگرانی ایمنی",
  family_behavior: "رفتار خانواده یا محیط",
  health_change: "تغییر وضعیت سلامت",
  general_observation: "مشاهده عمومی",
  other: "سایر",
}
