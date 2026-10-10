"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { caregiverWizardService } from "@/services/caregiver_wizard.service"
import { summarizeSchedule, type CollaborationSchedule } from "@/components/wizard-forms/collaboration-picker"
import { CAREGIVER_QUESTIONNAIRE } from "@/lib/compatibility-questionnaire"
import { FormSection } from "@/components/wizard-forms/form-section"
import { TraitProfileView } from "@/components/wizard-forms/trait-profile-view"
import type { TraitProfile } from "@/lib/trait-profiles"
import { CaregiverHero } from "@/components/wizard-forms/caregiver-hero"
import { ROUTES } from "@/lib/routes"
import * as C from "@/lib/wizard-constants"
import { labelForValue, labelsForValues, yesNoLabel } from "@/lib/wizard-constants"
import type { FullCaregiverProfile } from "@/types/caregiver"
import { cn } from "@/lib/utils"

// پروفایل کامل خودِ مراقب — هم‌شکل صفحه‌ی پروفایل مراقب در پنل آژانس.
const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس", pending: "در انتظار بررسی", approved: "تأیید شده",
  rejected: "رد شده", suspended: "تعلیق شده",
}
const STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700", pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800", rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-orange-100 text-orange-800",
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-left font-medium text-slate-800" dir="auto">{value || "—"}</span>
    </div>
  )
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <span className="text-lg">{icon}</span> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function CaregiverProfilePage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()
  const id = user?.id ?? 0

  const [profile, setProfile] = useState<FullCaregiverProfile | null>(null)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)

  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({})
  const [questionnaireScores, setQuestionnaireScores] = useState<{ overall_flexibility_score: number; section_scores: Record<string, number> } | null>(null)
  const [traitProfiles, setTraitProfiles] = useState<TraitProfile[]>([])
  const [questionnaireLoading, setQuestionnaireLoading] = useState(true)
  const [questionnaireSaving, setQuestionnaireSaving] = useState(false)
  const [questionnaireMessage, setQuestionnaireMessage] = useState("")

  useEffect(() => {
    if (!id) return
    caregiverWizardService.getCompatibilityQuestionnaire()
      .then((data) => {
        const { section_scores, overall_flexibility_score, updated_at, trait_profiles, ...answers } = data
        setQuestionnaireAnswers(answers)
        setTraitProfiles(trait_profiles ?? [])
        setQuestionnaireScores({ overall_flexibility_score, section_scores })
      })
      .catch(() => {})
      .finally(() => setQuestionnaireLoading(false))
  }, [id])

  async function handleSaveQuestionnaire() {
    setQuestionnaireSaving(true); setQuestionnaireMessage("")
    try {
      const result = await caregiverWizardService.saveCompatibilityQuestionnaire({ ...questionnaireAnswers, trait_profiles: traitProfiles })
      const { section_scores, overall_flexibility_score } = result
      setQuestionnaireScores({ overall_flexibility_score, section_scores })
      setQuestionnaireMessage("پرسشنامه ذخیره شد.")
    } catch {
      setQuestionnaireMessage("ذخیره با خطا مواجه شد — همه سؤالات باید پاسخ داده شوند.")
    } finally {
      setQuestionnaireSaving(false)
    }
  }

  useEffect(() => {
    if (!id) return
    caregiverWizardService.fullProfile().then((full) => {
      setProfile(full)
      setName(full.identity?.full_name || "")
    }).finally(() => setLoading(false))
  }, [id])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background pb-10">
      <AppHeader
        title={
          <span className="flex flex-col items-start gap-1">
            <span>پروفایل من{name ? ` — ${name}` : ""}</span>
            {profile && (
              <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLASS[profile.status])}>
                {STATUS_LABEL[profile.status] || profile.status}
              </span>
            )}
          </span>
        }
        maxWidth="max-w-3xl"
      >
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
      </AppHeader>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {loading || !profile ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : (
          <>
            {profile.status === "rejected" && profile.rejection_reason && (
              <div className="rounded-lg border border-border bg-secondary p-3 text-sm text-foreground">
                <strong>دلیل رد شدن :</strong> {profile.rejection_reason}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="sm:flex-1" onClick={() => router.push(ROUTES.familyView)}>نمای خانواده</Button>
              <Button variant="outline" className="sm:flex-1" onClick={() => router.push(ROUTES.register)}>ویرایش / ادامه ثبت‌نام</Button>
            </div>

            <CaregiverHero userId={id} name={name} profile={profile} />

            {(profile as FullCaregiverProfile & { missing_forms?: string[] }).missing_forms?.length ? (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                <p className="font-medium">بخش‌های تکمیل‌نشده:</p>
                <ul className="mt-1 list-disc space-y-0.5 pe-5 text-xs">
                  {(profile as FullCaregiverProfile & { missing_forms?: string[] }).missing_forms!.map((m) => <li key={m}>{m}</li>)}
                </ul>
              </div>
            ) : null}

            <Section icon="🪪" title="اطلاعات هویتی">
              {profile.identity ? (
                <div>
                  <InfoRow label="نام پدر" value={profile.identity.father_name} />
                  <InfoRow label="جنسیت" value={labelForValue(C.GENDER, profile.identity.gender)} />
                  <InfoRow label="وضعیت تأهل" value={labelForValue(C.MARITAL_STATUS, profile.identity.marital_status)} />
                  <InfoRow label="تاریخ تولد" value={profile.identity.birth_date} />
                  <InfoRow label="بیماری زمینه‌ای" value={yesNoLabel(profile.identity.has_chronic_disease)} />
                  <InfoRow label="شماره تماس اضطراری" value={profile.identity.emergency_contact_phone} />
                  <InfoRow label="استعدادها و مهارت‌های ویژه" value={[labelsForValues(C.SPECIAL_TALENT, (profile.identity.special_talents ?? []).filter((x: string) => x !== "other")), (profile.identity.special_talents ?? []).includes("other") ? (profile.identity.special_talents_other || "سایر") : ""].filter(Boolean).join("، ")} />
                  <InfoRow label="نشانی" value={profile.identity.full_address} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">این فرم هنوز تکمیل نشده.</p>
              )}
            </Section>

            <Section icon="💼" title="شرایط همکاری">
              {profile.work_preferences ? (
                <div>
                  <InfoRow label="نوع همکاری" value={labelsForValues(C.COLLABORATION_TYPE, profile.work_preferences.collaboration_types)} />
                  {summarizeSchedule(profile.work_preferences.collaboration_types, profile.work_preferences.collaboration_schedule as CollaborationSchedule).map((r) => (
                    <InfoRow key={r.label} label={`— ${r.label}`} value={r.value} />
                  ))}
                  <InfoRow label="حقوق درخواستی" value={labelForValue(C.REQUESTED_SALARY_RANGE, profile.work_preferences.requested_salary_range) || profile.work_preferences.requested_salary || ""} />
                  <InfoRow label="خدمات قابل ارائه" value={labelsForValues(C.OFFERED_SERVICE, profile.work_preferences.offered_services)} />
                  <InfoRow label="پذیرش قوانین" value={yesNoLabel(profile.work_preferences.terms_accepted)} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">این فرم هنوز تکمیل نشده.</p>
              )}
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">مناطق خدماتی</p>
                {profile.service_areas.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {profile.service_areas.map((a, i) => (
                      <li key={a.id ?? i}>
                        {[a.province_name, a.city_name, a.district_name].filter(Boolean).join(" / ") || "—"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">هیچ منطقه‌ای ثبت نشده.</p>
                )}
              </div>
            </Section>

            <Section icon="🎓" title="سوابق کاری و مهارت‌ها">
              {profile.experience ? (
                <div>
                  <InfoRow label="سابقه ارائه خدمت" value={labelForValue(C.EXPERIENCE_RANGE, profile.experience.elderly_care_experience)} />
                  <InfoRow label="تعداد افراد تحت خدمت" value={labelForValue(C.PATIENTS_CARED_FOR_COUNT, profile.experience.patients_cared_for_count)} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">سوابق کاری هنوز تکمیل نشده.</p>
              )}
              {profile.skills ? (
                <div className="mt-2">
                  <InfoRow label="سطح تحصیلات" value={labelForValue(C.EDUCATION_LEVEL, profile.skills.education_level)} />
                  <InfoRow label="مهارت‌های مراقبتی" value={labelsForValues(C.CAREGIVING_SKILL, profile.skills.caregiving_skills)} />
                  <InfoRow label="گواهینامه رانندگی" value={yesNoLabel(profile.skills.has_driving_license)} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">مهارت‌ها هنوز تکمیل نشده.</p>
              )}
            </Section>

            <Section icon="📇" title={`معرف‌ها (${profile.references.length})`}>
              {profile.references.length > 0 ? (
                <div className="space-y-2">
                  {profile.references.map((r, i) => (
                    <div key={i} className="rounded-md border p-2 text-sm">
                      <p className="font-medium">{r.full_name}</p>
                      <p className="text-muted-foreground" dir="ltr">{r.phone_number}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">معرفی ثبت نشده (اختیاری است).</p>
              )}
            </Section>

            <Section icon="💬" title="پرسشنامه سازگاری مراقب">
              {questionnaireLoading ? (
                <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    این پرسشنامه اختیاری است و در تأیید پروفایل مراقب تأثیری ندارد — فقط کیفیت تطابق شما با درخواست‌ها را بهبود می‌دهد.
                  </p>
                  {questionnaireMessage && (
                    <div className={cn("rounded-md p-2 text-xs", questionnaireMessage.includes("خطا") ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-800")}>
                      {questionnaireMessage}
                    </div>
                  )}
                  {questionnaireScores && (
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="text-sm font-semibold text-foreground">امتیاز کلی انعطاف‌پذیری: {questionnaireScores.overall_flexibility_score}٪</p>
                      <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-muted-foreground sm:grid-cols-4">
                        {Object.entries(questionnaireScores.section_scores).map(([section, score]) => (
                          <span key={section}>{section}: {score}٪</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {traitProfiles.length > 0 && (
                    <FormSection title="نتیجه‌ی سوال‌های موقعیتی" defaultOpen>
                      <TraitProfileView profiles={traitProfiles} />
                    </FormSection>
                  )}

                  {CAREGIVER_QUESTIONNAIRE.map((section) => (
                    <FormSection key={section.title} title={section.title}>
                      {section.questions.map((q) => (
                        <div key={q.field} className="rounded-lg border border-border p-3">
                          <p className="mb-2 text-sm">{q.question}</p>
                          <div className="space-y-1.5">
                            {q.options.map((opt) => (
                              <label key={opt.value} className="flex cursor-pointer items-start gap-2 text-xs">
                                <input
                                  type="radio"
                                  name={q.field}
                                  checked={questionnaireAnswers[q.field] === opt.value}
                                  onChange={() => setQuestionnaireAnswers((prev) => ({ ...prev, [q.field]: opt.value }))}
                                  className="mt-0.5"
                                />
                                <span>{opt.text}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </FormSection>
                  ))}

                  <Button
                    className="w-full"
                    disabled={questionnaireSaving || Object.keys(questionnaireAnswers).length < 4}
                    onClick={handleSaveQuestionnaire}
                  >
                    {questionnaireSaving ? "در حال ذخیره..." : "ذخیره پرسشنامه"}
                  </Button>
                </div>
              )}
            </Section>
          </>
        )}
      </main>
    </div>
  )
}
