// زبان / گویش محلی — دقیقاً همان فهرستِ پنل آژانس (LOCAL_LANGUAGE) تا کلیدها یکی باشد.
// مقدار ذخیره‌شده در language_dialect: کلیدهای انتخاب‌شده با کاما، مثل "kurdish,lori".
export const LOCAL_LANGUAGE: [string, string][] = [
  ["azeri", "ترکی آذری"],
  ["kurdish", "کردی"],
  ["lori", "لری"],
  ["gilaki", "گیلکی"],
  ["mazandarani", "مازندرانی"],
  ["baluchi", "بلوچی"],
  ["arabic", "عربی"],
  ["turkmen", "ترکمنی"],
  ["yazdi", "یزدی"],
  ["shirazi", "شیرازی"],
  ["isfahani", "اصفهانی"],
  ["other", "سایر"],
]

// مقدارهای قدیمی (کد دو حرفی) → کلید جدید
const LEGACY: Record<string, string> = {
  az: "azeri", ku: "kurdish", lr: "lori", gl: "gilaki", mz: "mazandarani", ar: "arabic", bl: "baluchi",
}

// هر مورد: "kurdish" یا "kurdish:12" (۱۲ = شناسه‌ی استانِ محل آن زبان/گویش)
export interface LanguagePick { key: string; province: number | null }

export function parseLanguagePicks(value: string | null | undefined): LanguagePick[] {
  return (value || "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => {
    const [head, prov] = x.split(":")
    const key = LEGACY[head] ?? head
    return { key, province: prov && /^\d+$/.test(prov) ? Number(prov) : null }
  }).filter((p) => LOCAL_LANGUAGE.some((l) => l[0] === p.key))
}

export function serializeLanguagePicks(picks: LanguagePick[]): string {
  return picks.map((p) => (p.province ? `${p.key}:${p.province}` : p.key)).join(",")
}

export function parseLanguages(value: string | null | undefined): string[] {
  return parseLanguagePicks(value).map((p) => p.key)
}

export function languageLabel(value: string | null | undefined): string {
  return parseLanguages(value).map((k) => LOCAL_LANGUAGE.find((l) => l[0] === k)![1]).join("، ")
}
