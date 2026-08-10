// Maps backend field names to their Persian labels, so a validation
// error like {"full_name": ["این فیلد الزامی است."]} can be shown as
// "نام کامل: این فیلد الزامی است." — pointing at exactly which field
// is wrong, not just a generic "something failed."
export const FIELD_LABELS: Record<string, string> = {
  full_name: "نام کامل سالمند", father_name: "نام پدر", birth_date: "تاریخ تولد",
  national_id: "شماره ملی", birth_certificate_number: "شماره شناسنامه",
  birth_certificate_issue_place: "محل صدور شناسنامه",
  full_address: "نشانی", province: "استان", city: "شهر", district: "منطقه",
  postal_code: "کد پستی", emergency_contact_phone: "شماره تماس اضطراری",
  guardianship_status: "وضعیت سرپرستی", guardian_details: "اطلاعات وصی/قیم",
  language_dialect: "زبان و گویش", basic_medical_info: "اطلاعات پزشکی پایه",
  phone_number: "شماره موبایل", relation: "نسبت", is_primary_contact: "مخاطب اصلی",
  first_name: "نام", last_name: "نام خانوادگی", password: "رمز عبور", email: "ایمیل",
  display_name: "نام نمایشی", detail: "خطا",
}

export function labelFor(field: string): string {
  return FIELD_LABELS[field] || field
}

export interface ApiFieldError {
  field: string
  messages: string[]
}

export function errorsByField(errors: ApiFieldError[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const e of errors) out[e.field] = e.messages.join(" — ")
  return out
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
      out.push({ field, messages: [JSON.stringify(value)] })
    }
  }
  return out
}
