export const FIELD_LABELS: Record<string, string> = {
  note: "متن گزارش", category: "دسته", patient: "بیمار",
  username: "نام کاربری", password: "رمز عبور",
  phone_number: "شماره موبایل", token: "کد بازیابی", new_password: "رمز عبور جدید",
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
