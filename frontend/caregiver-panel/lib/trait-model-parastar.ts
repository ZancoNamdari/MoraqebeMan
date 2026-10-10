/**
 * مدل امتیازدهی سوال‌های موقعیتی «پرستار» — شاخه‌ی پرستار تخصصی (pr) و شاخه‌ی بهیار (by).
 * همان منطق trait-model.ts؛ همه‌ی گزینه‌ها حرفه‌ای و درست‌اند و اثرها فقط «سبک» کار را نشان می‌دهند
 * (نه توان بالینی). مقیاس اثر: ۱ کم، ۲ واضح، ۳ قوی.
 */
import { computeProfile, type OptionEffectsMap, type TraitDef, type TraitScore } from "./trait-model"

export const PARASTAR_TRAITS: TraitDef[] = [
  { key: "clinicalJudgment", label: "قضاوت بالینی و اولویت‌بندی", description: "تشخیص موارد فوری و تصمیم درست" },
  { key: "calmness", label: "آرامش در شرایط اورژانسی", description: "خونسردی و اقدام درست هنگام بحران" },
  { key: "medication", label: "دقت در دارو و دستور پزشک", description: "رعایت دقیق دوز، زمان و دستور" },
  { key: "infectionControl", label: "کنترل عفونت و بهداشت", description: "رعایت اصول استریل و بهداشت دست" },
  { key: "observation", label: "مشاهده و پایش بیمار", description: "توجه به علائم حیاتی و تغییرات" },
  { key: "communication", label: "گزارش‌دهی به پزشک و خانواده", description: "اطلاع‌رسانی شفاف و به‌موقع" },
  { key: "empathy", label: "همدلی و آرام کردن بیمار", description: "درک نگرانی بیمار و خانواده" },
  { key: "dignity", label: "حفظ شأن و حریم بیمار", description: "احترام به حریم و تصمیم بیمار" },
  { key: "education", label: "آموزش به بیمار و خانواده", description: "توضیح ساده‌ی مراقبت‌ها" },
  { key: "scope", label: "رعایت حدود صلاحیت", description: "اقدام در حد توان و ارجاع به‌موقع" },
  { key: "resilience", label: "تحمل فشار و شیفت سخت", description: "پایداری در شیفت طولانی" },
  { key: "teamwork", label: "همکاری با تیم درمان", description: "هماهنگی با پزشک، پرستار و کمک‌بهیار" },
  { key: "responsibility", label: "مسئولیت‌پذیری", description: "پذیرش خطا و ثبت دقیق" },
  { key: "confidentiality", label: "رازداری بیمار", description: "حفظ اطلاعات پزشکی" },
  { key: "adaptability", label: "انعطاف‌پذیری", description: "تطبیق با شرایط بیمار و برنامه" },
]

const PARASTAR_ABBR: Record<string, string> = {
  clin: "clinicalJudgment",
  calm: "calmness",
  med: "medication",
  inf: "infectionControl",
  obs: "observation",
  comm: "communication",
  emp: "empathy",
  dig: "dignity",
  edu: "education",
  scope: "scope",
  res: "resilience",
  team: "teamwork",
  resp: "responsibility",
  conf: "confidentiality",
  adapt: "adaptability",
}

const PARASTAR_RAW: Record<string, [string, string, string]> = {
  clin_1: ["clin:3,obs:2,calm:1", "clin:3,comm:2", "clin:2,med:2,resp:1"],
  clin_2: ["clin:3,calm:1", "clin:3,team:2", "clin:2,emp:2,calm:1"],
  clin_3: ["clin:3,calm:2", "clin:3,obs:2", "clin:2,comm:2,emp:1"],
  calm_1: ["calm:3,clin:2", "calm:3,emp:1,comm:1", "calm:2,team:2,comm:1"],
  calm_2: ["calm:3,edu:1", "calm:3,team:2", "calm:3,clin:1"],
  calm_3: ["calm:3,scope:2", "calm:3,comm:2", "calm:2,obs:2,resp:1"],
  med_1: ["med:3,scope:2,comm:1", "med:3,comm:2", "med:3,resp:2"],
  med_2: ["med:3,obs:1", "med:2,comm:2", "med:3,scope:2"],
  med_3: ["med:2,emp:2,edu:2", "med:3,scope:1", "med:3,calm:1"],
  inf_1: ["inf:3,resp:1", "inf:3,med:1", "inf:3,scope:1"],
  inf_2: ["inf:3,resp:2", "inf:3,med:1", "inf:3,scope:1"],
  inf_3: ["inf:3,edu:2", "inf:3,scope:1", "inf:2,comm:2"],
  obs_1: ["obs:3,resp:1", "obs:3,comm:2", "obs:3,clin:1"],
  obs_2: ["obs:3,emp:2", "obs:3,resp:1", "obs:3,comm:2"],
  comm_1: ["comm:3,emp:1", "comm:3,scope:2", "comm:3,resp:1"],
  comm_2: ["comm:3,med:2", "comm:3,team:2", "comm:2,scope:2"],
  emp_1: ["emp:3,dig:1", "emp:3,edu:1", "emp:2,comm:2"],
  emp_2: ["emp:3,edu:2", "emp:3,dig:1", "emp:2,comm:1,adapt:1"],
  dig_1: ["dig:3,emp:1", "dig:3,comm:1", "dig:3,scope:1"],
  dig_2: ["dig:3,edu:2", "dig:2,comm:2,scope:1", "dig:3,adapt:1"],
  edu_1: ["edu:3,dig:1", "edu:3,resp:1", "edu:3,comm:1,obs:1"],
  edu_2: ["edu:3,emp:1", "edu:2,comm:2,med:1", "edu:3,med:1"],
  scope_1: ["scope:3,comm:2", "scope:3,team:1", "scope:3,resp:2"],
  scope_2: ["scope:3,dig:1", "scope:3,comm:2", "scope:3,edu:2"],
  res_1: ["res:3,resp:1", "res:3,clin:1", "res:3,adapt:1"],
  res_2: ["res:3,clin:2", "res:2,team:2", "res:3,obs:1"],
  team_1: ["team:3,edu:1", "team:3,comm:1", "team:3,scope:1"],
  team_2: ["team:3,resp:2", "team:3,comm:1", "team:2,resp:1"],
  resp_1: ["resp:3,comm:1", "resp:3,clin:1", "resp:3,team:1"],
  conf_1: ["conf:3,dig:1", "conf:3,comm:1", "conf:3,scope:1"],
  adapt_1: ["adapt:3,emp:1", "adapt:2,edu:1,scope:1", "adapt:2,comm:2"],
}

function parastarFx(s: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const part of s.split(",")) {
    const [k, v] = part.trim().split(":")
    out[PARASTAR_ABBR[k]] = Number(v)
  }
  return out
}

export const PARASTAR_OPTION_EFFECTS: OptionEffectsMap = Object.fromEntries(
  Object.entries(PARASTAR_RAW).map(([k, [a, b, c]]) => ["scenario_pr_" + k, { a: parastarFx(a), b: parastarFx(b), c: parastarFx(c) }]),
)

/** پاسخ‌های سوال‌های موقعیتی پرستار تخصصی → امتیاز پارامترها. */
export function computeParastarProfile(answers: Record<string, any>): TraitScore[] {
  return computeProfile(PARASTAR_TRAITS, PARASTAR_OPTION_EFFECTS, answers)
}

export const BEHYAR_TRAITS: TraitDef[] = [
  { key: "dailyCare", label: "مراقبت از امور روزمره", description: "کمک در شست‌وشو، تغذیه و جابه‌جایی" },
  { key: "physical", label: "جابه‌جایی ایمن و توان بدنی", description: "استفاده از تکنیک صحیح بلند کردن" },
  { key: "hygiene", label: "بهداشت و پیشگیری از عفونت", description: "شست‌وشوی دست، تمیزی ملافه و وسایل" },
  { key: "dignity", label: "حفظ شأن و حریم بیمار", description: "احترام به حریم هنگام امور شخصی" },
  { key: "empathy", label: "همدلی و مهربانی", description: "درک نگرانی و دلگرمی دادن" },
  { key: "patience", label: "صبر و حوصله", description: "تحمل کندی، تکرار و بی‌قراری" },
  { key: "observation", label: "مشاهده و گزارش به پرستار", description: "توجه به تغییرات و اطلاع‌رسانی" },
  { key: "followsInstructions", label: "پیروی از دستور پرستار", description: "اجرای دقیق دستور مراقبتی" },
  { key: "teamwork", label: "همکاری در تیم", description: "هماهنگی با پرستار و خانواده" },
  { key: "calmness", label: "آرامش در شرایط اضطراری", description: "خونسردی هنگام افت حال بیمار" },
  { key: "resilience", label: "تحمل کار سنگین و شب", description: "پایداری در شیفت سخت" },
  { key: "scope", label: "رعایت حدود وظایف", description: "انجام کارهای بهیاری و ارجاع به‌موقع" },
  { key: "responsibility", label: "مسئولیت‌پذیری", description: "پیگیری و پذیرش خطا" },
  { key: "communication", label: "ارتباط با خانواده", description: "گزارش شفاف و ساده" },
  { key: "trustworthiness", label: "امانت‌داری و رازداری", description: "حفظ اموال و اطلاعات بیمار" },
  { key: "punctuality", label: "وقت‌شناسی", description: "رعایت زمان شیفت و برنامه‌ی دارو/غذا" },
]

const BEHYAR_ABBR: Record<string, string> = {
  adl: "dailyCare",
  phys: "physical",
  hyg: "hygiene",
  dig: "dignity",
  emp: "empathy",
  pat: "patience",
  obs: "observation",
  follow: "followsInstructions",
  team: "teamwork",
  calm: "calmness",
  res: "resilience",
  scope: "scope",
  resp: "responsibility",
  comm: "communication",
  trust: "trustworthiness",
  punc: "punctuality",
}

const BEHYAR_RAW: Record<string, [string, string, string]> = {
  adl_1: ["adl:3,pat:2", "adl:3,emp:2", "adl:2,obs:2,comm:1"],
  adl_2: ["adl:3,dig:2", "adl:3,obs:2", "adl:3,dig:2,emp:1"],
  adl_3: ["adl:3,phys:2", "adl:3,hyg:1", "adl:3,obs:1,resp:1"],
  phys_1: ["phys:3,resp:1", "phys:3,emp:1", "phys:2,team:2,scope:1"],
  phys_2: ["phys:3,res:1", "phys:2,team:2", "phys:3,res:2"],
  phys_3: ["phys:3,follow:1", "phys:3,obs:2", "phys:3,adl:1"],
  hyg_1: ["hyg:3,resp:1", "hyg:3,adl:1", "hyg:3,follow:1"],
  hyg_2: ["hyg:3,obs:1", "hyg:3,dig:2", "hyg:2,comm:2,obs:1"],
  dig_1: ["dig:3,emp:1", "dig:3,emp:2", "dig:3,pat:1"],
  dig_2: ["dig:3,pat:1", "dig:3,comm:1", "dig:3,follow:1"],
  emp_1: ["emp:3,pat:1", "emp:3,adl:1", "emp:2,comm:2"],
  emp_2: ["emp:3,adl:1", "emp:2,obs:2,comm:1", "emp:2,obs:2"],
  pat_1: ["pat:3,emp:1", "pat:3,comm:1", "pat:3,adl:1"],
  pat_2: ["pat:3,dig:2", "pat:3,adl:1", "pat:3,punc:1"],
  pat_3: ["pat:3,emp:2", "pat:3,calm:1", "pat:2,comm:2"],
  obs_1: ["obs:3,scope:2,comm:1", "obs:3,phys:1", "obs:3,resp:1"],
  obs_2: ["obs:3,scope:2", "obs:3,comm:1", "obs:2,resp:1,emp:1"],
  follow_1: ["follow:3,punc:2", "follow:3,resp:1", "follow:3,comm:1,obs:1"],
  follow_2: ["follow:3,team:1", "follow:3,comm:2", "follow:2,team:2"],
  team_1: ["team:3,comm:1", "team:3,scope:1", "team:3,pat:1"],
  calm_1: ["calm:3,phys:1", "calm:3,comm:1,scope:1", "calm:3,obs:1"],
  res_1: ["res:3,resp:1", "res:3,punc:1", "res:2,team:2"],
  scope_1: ["scope:3,comm:1", "scope:3,resp:1", "scope:3,follow:2"],
  resp_1: ["resp:3,obs:1", "resp:3,comm:1", "resp:3,scope:1"],
  comm_1: ["comm:3,trust:1", "comm:2,scope:2", "comm:3,resp:1"],
  trust_1: ["trust:3,comm:1", "trust:3,dig:1", "trust:3,scope:1"],
  punc_1: ["punc:3,resp:1", "punc:3,adl:1", "punc:2,team:2"],
}

function behyarFx(s: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const part of s.split(",")) {
    const [k, v] = part.trim().split(":")
    out[BEHYAR_ABBR[k]] = Number(v)
  }
  return out
}

export const BEHYAR_OPTION_EFFECTS: OptionEffectsMap = Object.fromEntries(
  Object.entries(BEHYAR_RAW).map(([k, [a, b, c]]) => ["scenario_by_" + k, { a: behyarFx(a), b: behyarFx(b), c: behyarFx(c) }]),
)

/** پاسخ‌های سوال‌های موقعیتی بهیار → امتیاز پارامترها. */
export function computeBehyarProfile(answers: Record<string, any>): TraitScore[] {
  return computeProfile(BEHYAR_TRAITS, BEHYAR_OPTION_EFFECTS, answers)
}

