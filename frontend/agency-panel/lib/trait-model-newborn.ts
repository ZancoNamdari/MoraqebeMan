/**
 * مدل امتیازدهی سوال‌های موقعیتی نوزادیار (مادریارِ زیرشاخه‌ی نوزاد). همان منطق
 * trait-model.ts با پارامترهای مخصوص مراقبت از نوزاد و مادر پس از زایمان.
 * همه‌ی گزینه‌ها درست‌اند؛ اثرها فقط «سبک» مراقب را نشان می‌دهند.
 */
import { computeProfile, type OptionEffectsMap, type TraitDef, type TraitScore } from "./trait-model"

export const NEWBORN_TRAITS: TraitDef[] = [
  { key: "gentleness", label: "لطافت و دقت در برخورد با نوزاد", description: "لمس ملایم و حرکات آرام" },
  { key: "calmness", label: "آرامش در شرایط پراسترس", description: "خونسردی هنگام گریه، تب یا حادثه" },
  { key: "patience", label: "صبر و حوصله", description: "تحمل بیدار شدن‌ها و تکرار" },
  { key: "attentiveness", label: "دقت و پایش علائم نوزاد", description: "توجه به تغییر تغذیه، پوشک، پوست و خواب" },
  { key: "safety", label: "ایمنی نوزاد", description: "خواب ایمن، رها نکردن نوزاد و کنترل تماس‌ها" },
  { key: "hygiene", label: "بهداشت", description: "بهداشت فردی و وسایل نوزاد" },
  { key: "night_endurance", label: "تحمل بیداری شبانه", description: "حفظ هوشیاری و مهربانی در شیفت شب" },
  { key: "maternal_empathy", label: "همدلی با مادر", description: "حساسیت عاطفی نسبت به مادر پس از زایمان" },
  { key: "parent_respect", label: "احترام به انتخاب‌های والدین", description: "پذیرش روش و تصمیم والدین" },
  { key: "adherence", label: "پایبندی به دستورات پزشک و مادر", description: "اجرای دقیق برنامه‌ی تغذیه و مراقبت" },
  { key: "communication", label: "ارتباط و گزارش‌دهی", description: "گزارش روشن به مادر و خانواده" },
  { key: "responsibility", label: "مسئولیت‌پذیری", description: "پیگیری، ثبت و جبران" },
  { key: "trustworthiness", label: "قابل اعتماد بودن", description: "رازداری و حریم خصوصی خانواده" },
  { key: "adaptability", label: "انعطاف‌پذیری", description: "تطبیق با ریتم نوزاد و تغییر برنامه" },
]

const ABBR: Record<string, string> = {
  gent: "gentleness",
  calm: "calmness",
  pat: "patience",
  att: "attentiveness",
  safe: "safety",
  hyg: "hygiene",
  night: "night_endurance",
  memp: "maternal_empathy",
  prs: "parent_respect",
  adh: "adherence",
  comm: "communication",
  resp: "responsibility",
  trust: "trustworthiness",
  adapt: "adaptability",
}

function fx(s: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const part of s.split(",")) {
    const [k, v] = part.trim().split(":")
    out[ABBR[k]] = Number(v)
  }
  return out
}

/** کلید سوال (بدون پیشوند scenario_nb_) → اثر گزینه‌های a / b / c */
const RAW: Record<string, [string, string, string]> = {
  gent_1: ["gent:3,pat:1", "gent:2,calm:1,pat:2", "gent:2,adapt:2,pat:1"],
  gent_2: ["gent:2,safe:3,att:1", "gent:3,safe:2,hyg:1", "gent:3,calm:1,pat:1"],
  gent_3: ["gent:3,safe:2", "gent:3,att:1,calm:1", "gent:2,att:1,calm:1"],
  calm_1: ["calm:3,att:2", "calm:2,pat:2,adapt:1", "calm:2,comm:2,resp:1"],
  calm_2: ["calm:3,att:2,adh:1", "calm:2,memp:2,comm:1", "calm:2,adh:3"],
  calm_3: ["calm:3,safe:2", "calm:3,adh:1,resp:1", "calm:2,comm:2,resp:1"],
  night_1: ["night:3,resp:1", "night:3,att:1", "night:2,comm:2"],
  night_2: ["night:3,gent:2", "night:2,att:2,calm:1", "night:2,att:1,adapt:1"],
  night_3: ["night:3,resp:2", "night:2,adapt:2,safe:1", "night:2,comm:2"],
  pat_1: ["pat:3,calm:1", "pat:2,adapt:2,att:1", "pat:2,att:2,comm:1"],
  pat_2: ["pat:3,night:1", "pat:2,att:2,comm:1", "pat:2,adapt:2"],
  pat_3: ["pat:3,memp:2", "pat:2,comm:2,adapt:1", "pat:2,memp:3"],
  att_1: ["att:3,comm:2,resp:1", "att:2,adh:2", "att:3,resp:1"],
  att_2: ["att:3,gent:1,safe:1", "att:2,comm:3,resp:1", "att:2,resp:2,adh:1"],
  att_3: ["att:3,comm:2,resp:1", "att:2,adh:3", "att:2,resp:2,comm:1"],
  safe_1: ["safe:3,resp:1", "safe:3,att:1", "safe:2,comm:2,resp:1"],
  safe_2: ["safe:3,adh:1", "safe:2,att:2", "safe:2,att:1,resp:1"],
  safe_3: ["safe:3,hyg:2,comm:1", "safe:2,prs:2,comm:1", "safe:3,att:1"],
  hyg_1: ["hyg:3,resp:1", "hyg:3,att:1", "hyg:2,trust:2,comm:1"],
  hyg_2: ["hyg:3,adh:1", "hyg:2,att:1,resp:1", "hyg:2,adh:2,prs:1"],
  poo_1: ["hyg:2,gent:3,calm:2", "hyg:3,att:1,safe:1", "hyg:3,att:2"],
  poo_2: ["gent:3,night:2,calm:1", "gent:3,hyg:1,att:1", "gent:2,night:2,adapt:1"],
  poo_3: ["att:2,hyg:3,resp:1", "att:2,adh:3,hyg:1", "att:3,comm:2,resp:1"],
  poo_4: ["att:3,comm:2,resp:1", "att:2,adh:2", "att:3,resp:1,comm:1"],
  poo_5: ["hyg:3,comm:1,prs:1", "hyg:2,prs:3,comm:1", "hyg:3,gent:1,calm:1"],
  memp_1: ["memp:3,pat:1", "memp:2,resp:1,adapt:1", "memp:2,comm:2,att:1"],
  memp_2: ["memp:3,calm:1", "memp:2,prs:2,trust:2", "memp:2,comm:2,att:1"],
  memp_3: ["memp:2,prs:2,adapt:1", "memp:2,prs:3", "memp:3,att:1"],
  prs_1: ["prs:3,adapt:1", "prs:2,comm:2", "prs:2,safe:1,comm:1"],
  prs_2: ["prs:3,trust:1", "prs:2,adh:2,comm:1", "prs:2,comm:2,adapt:1"],
  adh_1: ["adh:3,resp:1", "adh:3,att:1", "adh:2,comm:2,att:1"],
  adh_2: ["adh:3,prs:1,comm:1", "adh:2,comm:2,prs:1", "adh:2,safe:2,resp:1"],
  comm_1: ["comm:3,att:1", "comm:2,memp:2", "comm:2,resp:1,adh:1"],
  comm_2: ["comm:3,calm:1", "comm:2,att:1,memp:1", "comm:2,resp:2"],
  resp_1: ["resp:3,comm:1", "resp:2,prs:2", "resp:2,adh:1,comm:1"],
  resp_2: ["resp:3,comm:2", "resp:2,att:2", "resp:2,adapt:2"],
  trust_1: ["trust:3,prs:1", "trust:3,comm:1", "trust:2,comm:2"],
  trust_2: ["trust:3", "trust:2,adapt:2", "trust:3,resp:1"],
  adapt_1: ["adapt:3,pat:1", "adapt:2,att:2", "adapt:2,comm:2"],
  adapt_2: ["adapt:3,prs:1", "adapt:2,comm:2", "adapt:2,safe:2"],
}

export const NEWBORN_OPTION_EFFECTS: OptionEffectsMap = Object.fromEntries(
  Object.entries(RAW).map(([k, [a, b, c]]) => [`scenario_nb_${k}`, { a: fx(a), b: fx(b), c: fx(c) }]),
)

/** پاسخ‌های سوال‌های موقعیتی نوزادیار → امتیاز هر پارامتر. */
export function computeNewbornProfile(answers: Record<string, any>): TraitScore[] {
  return computeProfile(NEWBORN_TRAITS, NEWBORN_OPTION_EFFECTS, answers)
}
