/**
 * ساخت پروفایل پارامترهای سوال‌های موقعیتی برای ذخیره در حساب مراقب و نمایش
 * (به‌صورت لیستی از {id, title, traits}) از روی پاسخ‌های پرسشنامه‌ی سازگاری.
 * فقط پاسخ سوال‌هایی حساب می‌شوند که با زیرشاخه‌ها / فعالیت‌های انتخاب‌شده‌ی
 * مراقب هنوز «قابل‌نمایش» هستند، تا پاسخ‌های قدیمیِ سوال‌های پنهان وارد نشوند.
 */
import { SERVICE_SPECIFIC_FORMS, CHILD_SUBTYPES } from "./wizard-constants"
import { computeTraitProfile, type TraitScore } from "./trait-model"
import { computeSalmandyarProfile } from "./trait-model-salmandyar"
import { computeNewbornProfile } from "./trait-model-newborn"
import { computeCleaningProfile, computeCookingProfile } from "./trait-model-nezafatchi"
import { computeParastarProfile, computeBehyarProfile } from "./trait-model-parastar"

export interface TraitProfileTrait { key: string; label: string; percent: number; questions: number }
export interface TraitProfile { id: string; title: string; traits: TraitProfileTrait[] }

type Answers = Record<string, Record<string, any>>

function visibleAnswers(type: string, subtypes: string[], form2: Record<string, any>, answers: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const f of SERVICE_SPECIFIC_FORMS[type]?.questionnaire ?? []) {
    if (!f.key.startsWith("scenario_")) continue
    if (f.showIf && !f.showIf.some((s) => subtypes.includes(s))) continue
    if (f.showIfField) {
      const v = form2?.[f.showIfField.key]
      const raw = typeof v === "boolean" ? String(v) : v
      const vals: string[] = Array.isArray(raw) ? raw : raw != null ? [raw] : []
      if (!vals.some((x) => f.showIfField!.oneOf.includes(x))) continue
    }
    if (answers?.[f.key] != null) out[f.key] = answers[f.key]
  }
  return out
}

const slim = (s: TraitScore[]): TraitProfileTrait[] =>
  s.map((t) => ({ key: t.key, label: t.label, percent: t.percent, questions: t.questions }))

export function buildTraitProfiles(
  serviceTypes: string[],
  serviceSubtypes: Record<string, string[]>,
  questionnaireSsa: Answers,
  form2Ssa: Answers,
): TraitProfile[] {
  const out: TraitProfile[] = []
  const add = (id: string, title: string, scores: TraitScore[]) => {
    if (scores.length > 0) out.push({ id, title, traits: slim(scores) })
  }
  for (const type of serviceTypes) {
    const sub = serviceSubtypes[type] ?? []
    const vis = visibleAnswers(type, sub, form2Ssa?.[type] ?? {}, questionnaireSsa?.[type] ?? {})
    if (type === "salmandyar") add("salmandyar", "سالمندیار", computeSalmandyarProfile(vis))
    if (type === "madaryar") {
      if (sub.includes("newborn")) add("newborn", "مادریار — نوزاد", computeNewbornProfile(vis))
      if (sub.some((s) => CHILD_SUBTYPES.includes(s))) add("koodakyar", "مادریار — کودک", computeTraitProfile(vis))
    }
    if (type === "nezafatchi") {
      if (sub.includes("inside_home") || sub.includes("outside_home")) add("cleaning", "امور منزل — نظافت", computeCleaningProfile(vis))
      if (sub.includes("cooking")) add("cooking", "امور منزل — آشپزی", computeCookingProfile(vis))
    }
    if (type === "parastar") {
      if (sub.includes("specialized_nurse") || sub.includes("nursing_specialist")) add("nurse", "پرستار تخصصی", computeParastarProfile(vis))
      if (sub.includes("behyar")) add("behyar", "بهیار", computeBehyarProfile(vis))
    }
  }
  return out
}
