/**
 * مدل امتیازدهی سوال‌های موقعیتی سالمندیار — همان منطق کودک‌یار (trait-model.ts)
 * با پارامترهای مخصوص مراقبت از سالمند. همه‌ی گزینه‌ها درست‌اند؛ اثرها فقط «سبک»
 * مراقب را نشان می‌دهند. مقیاس اثر: ۱ کم، ۲ واضح، ۳ قوی؛ منفی برای کاهش.
 */
import { computeProfile, type OptionEffectsMap, type TraitDef, type TraitScore } from "./trait-model"

export const SALMANDYAR_TRAITS: TraitDef[] = [
  { key: "empathy", label: "همدلی و مهربانی", description: "درک احساس سالمند و پاسخ گرم به آن" },
  { key: "dignity", label: "احترام به شأن و استقلال", description: "حفظ حریم، انتخاب و توان خودِ سالمند" },
  { key: "patience", label: "صبر و حوصله", description: "تحمل تکرار، کندی و بی‌قراری" },
  { key: "calmness", label: "آرامش در شرایط اضطراری", description: "خونسردی و اقدام درست هنگام بحران" },
  { key: "attentiveness", label: "دقت و مشاهده‌گری", description: "توجه به علائم و تغییرات کوچک" },
  { key: "adherence", label: "پایبندی به دستورات مراقبتی", description: "رعایت دارو، رژیم و برنامه‌ی پزشک یا خانواده" },
  { key: "firmness", label: "قاطعیت مهربانانه", description: "اصرار روشن و محترمانه برای سلامت سالمند" },
  { key: "companionship", label: "هم‌صحبتی و همراهی", description: "ایجاد حس همراهی و سرگرمی" },
  { key: "hygiene", label: "بهداشت و نظافت", description: "بهداشت فردی، سالمند و وسایل" },
  { key: "responsibility", label: "مسئولیت‌پذیری", description: "ایمنی، پیگیری و جبران" },
  { key: "trustworthiness", label: "قابل اعتماد بودن", description: "امانتداری و رازداری" },
  { key: "communication", label: "ارتباط با خانواده و تیم درمان", description: "گزارش‌دهی و هماهنگی" },
  { key: "punctuality", label: "وقت‌شناسی", description: "رعایت زمان شیفت و دارو" },
  { key: "adaptability", label: "انعطاف‌پذیری", description: "تطبیق با حال سالمند و تغییر برنامه" },
  { key: "resilience", label: "تحمل شرایط دشوار", description: "پایداری در شب‌های سخت و کارهای سنگین" },
]

const ABBR: Record<string, string> = {
  emp: "empathy",
  dig: "dignity",
  pat: "patience",
  calm: "calmness",
  att: "attentiveness",
  adh: "adherence",
  firm: "firmness",
  comp: "companionship",
  hyg: "hygiene",
  resp: "responsibility",
  trust: "trustworthiness",
  comm: "communication",
  punc: "punctuality",
  adapt: "adaptability",
  res: "resilience",
}

function fx(s: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const part of s.split(",")) {
    const [k, v] = part.trim().split(":")
    out[ABBR[k]] = Number(v)
  }
  return out
}

/** کلید سوال (بدون پیشوند scenario_) → اثر گزینه‌های a / b / c */
const RAW: Record<string, [string, string, string]> = {
  emp_1: ["emp:3,comp:2,pat:1", "emp:2,comp:3,adapt:1", "emp:2,comm:2,resp:1"],
  emp_2: ["emp:3,dig:2", "emp:2,dig:3,comp:2", "emp:2,dig:2,adapt:1,comp:1"],
  emp_3: ["emp:3,calm:2,att:1", "emp:2,dig:2,comm:2", "emp:2,dig:3,att:2"],
  dig_1: ["dig:3,pat:2,emp:1", "dig:2,adapt:2,att:1", "dig:3,comm:2,emp:1"],
  dig_2: ["dig:3,comm:2,emp:1", "dig:3,hyg:1,trust:1", "dig:3,pat:1,att:1"],
  dig_3: ["dig:3,pat:2,hyg:1", "dig:2,att:2,adapt:1", "dig:3,att:1"],
  pat_1: ["pat:3,emp:1", "pat:2,adapt:2,att:1", "pat:2,comp:2,emp:1"],
  pat_2: ["pat:3,comp:2", "pat:2,att:2,adapt:1", "pat:2,adapt:2,comp:1"],
  pat_3: ["pat:3,dig:2", "pat:2,comp:3", "pat:2,att:1,adapt:1"],
  calm_1: ["calm:3,att:2,resp:2", "calm:2,comm:2,emp:1", "calm:2,adh:3,resp:1"],
  calm_2: ["calm:3,resp:2,adh:1", "calm:2,firm:2,comm:1", "calm:2,att:2,resp:1"],
  calm_3: ["calm:3,emp:2", "calm:2,comm:2,res:1", "calm:2,comm:2,adapt:2"],
  att_1: ["att:3,emp:1,comm:1", "att:2,comm:3", "att:2,adapt:2,emp:1"],
  att_2: ["att:3,comm:2,resp:1", "att:2,emp:2,dig:1", "att:2,hyg:1,resp:2"],
  att_3: ["att:3,adh:2,resp:1", "att:2,adh:3", "att:2,comm:2,resp:2"],
  adh_1: ["adh:2,emp:2,comm:1", "adh:2,adapt:2,att:1", "adh:3,firm:3,comm:1"],
  adh_2: ["adh:2,adapt:2,emp:1", "adh:3,firm:2,dig:1", "adh:2,comm:3,resp:1"],
  firm_1: ["firm:2,comm:3,trust:1", "firm:2,adh:2,resp:1", "firm:3,resp:2,att:1"],
  firm_2: ["firm:3,emp:1", "firm:2,adapt:2,dig:1", "firm:2,att:2,resp:1"],
  comp_1: ["comp:3,emp:2", "comp:3,adapt:1", "comp:2,adapt:1,att:1"],
  comp_2: ["comp:2,pat:2,dig:1", "comp:3,adapt:1", "comp:2,att:1,adapt:1"],
  hyg_1: ["hyg:3,resp:1", "hyg:3,att:1", "hyg:2,att:1,resp:1"],
  hyg_2: ["hyg:2,dig:3,resp:1", "hyg:3,att:2", "hyg:3,resp:1"],
  resp_1: ["resp:3,comm:1", "resp:2,comm:3", "resp:2,adh:1,comm:1"],
  resp_2: ["resp:3,dig:1,att:1", "resp:2,att:2,adapt:1", "resp:2,att:2"],
  trust_1: ["trust:3,att:1,emp:1", "trust:3,comm:2", "trust:2,comm:2,resp:1"],
  trust_2: ["trust:3,firm:2,emp:1", "trust:3,dig:2", "trust:2,emp:2,comm:1"],
  comm_1: ["comm:3,trust:1", "comm:2,emp:2", "comm:2,adapt:1"],
  comm_2: ["comm:2,att:2,resp:1", "comm:3,trust:1", "comm:2,trust:2"],
  punc_1: ["punc:3", "punc:3,att:1", "punc:2,comm:3"],
  punc_2: ["punc:3,adh:2", "punc:3,resp:1", "punc:2,comm:2,adh:1"],
  adapt_1: ["adapt:3,emp:1", "adapt:3,comp:1", "adapt:2,resp:1,adh:1"],
  adapt_2: ["adapt:3,pat:1", "adapt:2,comm:2", "adapt:2,emp:1,dig:1"],
  res_1: ["res:2,adapt:2", "res:3,calm:1", "res:2,adapt:2"],
  res_2: ["res:2,resp:2,att:1", "res:2,comm:2", "res:3,pat:1"],
  punc_3: ["punc:3,adh:1,dig:1", "punc:3,att:1,resp:1", "punc:2,comm:2,adapt:1"],
  res_3: ["res:3,resp:1", "res:2,comm:3", "res:2,adapt:2,resp:1"],
}

export const SALMANDYAR_OPTION_EFFECTS: OptionEffectsMap = Object.fromEntries(
  Object.entries(RAW).map(([k, [a, b, c]]) => [`scenario_${k}`, { a: fx(a), b: fx(b), c: fx(c) }]),
)

/** پاسخ‌های سوال‌های موقعیتی سالمندیار → امتیاز هر پارامتر. */
export function computeSalmandyarProfile(answers: Record<string, any>): TraitScore[] {
  return computeProfile(SALMANDYAR_TRAITS, SALMANDYAR_OPTION_EFFECTS, answers)
}
