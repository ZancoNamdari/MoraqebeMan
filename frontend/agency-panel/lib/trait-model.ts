/**
 * مدل امتیازدهی سوال‌های موقعیتی کودک‌یار.
 *
 * هر گزینه‌ی هر سوال روی چند «پارامتر شخصیتی» اثر می‌گذارد (عدد مثبت = افزایش،
 * منفی = کاهش). همه‌ی گزینه‌ها درست و حرفه‌ای‌اند؛ پس اثر روی صفتِ اصلیِ هر سوال
 * همیشه مثبت است و تفاوت‌ها در «سبک» دیده می‌شود: مثلاً گزینه‌ای که نظم را بالا می‌برد
 * ممکن است انعطاف یا خلاقیت را کمی پایین بیاورد.
 *
 * مقیاس اثر: ۱ = کم، ۲ = واضح، ۳ = قوی (و ۱- / ۲- برای کاهش).
 * نتیجه با computeTraitProfile برای هر پارامتر به درصد ۰ تا ۱۰۰ تبدیل می‌شود
 * (نسبت به کمترین و بیشترین مقدار ممکن در همان سوال‌هایی که پاسخ داده شده).
 */

export type TraitKey =
  | "kindness" | "organization" | "patience" | "trustworthiness" | "responsibility"
  | "creativity" | "punctuality" | "taste" | "cheerfulness" | "politeness" | "grooming"
  | "firmness" | "communication" | "adaptability"

export const TRAITS: { key: TraitKey; label: string; description: string }[] = [
  { key: "kindness", label: "مهربانی", description: "همدلی و گرمی در برخورد با کودک" },
  { key: "organization", label: "نظم و سازماندهی", description: "ترتیب در وسایل و برنامه‌ی روزانه" },
  { key: "patience", label: "صبر و حوصله", description: "تحمل شیطنت، تکرار و بدخلقی کودک" },
  { key: "trustworthiness", label: "قابل اعتماد بودن", description: "رازداری، صداقت و پایبندی به قواعد" },
  { key: "responsibility", label: "مسئولیت‌پذیری", description: "ایمنی، پیگیری و پذیرش پیامد کارها" },
  { key: "creativity", label: "خلاقیت", description: "ساختن بازی و فعالیت تازه" },
  { key: "punctuality", label: "وقت‌شناسی", description: "رعایت زمان و هماهنگی تأخیر" },
  { key: "taste", label: "خوش‌سلیقگی", description: "زیبایی‌شناسی در چیدمان و تزئین" },
  { key: "cheerfulness", label: "شادابی", description: "انرژی و فضای شاد" },
  { key: "politeness", label: "ادب", description: "ادب گفتار و برخورد با کودک و خانواده" },
  { key: "grooming", label: "آراستگی", description: "ظاهر مرتب و متناسب با کار با کودک" },
  { key: "firmness", label: "قاطعیت و مرزبندی", description: "تعیین حد و حدود به شکل روشن" },
  { key: "communication", label: "ارتباط با خانواده", description: "گزارش‌دهی، هماهنگی و شفافیت" },
  { key: "adaptability", label: "انعطاف‌پذیری", description: "تطبیق برنامه با حال و شرایط کودک" },
]

const ABBR: Record<string, TraitKey> = {
  kind: "kindness", org: "organization", pat: "patience", trust: "trustworthiness",
  resp: "responsibility", cre: "creativity", punc: "punctuality", taste: "taste",
  cheer: "cheerfulness", pol: "politeness", groom: "grooming", firm: "firmness",
  comm: "communication", adapt: "adaptability",
}

type Effects = Partial<Record<TraitKey, number>>

function fx(s: string): Effects {
  const out: Effects = {}
  for (const part of s.split(",")) {
    const [k, v] = part.trim().split(":")
    out[ABBR[k]] = Number(v)
  }
  return out
}

/** کلید سوال (بدون پیشوند scenario_) → اثر گزینه‌های a / b / c */
const RAW: Record<string, [string, string, string]> = {
  kind_1: ["kind:3,pat:2,firm:-1", "kind:3,cheer:1", "kind:1,cre:2,cheer:2,adapt:1"],
  kind_2: ["kind:3,pat:1,firm:-1", "kind:2,firm:1,resp:1", "kind:2,resp:2,cre:1"],
  organized_1: ["org:3,firm:1,adapt:-1", "org:2,resp:1", "org:1,cre:2,cheer:1,adapt:1"],
  organized_2: ["org:3,punc:2,adapt:-2,firm:1", "org:2,adapt:2,punc:1", "org:2,cre:1,kind:1,comm:1"],
  patient_1: ["pat:3,kind:1,resp:1", "pat:2,adapt:2,cre:1", "pat:2,firm:1,comm:1"],
  patient_2: ["pat:3,cre:2,cheer:2", "pat:2,cre:3", "pat:2,firm:2,org:1"],
  patient_mischief_1: ["pat:2,firm:1,kind:1,resp:1", "pat:2,cre:1,adapt:1,org:1", "pat:2,comm:2,resp:2"],
  patient_mischief_2: ["pat:2,firm:3,pol:1,comm:1", "pat:2,kind:2,firm:1,comm:2", "pat:3,kind:1,firm:-1"],
  patient_3: ["pat:3,kind:1,org:1,firm:1", "pat:2,cre:3,cheer:1", "pat:2,adapt:3,org:-1"],
  patient_hw: ["pat:3,cre:1,comm:1", "pat:2,comm:2,kind:1", "pat:2,cre:2,adapt:2"],
  trust_1: ["trust:2,comm:2,kind:1,resp:1", "trust:2,pol:2,kind:1", "trust:3,resp:2,org:1,comm:1"],
  trust_2: ["trust:3,pol:2,firm:1", "trust:2,adapt:2,pol:1", "trust:3,comm:1,resp:1,pol:1"],
  resp_1: ["resp:3,org:1", "resp:2,adapt:1", "resp:2,comm:2,pol:1"],
  resp_2: ["resp:3,comm:1,pat:1,firm:1", "resp:2,kind:1,adapt:1", "resp:2,cre:2,adapt:1"],
  resp_3: ["resp:3,trust:3,comm:2", "resp:2,org:2,trust:1", "resp:2,comm:2,pol:1,trust:1"],
  resp_hw: ["resp:2,org:2,comm:2", "resp:3,comm:2,trust:1", "resp:2,org:2,cre:1,kind:1"],
  creative_1: ["cre:3,adapt:1", "cre:2,kind:1,adapt:1", "cre:3,cheer:2,org:-1"],
  creative_2: ["cre:3,taste:1", "cre:2,cheer:2", "cre:3,cheer:2,org:-1"],
  creative_3: ["cre:3,cheer:2,firm:-1", "cre:2,cheer:2,taste:1", "cre:2,org:2,firm:1"],
  creative_hw: ["cre:2,cheer:2", "cre:2,taste:1,cheer:1", "cre:3,taste:1"],
  punctual_1: ["punc:3,resp:1,adapt:-1", "punc:3,org:2", "punc:2,comm:3,adapt:1,resp:1"],
  punctual_2: ["punc:3,org:1,pat:1", "punc:2,cre:1,org:1", "punc:2,comm:2,resp:1"],
  taste_1: ["taste:3,org:1", "taste:2,kind:2,cre:1", "taste:2,cre:3,cheer:1"],
  taste_2: ["taste:3,cre:1,cheer:1", "taste:2,cre:2,cheer:2", "taste:2,org:2,firm:1"],
  cheer_1: ["cheer:3,pol:1,kind:1", "cheer:1,kind:2,comm:2,pat:1", "cheer:2,cre:2,adapt:1"],
  cheer_2: ["cheer:1,resp:2,adapt:2,org:1", "cheer:3,cre:1,pat:1", "cheer:2,org:2,resp:1"],
  polite_1: ["pol:3,firm:1,pat:1", "pol:2,comm:2,firm:1,pat:1", "pol:2,kind:2,comm:1"],
  polite_2: ["pol:3,comm:2,trust:1,org:1", "pol:2,kind:1,comm:2", "pol:2,adapt:1,comm:2,kind:1"],
  groom_1: ["groom:2,adapt:1,resp:1", "groom:3,resp:2,org:1", "groom:2,adapt:2"],
  housework_involve: ["resp:2,org:1,firm:1", "resp:1,cre:2,cheer:2", "resp:2,kind:2,pat:1"],
}

export const OPTION_EFFECTS: Record<string, Record<string, Effects>> = Object.fromEntries(
  Object.entries(RAW).map(([k, [a, b, c]]) => [`scenario_${k}`, { a: fx(a), b: fx(b), c: fx(c) }]),
)

export interface TraitScore {
  key: TraitKey
  label: string
  /** مجموع اثرها */
  raw: number
  /** کمترین / بیشترین مقدار ممکن برای همین مجموعه از پاسخ‌ها */
  min: number
  max: number
  /** ۰ تا ۱۰۰ */
  percent: number
  /** چند سوالِ پاسخ‌داده‌شده روی این پارامتر اثر داشتند */
  questions: number
}

/**
 * پاسخ‌های سوال‌های موقعیتی (مثلاً { scenario_kind_1: "a", ... }) → امتیاز هر پارامتر.
 * پارامتری که هیچ سوال پاسخ‌داده‌شده‌ای روی آن اثر نداشته در خروجی نمی‌آید.
 */
export function computeTraitProfile(answers: Record<string, any>): TraitScore[] {
  const acc = new Map<TraitKey, { raw: number; min: number; max: number; n: number }>()
  for (const [qKey, byOption] of Object.entries(OPTION_EFFECTS)) {
    const picked = answers?.[qKey]
    if (typeof picked !== "string" || !byOption[picked]) continue
    for (const t of TRAITS) {
      const all = Object.values(byOption).map((e) => e[t.key] ?? 0)
      if (all.every((v) => v === 0)) continue
      const cur = acc.get(t.key) ?? { raw: 0, min: 0, max: 0, n: 0 }
      cur.raw += byOption[picked][t.key] ?? 0
      cur.min += Math.min(...all)
      cur.max += Math.max(...all)
      cur.n += 1
      acc.set(t.key, cur)
    }
  }
  return TRAITS.filter((t) => acc.has(t.key)).map((t) => {
    const v = acc.get(t.key)!
    const span = v.max - v.min
    return {
      key: t.key, label: t.label, raw: v.raw, min: v.min, max: v.max, questions: v.n,
      percent: span === 0 ? 50 : Math.round(((v.raw - v.min) / span) * 100),
    }
  })
}
