export const FIELD_LABELS: Record<string, string> = {
  full_name: "نام کامل", father_name: "نام پدر", birth_date: "تاریخ تولد",
  national_id: "شماره ملی", birth_certificate_number: "شماره شناسنامه",
  birth_certificate_issue_place: "محل صدور شناسنامه",
  full_address: "نشانی", province: "استان", city: "شهر", district: "منطقه",
  postal_code: "کد پستی", emergency_contact_phone: "شماره تماس اضطراری",
  guardianship_status: "وضعیت سرپرستی", guardian_details: "اطلاعات وصی/قیم",
  language_dialect: "زبان و گویش", basic_medical_info: "اطلاعات پزشکی پایه",
  family_code: "کد عضو خانواده", relation: "نسبت", is_primary_contact: "مخاطب اصلی",
  first_name: "نام", last_name: "نام خانوادگی", password: "رمز عبور", email: "ایمیل",
  detail: "خطا",
}

export function labelFor(field: string): string {
  return FIELD_LABELS[field] || field
}

export interface ApiFieldError {
  field: string
  messages: string[]
}

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
