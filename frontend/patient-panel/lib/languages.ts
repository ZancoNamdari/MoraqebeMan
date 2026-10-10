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

export function parseLanguages(value: string | null | undefined): string[] {
  const keys = (value || "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => LEGACY[x] ?? x)
  return keys.filter((k) => LOCAL_LANGUAGE.some((l) => l[0] === k))
}

export function serializeLanguages(keys: string[]): string {
  return keys.join(",")
}

export function languageLabel(value: string | null | undefined): string {
  return parseLanguages(value).map((k) => LOCAL_LANGUAGE.find((l) => l[0] === k)![1]).join("، ")
}
