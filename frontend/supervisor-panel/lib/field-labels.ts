// Maps backend field names to their Persian labels, so a validation
// error like {"father_name": ["این فیلد الزامی است."]} can be shown as
// "نام پدر: این فیلد الزامی است." — pointing at exactly which field is
// wrong, not just a generic "something failed."
export const FIELD_LABELS: Record<string, string> = {
  // Step 0
  first_name: "نام", last_name: "نام خانوادگی", phone_number: "شماره موبایل",
  // Identity (Form 1)
  father_name: "نام پدر", birth_certificate_number: "شماره شناسنامه",
  birth_certificate_issue_place: "محل صدور شناسنامه", birth_date: "تاریخ تولد",
  gender: "جنسیت", marital_status: "وضعیت تأهل", children_count: "تعداد فرزندان",
  military_status: "وضعیت نظام وظیفه", height_range: "قد", weight_range: "وزن",
  ethnicities: "قومیت / زبان مادری", has_chronic_disease: "بیماری زمینه‌ای",
  chronic_disease_types: "نوع بیماری", takes_permanent_medication: "داروی دائمی",
  medication_types: "نوع دارو", emergency_contact_phone: "شماره تماس اضطراری",
  emergency_contact_relation: "نسبت فرد اضطراری", landline_phone: "تلفن ثابت",
  province: "استان", city: "شهر", district: "منطقه", postal_code: "کد پستی",
  full_address: "نشانی کامل",
  // Work preferences (Form 2)
  collaboration_types: "نوع همکاری", work_status: "وضعیت کاری",
  family_presence_preference: "حضور خانواده", accepted_gender: "جنسیت قابل قبول",
  accepted_age_ranges: "بازه سنی", offered_services: "خدمات قابل ارائه",
  accepted_physical_conditions: "شرایط جسمانی", lifting_capacity: "توانایی جابجایی",
  service_locations: "محل ارائه خدمت", available_days: "روزهای کاری",
  available_shifts: "شیفت‌های کاری", terms_accepted: "پذیرش قوانین",
  // Experience / skills (Form 3)
  elderly_care_experience: "سابقه مراقبت سالمند", education_level: "سطح تحصیلات",
  // References (Form 4)
  full_name: "نام و نام خانوادگی", occupation: "شغل معرف", relation_type: "نوع ارتباط",
  references: "معرف‌ها",
  detail: "خطا",
}

export function labelFor(field: string): string {
  return FIELD_LABELS[field] || field
}

export interface ApiFieldError {
  field: string
  messages: string[]
}

/** Parses a DRF validation-error response body into a flat, labeled list. */
export function parseApiErrors(data: unknown): ApiFieldError[] {
  if (!data || typeof data !== "object") return []
  const out: ApiFieldError[] = []
  for (const [field, value] of Object.entries(data as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out.push({ field, messages: value.map(String) })
    } else if (typeof value === "string") {
      out.push({ field, messages: [value] })
    } else if (value && typeof value === "object") {
      // nested (e.g. references: [{full_name: [...]}, ...])
      out.push({ field, messages: [JSON.stringify(value)] })
    }
  }
  return out
}
