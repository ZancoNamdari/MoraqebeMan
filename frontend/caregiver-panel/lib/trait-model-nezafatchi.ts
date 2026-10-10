/**
 * مدل امتیازدهی سوال‌های موقعیتی «امور منزل»: نظافت (nz) و آشپزی (ck).
 * همان منطق trait-model.ts؛ همه‌ی گزینه‌ها درست‌اند و اثرها فقط «سبک» مراقب را نشان می‌دهند.
 * مقیاس اثر: ۱ کم، ۲ واضح، ۳ قوی.
 */
import { computeProfile, type OptionEffectsMap, type TraitDef, type TraitScore } from "./trait-model"

export const CLEANING_TRAITS: TraitDef[] = [
  { key: "precision", label: "دقت و توجه به جزئیات", description: "تمیزکاری کامل و پیدا کردن نقاط جاافتاده" },
  { key: "discipline", label: "نظم و ترتیب کار", description: "روش و ترتیب ثابت و مرتب در انجام کار" },
  { key: "punctuality", label: "وقت‌شناسی", description: "رسیدن سر وقت و تمام کردن کار در زمان" },
  { key: "responsibility", label: "مسئولیت‌پذیری", description: "پذیرش خطا، جبران و پیگیری" },
  { key: "hygiene", label: "رعایت بهداشت", description: "جداسازی وسایل، دستکش و رعایت اصول بهداشتی" },
  { key: "trustworthiness", label: "امانت‌داری", description: "صداقت در برابر اموال و وسایل صاحب‌خانه" },
  { key: "privacy", label: "رعایت حریم خصوصی", description: "احترام به وسایل شخصی و رازداری" },
  { key: "respect", label: "برخورد محترمانه", description: "ادب با صاحب‌خانه و اهل خانه" },
  { key: "flexibility", label: "انعطاف‌پذیری", description: "تطبیق با تغییر برنامه و کمبود وسیله" },
  { key: "independence", label: "کار مستقل", description: "تصمیم درست بدون نیاز به نظارت" },
  { key: "instruction", label: "اجرای دقیق دستور", description: "اجرای دقیق خواسته‌ها و روش مورد نظر" },
  { key: "stamina", label: "تحمل کار فیزیکی و طولانی", description: "پایداری در کار سنگین و طولانی" },
  { key: "safety", label: "ایمنی و احتیاط", description: "استفاده‌ی ایمن از مواد و وسایل" },
  { key: "speed", label: "سرعت و اولویت‌بندی", description: "استفاده‌ی درست از زمان محدود" },
  { key: "communication", label: "ارتباط و گزارش‌دهی", description: "اطلاع‌رسانی شفاف به صاحب‌خانه" },
  { key: "grooming", label: "آراستگی و ظاهر کاری", description: "ظاهر تمیز و مناسب محیط کار" },
  { key: "hosting", label: "ادب در پذیرایی", description: "برخورد و ظاهر مناسب هنگام پذیرایی" },
  { key: "protocol", label: "رعایت پروتکل محیط کاری", description: "محرمانگی و ضوابط شرکت/مطب" },
  { key: "janitor", label: "پیگیری و استقلال در سرایداری", description: "مسئولیت مستمر ساختمان" },
]

const CLEANING_ABBR: Record<string, string> = {
  prec: "precision",
  disc: "discipline",
  punc: "punctuality",
  resp: "responsibility",
  hyg: "hygiene",
  trust: "trustworthiness",
  priv: "privacy",
  resc: "respect",
  flex: "flexibility",
  ind: "independence",
  inst: "instruction",
  stam: "stamina",
  safe: "safety",
  speed: "speed",
  comm: "communication",
  groom: "grooming",
  host: "hosting",
  prof: "protocol",
  jan: "janitor",
}

const CLEANING_RAW: Record<string, [string, string, string]> = {
  prec_1: ["prec:3,hyg:1", "prec:3,disc:1", "prec:2,disc:2,resp:1"],
  prec_2: ["prec:3,resp:1", "prec:3,disc:2", "prec:2,comm:2,trust:1"],
  prec_3: ["prec:3,inst:1", "prec:3,flex:2", "prec:3,stam:1"],
  disc_1: ["disc:3,speed:1", "disc:3,prec:1", "disc:3,resp:1"],
  disc_2: ["disc:3,priv:1", "disc:3,prec:2", "disc:2,comm:2,trust:1"],
  punc_1: ["punc:3,comm:2", "punc:3,resp:1", "punc:2,speed:2,flex:1"],
  punc_2: ["punc:3,speed:2", "punc:2,comm:3", "punc:2,resp:2,comm:1"],
  resp_1: ["resp:3,trust:2,comm:1", "resp:3,safe:1", "resp:2,comm:2,resc:1"],
  resp_2: ["resp:3,safe:2", "resp:3,ind:2", "resp:2,comm:3"],
  resp_3: ["resp:3,comm:2", "resp:2,flex:2,safe:1", "resp:2,speed:2"],
  hyg_1: ["hyg:3,disc:1", "hyg:3,disc:2", "hyg:3,prec:1"],
  hyg_2: ["hyg:3,safe:1", "hyg:3,disc:1", "hyg:3,prec:1"],
  trust_1: ["trust:3,comm:1", "trust:3,priv:2", "trust:3,comm:2"],
  trust_2: ["trust:3,resc:2", "trust:3,prec:1,comm:1", "trust:3,comm:2"],
  priv_1: ["priv:3,inst:2", "priv:3,disc:1", "priv:3,comm:2"],
  priv_2: ["priv:3,trust:2", "priv:3,flex:1", "priv:3,resc:1"],
  resc_1: ["resc:3,flex:1", "resc:3,inst:2,comm:1", "resc:3,comm:2"],
  resc_2: ["resc:3,safe:1", "resc:3,flex:1", "resc:2,safe:3"],
  flex_1: ["flex:3,resc:1", "flex:3,disc:1", "flex:2,comm:2"],
  flex_2: ["flex:3,ind:1", "flex:2,comm:2", "flex:3,disc:1"],
  ind_1: ["ind:3,safe:2", "ind:3,prec:1", "ind:2,comm:2,speed:1"],
  ind_2: ["ind:3,comm:1", "ind:2,disc:2", "ind:3,safe:1"],
  inst_1: ["inst:3,resc:1", "inst:3,safe:2", "inst:2,comm:2,safe:1"],
  inst_2: ["inst:3,comm:2", "inst:3,resc:1", "inst:2,flex:2"],
  stam_1: ["stam:3,disc:1", "stam:3,speed:1", "stam:3,flex:1"],
  stam_2: ["stam:3,safe:2", "stam:2,safe:2,flex:1", "stam:2,safe:2,comm:1"],
  safe_1: ["safe:3,hyg:1", "safe:3,prec:1", "safe:3,flex:1"],
  safe_2: ["safe:3,resp:1", "safe:3,disc:1", "safe:3,comm:2"],
  speed_1: ["speed:3,prec:1", "speed:3,disc:1", "speed:2,comm:2"],
  comm_1: ["comm:3,trust:2", "comm:3,resp:1", "comm:3,prec:1"],
  groom_1: ["groom:3,hyg:1", "groom:3,resc:1", "groom:3,disc:1"],
  host_1: ["host:3,groom:2", "host:3,punc:1", "host:3,resc:2"],
  work_1: ["prof:3,priv:2", "prof:3,comm:1", "prof:3,trust:2"],
  jan_1: ["jan:3,resp:1", "jan:3,comm:2", "jan:2,flex:1,comm:1"],
  jan_2: ["jan:3,ind:2", "jan:3,comm:2", "jan:3,resp:2"],
  villa_1: ["ind:3,disc:2", "ind:2,comm:2", "ind:2,comm:2,resp:1"],
}

function cleaningFx(s: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const part of s.split(",")) {
    const [k, v] = part.trim().split(":")
    out[CLEANING_ABBR[k]] = Number(v)
  }
  return out
}

export const CLEANING_OPTION_EFFECTS: OptionEffectsMap = Object.fromEntries(
  Object.entries(CLEANING_RAW).map(([k, [a, b, c]]) => ["scenario_nz_" + k, { a: cleaningFx(a), b: cleaningFx(b), c: cleaningFx(c) }]),
)

/** پاسخ‌های سوال‌های موقعیتی نظافت → امتیاز پارامترها. */
export function computeCleaningProfile(answers: Record<string, any>): TraitScore[] {
  return computeProfile(CLEANING_TRAITS, CLEANING_OPTION_EFFECTS, answers)
}

export const COOKING_TRAITS: TraitDef[] = [
  { key: "foodHygiene", label: "بهداشت مواد غذایی", description: "شست‌وشو، دما، نگهداری و جلوگیری از آلودگی" },
  { key: "taste", label: "خوش‌سلیقگی و طعم", description: "تعادل طعم، ظاهر غذا و تزئین" },
  { key: "planning", label: "برنامه‌ریزی و زمان‌بندی", description: "آماده شدن غذا سر وقت و مرحله‌بندی" },
  { key: "kitchenOrder", label: "نظم و تمیزی آشپزخانه", description: "جمع‌وجوری حین پخت و بعد از آن" },
  { key: "economy", label: "صرفه‌جویی و کنترل مواد", description: "استفاده‌ی درست از مواد و جلوگیری از هدر رفتن" },
  { key: "adaptability", label: "انطباق با سلیقه‌ی خانواده", description: "تنظیم غذا با ذائقه و عادت خانواده" },
  { key: "dietCare", label: "توجه به رژیم و حساسیت", description: "رژیم بیماران، آلرژی و نیاز تغذیه‌ای" },
  { key: "safety", label: "ایمنی در آشپزخانه", description: "احتیاط با آتش، چاقو و روغن داغ" },
  { key: "punctuality", label: "وقت‌شناسی", description: "رسیدن و تحویل غذا سر ساعت" },
  { key: "responsibility", label: "مسئولیت‌پذیری", description: "پذیرش اشتباه و جبران" },
  { key: "trustworthiness", label: "امانت‌داری", description: "صداقت در مواد و هزینه" },
  { key: "communication", label: "ارتباط و هماهنگی", description: "پرسیدن و اطلاع‌رسانی به خانواده" },
  { key: "learning", label: "پذیرش دستور پخت جدید", description: "یادگیری و اجرای دقیق دستور خانواده" },
  { key: "creativity", label: "خلاقیت در پخت", description: "ایده برای تنوع و جایگزین" },
  { key: "stamina", label: "تحمل کار طولانی", description: "ایستادن و پخت حجم زیاد" },
]

const COOKING_ABBR: Record<string, string> = {
  fh: "foodHygiene",
  taste: "taste",
  plan: "planning",
  kit: "kitchenOrder",
  eco: "economy",
  adapt: "adaptability",
  diet: "dietCare",
  safe: "safety",
  punc: "punctuality",
  resp: "responsibility",
  trust: "trustworthiness",
  comm: "communication",
  learn: "learning",
  cre: "creativity",
  stam: "stamina",
}

const COOKING_RAW: Record<string, [string, string, string]> = {
  fh_1: ["fh:3,kit:1", "fh:3,safe:1", "fh:3,plan:2"],
  fh_2: ["fh:3,eco:1", "fh:3,kit:2", "fh:3,plan:1,eco:1"],
  fh_3: ["fh:3", "fh:3,safe:1", "fh:3,diet:2"],
  fh_4: ["fh:3,resp:1", "fh:3,kit:2", "fh:2,comm:2,plan:1"],
  taste_1: ["taste:3,adapt:1", "taste:3,cre:2", "taste:3,diet:1"],
  taste_2: ["taste:3,kit:1", "taste:3,cre:2", "taste:3,cre:1,diet:1"],
  taste_3: ["taste:3,cre:2", "taste:2,comm:2,adapt:1", "taste:2,eco:2,cre:1"],
  plan_1: ["plan:3,punc:1", "plan:3,kit:1", "plan:3,learn:1"],
  plan_2: ["plan:3,adapt:2", "plan:2,cre:2,adapt:1", "plan:2,comm:2"],
  plan_3: ["plan:3,eco:1", "plan:3,eco:2", "plan:2,comm:2"],
  kit_1: ["kit:3,fh:1", "kit:3,plan:1", "kit:3,resp:1"],
  kit_2: ["kit:3,fh:1", "kit:3,safe:1", "kit:2,plan:2"],
  eco_1: ["eco:3,cre:2", "eco:3,plan:1", "eco:2,comm:2"],
  eco_2: ["eco:3,plan:1", "eco:3,cre:1", "eco:3,trust:1"],
  eco_3: ["eco:3,fh:1", "eco:3,plan:2", "eco:2,comm:2"],
  adapt_1: ["adapt:3,learn:2", "adapt:2,cre:2", "adapt:3,comm:1"],
  adapt_2: ["adapt:3,diet:1", "adapt:3,plan:1", "adapt:2,comm:2"],
  diet_1: ["diet:3,adapt:1", "diet:3,comm:2", "diet:3,cre:1"],
  diet_2: ["diet:3,safe:2", "diet:3,fh:1", "diet:3,comm:2"],
  diet_3: ["diet:3,adapt:2", "diet:3,safe:1", "diet:2,comm:2"],
  safe_1: ["safe:3,resp:2", "safe:3,fh:1", "safe:2,comm:2"],
  safe_2: ["safe:3,kit:1", "safe:3,kit:2", "safe:3,resp:1"],
  safe_3: ["safe:3,resp:2", "safe:3,comm:2", "safe:3,comm:1,resp:1"],
  punc_1: ["punc:3,comm:2", "punc:3,resp:1", "punc:3,plan:2"],
  punc_2: ["punc:3,plan:2", "punc:3,kit:1", "punc:2,comm:2"],
  resp_1: ["resp:3,trust:2", "resp:2,cre:2,plan:1", "resp:3,learn:2"],
  trust_1: ["trust:3,comm:1", "trust:3,eco:1", "trust:3,comm:2"],
  comm_1: ["comm:3,adapt:1", "comm:2,adapt:2", "comm:3,learn:1"],
  learn_1: ["learn:3,adapt:1", "learn:3,kit:1", "learn:3,comm:1"],
  cre_1: ["cre:3,eco:2", "cre:3,comm:1", "cre:3,adapt:1"],
  stam_1: ["stam:3,plan:2", "stam:3,plan:1", "stam:2,comm:2"],
}

function cookingFx(s: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const part of s.split(",")) {
    const [k, v] = part.trim().split(":")
    out[COOKING_ABBR[k]] = Number(v)
  }
  return out
}

export const COOKING_OPTION_EFFECTS: OptionEffectsMap = Object.fromEntries(
  Object.entries(COOKING_RAW).map(([k, [a, b, c]]) => ["scenario_ck_" + k, { a: cookingFx(a), b: cookingFx(b), c: cookingFx(c) }]),
)

/** پاسخ‌های سوال‌های موقعیتی آشپزی → امتیاز پارامترها. */
export function computeCookingProfile(answers: Record<string, any>): TraitScore[] {
  return computeProfile(COOKING_TRAITS, COOKING_OPTION_EFFECTS, answers)
}

