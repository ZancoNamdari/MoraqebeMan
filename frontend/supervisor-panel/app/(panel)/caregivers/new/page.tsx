"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Field, ChoiceSelect, CheckboxGroup, YesNo } from "@/components/forms/fields"
import { LocationPicker } from "@/components/forms/location-picker"
import { JalaliDatePicker } from "@/components/forms/jalali-date-picker"
import { FormSection } from "@/components/forms/form-section"
import { CollaborationPicker, collaborationProblems, type CollaborationSchedule } from "@/components/forms/collaboration-picker"
import { EthnicityPicker } from "@/components/forms/ethnicity-picker"
import { jalaliAge } from "@/lib/jalali"
import { ErrorSummary } from "@/components/forms/error-summary"
import { StepIndicator } from "@/components/forms/step-indicator"
import { AppHeader } from "@/components/layout/app-header"
import { Separator } from "@/components/ui/separator"
import { parseApiErrors, errorsByField, referenceFieldError, type ApiFieldError } from "@/lib/field-labels"
import { useAuth } from "@/hooks/useauth"
import { caregiverService } from "@/services/caregiver.service"
import { CAREGIVER_QUESTIONNAIRE } from "@/lib/compatibility-questionnaire"
import { ROUTES } from "@/lib/routes"
import * as C from "@/lib/constants"
import type {
  ExperienceFormData, IdentityFormData, ReferenceFormData, ServiceArea,
  SkillsFormData, WorkPreferencesFormData,
} from "@/types/caregiver"

const STEPS = ["اطلاعات پایه", "فرم ۱ — هویتی", "فرم ۲ — شرایط همکاری", "فرم ۳ — سوابق و مهارت", "فرم ۴ — معرف‌ها", "فرم ۵ — پرسشنامه سازگاری"]

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Separator className="flex-1 bg-secondary" />
      <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary-strong">{children}</span>
      <Separator className="flex-1 bg-secondary" />
    </div>
  )
}

const EMPTY_IDENTITY: IdentityFormData = {
  father_name: "", national_id: "", birth_certificate_number: "",
  extra_phone_numbers: [],
  birth_date: "", gender: "", marital_status: "", children_count: "", military_status: null,
  height_range: "", weight_range: "", ethnicities: [], ethnicity_details: {}, has_children: null, currently_caring_for_own_child: null, child_accompany_at_work: "", is_non_iranian_national: null, nationality_country: "", nationality_country_other: "",
  has_chronic_disease: false, chronic_disease_types: [],
  takes_permanent_medication: false, medication_types: [],
  emergency_contact_phone: "", emergency_contact_relation: "", landline_phone: "",
  province: null, city: null, district: null, postal_code: "", full_address: "",
}

const EMPTY_WORK_PREFS: WorkPreferencesFormData = {
  collaboration_types: [], collaboration_schedule: {}, family_presence_preference: "", accepted_gender: "",
  accepted_age_ranges: [], offered_services: [], accepted_physical_conditions: [], lifting_capacity: "",
  service_locations: [], max_commute_time: "", available_days: [], available_shifts: [],
  commute_methods: [], smoking_status: "", pets_ok: null, holiday_work_ok: null, overnight_stay_ok: null,
  terms_accepted: false, night_stay_until: "", has_night_time_limit: null, additional_notes: "",
  requested_salary_range: "", serves_all_areas: false,
}

const EMPTY_EXPERIENCE: ExperienceFormData = {
  elderly_care_experience: "", other_services_experience: "", previous_workplaces: [],
  patients_cared_for_count: "", special_conditions_experience: [], live_in_experience: null,
  couple_care_experience: null, solo_elderly_care_experience: null, driving_for_patient_experience: null,
  last_workplace: "", additional_notes: "",
}

const EMPTY_SKILLS: SkillsFormData = {
  education_level: "", field_of_study: "", training_courses: [], communication_skills: [],
  caregiving_skills: [], physical_ability: "", mobility_assistance_ability: [], household_skills: [],
  foreign_languages: [], local_languages: [], local_language_fluency: "", has_driving_license: null, can_use_smartphone: null,
  additional_notes: "",
}

const EMPTY_REFERENCE: ReferenceFormData = {
  full_name: "", occupation: "", relation_type: "", acquaintance_duration: "",
  phone_number: "", callable_for_inquiry: true,
}

export default function NewCaregiverWizard() {
  return (
    <Suspense fallback={null}>
      <NewCaregiverWizardInner />
    </Suspense>
  )
}

function NewCaregiverWizardInner() {
  const { user, loading: authLoading, logout } = useAuth(["admin", "superuser"])
  const router = useRouter()
  const searchParams = useSearchParams()
  const existingId = searchParams.get("id")

  const [step, setStep] = useState(0)
  const [caregiverId, setCaregiverId] = useState<number | null>(existingId ? Number(existingId) : null)
  const [caregiverName, setCaregiverName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ApiFieldError[]>([])
  const fieldErrors = errorsByField(error)
  const [done, setDone] = useState(false)

  // Step 0 fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")

  const [identity, setIdentity] = useState<IdentityFormData>(EMPTY_IDENTITY)
  const [workPrefs, setWorkPrefs] = useState<WorkPreferencesFormData>(EMPTY_WORK_PREFS)
  const [areas, setAreas] = useState<ServiceArea[]>([])
  const [newArea, setNewArea] = useState<ServiceArea>({ province: null, city: null, district: null })
  const [experience, setExperience] = useState<ExperienceFormData>(EMPTY_EXPERIENCE)
  const [skills, setSkills] = useState<SkillsFormData>(EMPTY_SKILLS)
  const [references, setReferences] = useState<ReferenceFormData[]>([{ ...EMPTY_REFERENCE }])
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({})

  // Resume an in-progress (or already-complete) caregiver: load
  // whatever's already saved for each step, including the basic
  // account info (name/phone) so Step 0 can be used to fix a typo
  // instead of only ever being a one-time "create" screen.
  useEffect(() => {
    if (!caregiverId) return
    caregiverService.getBasicInfo(caregiverId).then((info) => {
      setFirstName(info.first_name)
      setLastName(info.last_name)
      setPhone(info.phone_number)
    }).catch(() => {})
    caregiverService.progress(caregiverId).then((p) => setCaregiverName(p.full_name))
    caregiverService.getIdentity(caregiverId).then(setIdentity).catch(() => {})
    caregiverService.getWorkPreferences(caregiverId).then(setWorkPrefs).catch(() => {})
    caregiverService.listServiceAreas(caregiverId).then(setAreas).catch(() => {})
    caregiverService.getExperience(caregiverId).then(setExperience).catch(() => {})
    caregiverService.getSkills(caregiverId).then(setSkills).catch(() => {})
    caregiverService.getReferences(caregiverId).then((refs) => {
      if (refs.length > 0) setReferences(refs)
    }).catch(() => {})
    caregiverService.getCompatibilityQuestionnaire(caregiverId).then((data) => {
      const { section_scores, overall_flexibility_score, updated_at, ...answers } = data
      setQuestionnaireAnswers(answers)
    }).catch(() => {})
    // Land straight on Form 1 rather than the "create account" screen
    // — the account already exists. Every step (including this one)
    // stays reachable via the now-clickable step indicator.
    setStep(1)
  }, [caregiverId])

  // Enter-to-advance keyboard navigation, requested explicitly so the
  // whole wizard can be driven without a mouse. advanceRef is
  // refreshed on every render (not just when `step` changes) so it
  // always closes over the LATEST field values — without this, typing
  // into a field then pressing Enter could submit stale, empty data
  // captured from whenever the step was first entered. The listener
  // itself is attached exactly once (empty dependency array) purely
  // for efficiency; it always calls through the ref, never a stale
  // closure directly.
  const advanceRef = useRef<() => void>(() => {})
  useEffect(() => {
    advanceRef.current = () => {
      if (saving) return
      if (step === 0) handleStep0()
      else if (step === 1) handleStep1()
      else if (step === 2) handleStep2()
      else if (step === 3) handleStep3()
      else if (step === 4) handleStep4()
      else if (step === 5) handleStep5()
    }
  })

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter") return
      const target = e.target as HTMLElement
      // Textareas need Enter to insert a real newline — this never
      // changes regardless of what else Enter does elsewhere.
      if (target.tagName === "TEXTAREA") return
      e.preventDefault()

      // Smart "next field" behavior, requested explicitly: Enter on
      // any field moves focus to the next focusable field within the
      // CURRENT step (like Tab, but via Enter) — dates and dropdowns
      // included. Only once there's no next field left in this step
      // does Enter fall back to actually advancing to the next step,
      // which is what the ref-based advanceRef call below still
      // does exactly as before.
      const main = document.querySelector("main")
      if (main) {
        const focusable = Array.from(
          main.querySelectorAll<HTMLElement>(
            'input:not([type="hidden"]), select, [tabindex="0"]'
          )
        ).filter((el) => !el.hasAttribute("disabled"))
        const currentIndex = focusable.indexOf(target)
        if (currentIndex !== -1 && currentIndex < focusable.length - 1) {
          focusable[currentIndex + 1].focus()
          return
        }
      }

      advanceRef.current()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (authLoading) return null

  function showErrors(err: any, fallback: string) {
    const data = err?.response?.data
    const parsed = parseApiErrors(data)
    setError(parsed.length > 0 ? parsed : [{ field: "detail", messages: [fallback] }])
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleStep0() {
    setError([]); setSaving(true)
    try {
      if (caregiverId) {
        // Editing an existing caregiver's basic info — e.g. fixing a
        // typo in the name.
        const result = await caregiverService.updateBasicInfo(caregiverId, { first_name: firstName, last_name: lastName, phone_number: phone })
        setCaregiverName(`${result.first_name} ${result.last_name}`.trim())
      } else {
        const result = await caregiverService.create({ first_name: firstName, last_name: lastName, phone_number: phone })
        setCaregiverId(result.user_id)
        setCaregiverName(result.full_name)
      }
      setStep(1)
    } catch (err: any) {
      showErrors(err, caregiverId ? "خطا در ذخیره اطلاعات." : "خطا در ایجاد حساب مراقب.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep1() {
    if (!caregiverId) return
    setError([]); setSaving(true)
    try {
      await caregiverService.saveIdentity(caregiverId, identity)
      setStep(2)
    } catch (err: any) {
      showErrors(err, "لطفاً همه فیلدهای الزامی را تکمیل کنید.")
    } finally {
      setSaving(false)
    }
  }

  async function handleAddArea() {
    if (!caregiverId || !newArea.province) return
    const created = await caregiverService.addServiceArea(caregiverId, newArea)
    setAreas([...areas, created])
    setNewArea({ province: null, city: null, district: null })
  }

  async function handleStep2() {
    if (!caregiverId) return
    const problems = collaborationProblems(workPrefs.collaboration_types, workPrefs.collaboration_schedule as CollaborationSchedule)
    if (problems.length > 0) {
      setError([{ field: "collaboration_schedule", messages: problems }])
      return
    }
    setError([]); setSaving(true)
    try {
      await caregiverService.saveWorkPreferences(caregiverId, workPrefs)
      setStep(3)
    } catch (err: any) {
      showErrors(err, "لطفاً همه فیلدهای الزامی را تکمیل کنید.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep3() {
    if (!caregiverId) return
    setError([]); setSaving(true)
    try {
      await caregiverService.saveExperience(caregiverId, experience)
      await caregiverService.saveSkills(caregiverId, skills)
      setStep(4)
    } catch (err: any) {
      showErrors(err, "لطفاً همه فیلدهای الزامی را تکمیل کنید.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep4() {
    if (!caregiverId) return
    setError([]); setSaving(true)
    try {
      await caregiverService.saveReferences(caregiverId, references)
      setStep(5)
    } catch (err: any) {
      showErrors(err, "ثبت معرف‌ها با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep5() {
    if (!caregiverId) return
    setError([]); setSaving(true)
    try {
      await caregiverService.saveCompatibilityQuestionnaire(caregiverId, questionnaireAnswers)
      setDone(true)
    } catch (err: any) {
      showErrors(err, "ثبت پرسشنامه با خطا مواجه شد — همه سؤالات باید پاسخ داده شوند.")
    } finally {
      setSaving(false)
    }
  }

  function handleSkipQuestionnaire() {
    setDone(true)
  }

  function startNext() {
    setStep(0); setCaregiverId(null); setCaregiverName(""); setDone(false); setError([])
    setFirstName(""); setLastName(""); setPhone("")
    setIdentity(EMPTY_IDENTITY); setWorkPrefs(EMPTY_WORK_PREFS); setAreas([])
    setExperience(EMPTY_EXPERIENCE); setSkills(EMPTY_SKILLS)
    setReferences([{ ...EMPTY_REFERENCE }])
    setQuestionnaireAnswers({})
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-secondary p-4">
        <Card className="w-full max-w-md border-0 text-center shadow-xl">
          <CardContent className="space-y-4 p-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-4xl text-white shadow-lg shadow-emerald-500/30">
              ✓
            </div>
            <h2 className="text-xl font-bold text-emerald-900">اطلاعات {caregiverName} با موفقیت ثبت شد</h2>
            <div className="flex flex-col gap-2 pt-2">
              <Button size="lg" className="bg-gradient-to-l from-primary to-primary shadow-md shadow-primary/30 hover:from-primary hover:to-primary" onClick={startNext}>
                + افزودن مراقب بعدی
              </Button>
              <Button variant="outline" onClick={() => router.push(ROUTES.dashboard)}>بازگشت به لیست</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background">
      <AppHeader
        title={caregiverName || "مراقب جدید"}
        maxWidth="max-w-5xl"
        subheader={
          <>
            <StepIndicator steps={STEPS} current={step} onNavigate={setStep} canNavigate={!!caregiverId} />
            <p className="mt-2 text-center text-sm font-medium text-muted-foreground">{STEPS[step]}</p>
          </>
        }
      >
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت به لیست</Button>
        <Button variant="ghost" size="sm" className="text-primary-strong" onClick={logout}>خروج</Button>
      </AppHeader>

      <main className="mx-auto max-w-5xl space-y-4 p-4 pb-28">
        <ErrorSummary errors={error} />

        {step === 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">👤</span> {caregiverId ? "ویرایش اطلاعات پایه" : "اطلاعات پایه حساب"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="نام" required><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
              <Field label="نام خانوادگی" required><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
              <Field label="شماره موبایل" required>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" dir="ltr" />
              </Field>
              {!caregiverId && <p className="text-xs text-muted-foreground">نام کاربری و رمز عبور به‌صورت خودکار ساخته می‌شود.</p>}
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">🪪</span> فرم ۱ — اطلاعات هویتی</CardTitle>
              <p className="text-sm text-muted-foreground">هر بخش را با زدن روی عنوانش باز یا بسته کنید.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormSection title="اطلاعات شناسایی" defaultOpen>
                <Field label="جنسیت"><ChoiceSelect choices={C.GENDER} value={identity.gender} onChange={(v) => setIdentity({ ...identity, gender: v })} /></Field>
                <Field label="نام پدر"><Input value={identity.father_name} onChange={(e) => setIdentity({ ...identity, father_name: e.target.value })} /></Field>
                <Field label="شماره ملی"><Input value={identity.national_id} onChange={(e) => setIdentity({ ...identity, national_id: e.target.value })} dir="ltr" maxLength={10} /></Field>
                <Field label="شماره شناسنامه"><Input value={identity.birth_certificate_number} onChange={(e) => setIdentity({ ...identity, birth_certificate_number: e.target.value })} /></Field>
                <Field label="تاریخ تولد">
                  <JalaliDatePicker value={identity.birth_date} onChange={(v) => setIdentity({ ...identity, birth_date: v })} />
                </Field>
                {jalaliAge(identity.birth_date) !== null && (
                  <p className="-mt-2 text-sm text-muted-foreground">سن: {jalaliAge(identity.birth_date)!.toLocaleString("fa-IR")} سال</p>
                )}
                <Field label="قومیت / زبان مادری">
                  <EthnicityPicker
                    ethnicities={identity.ethnicities}
                    details={identity.ethnicity_details}
                    onChange={(v) => setIdentity({ ...identity, ...v })}
                  />
                </Field>
                <Field label="آیا تابعیت غیرایرانی (اتباع) دارید؟"><YesNo value={identity.is_non_iranian_national} onChange={(v) => setIdentity({ ...identity, is_non_iranian_national: v })} /></Field>
                {identity.is_non_iranian_national && (
                  <>
                    <Field label="اهل کدام کشور هستید؟"><ChoiceSelect choices={C.NATIONALITY_COUNTRY} value={identity.nationality_country} onChange={(v) => setIdentity({ ...identity, nationality_country: v, ...(v === "other" ? {} : { nationality_country_other: "" }) })} /></Field>
                    {identity.nationality_country === "other" && (
                      <Field label="نام کشور را بنویسید"><Input value={identity.nationality_country_other} onChange={(e) => setIdentity({ ...identity, nationality_country_other: e.target.value })} /></Field>
                    )}
                    <p className="-mt-2 text-xs text-muted-foreground">مدارک پاسپورت/اقامت از بخش «مدارک» در کاریز خدمت‌دهنده آپلود می‌شود.</p>
                  </>
                )}
              </FormSection>

              <FormSection title="اطلاعات فردی">
                <Field label="وضعیت تأهل"><ChoiceSelect choices={C.MARITAL_STATUS} value={identity.marital_status} onChange={(v) => setIdentity({ ...identity, marital_status: v })} /></Field>
                <Field label="آیا خودتان فرزند دارید؟"><YesNo value={identity.has_children} onChange={(v) => setIdentity({ ...identity, has_children: v })} /></Field>
                {identity.has_children && (
                  <Field label="تعداد فرزندان"><ChoiceSelect choices={C.CHILDREN_COUNT} value={identity.children_count} onChange={(v) => setIdentity({ ...identity, children_count: v })} /></Field>
                )}
                {identity.gender === "male" && (
                  <Field label="وضعیت نظام وظیفه"><ChoiceSelect choices={C.MILITARY_STATUS} value={identity.military_status || ""} onChange={(v) => setIdentity({ ...identity, military_status: v })} /></Field>
                )}
                <Field label="قد"><ChoiceSelect choices={C.HEIGHT_RANGE} value={identity.height_range} onChange={(v) => setIdentity({ ...identity, height_range: v })} /></Field>
                <Field label="وزن"><ChoiceSelect choices={C.WEIGHT_RANGE} value={identity.weight_range} onChange={(v) => setIdentity({ ...identity, weight_range: v })} /></Field>
              </FormSection>

              <FormSection title="اطلاعات سلامت">
                <Field label="آیا بیماری زمینه‌ای دارد؟" required><YesNo value={identity.has_chronic_disease} onChange={(v) => setIdentity({ ...identity, has_chronic_disease: !!v })} /></Field>
                {identity.has_chronic_disease && (
                  <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
                    <Field label="نوع بیماری" required><CheckboxGroup choices={C.CHRONIC_DISEASE_TYPE} value={identity.chronic_disease_types} onChange={(v) => setIdentity({ ...identity, chronic_disease_types: v })} /></Field>
                  </div>
                )}
                <Field label="آیا داروی دائمی مصرف می‌کند؟"><YesNo value={identity.takes_permanent_medication} onChange={(v) => setIdentity({ ...identity, takes_permanent_medication: !!v })} /></Field>
                {identity.takes_permanent_medication && (
                  <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
                    <Field label="نوع دارو" required><CheckboxGroup choices={C.MEDICATION_TYPE} value={identity.medication_types} onChange={(v) => setIdentity({ ...identity, medication_types: v })} /></Field>
                  </div>
                )}
              </FormSection>

              <FormSection title="اطلاعات تماس">
                <Field label="شماره تماس‌های دیگر"><Input value={identity.emergency_contact_phone} onChange={(e) => setIdentity({ ...identity, emergency_contact_phone: e.target.value })} dir="ltr" /></Field>
                <Field label="تلفن ثابت"><Input value={identity.landline_phone} onChange={(e) => setIdentity({ ...identity, landline_phone: e.target.value })} dir="ltr" /></Field>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-foreground">سایر شماره‌های تماس</p>
                  <div className="space-y-2">
                    {identity.extra_phone_numbers.map((num, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={num} dir="ltr"
                          onChange={(e) => {
                            const next = [...identity.extra_phone_numbers]
                            next[i] = e.target.value
                            setIdentity({ ...identity, extra_phone_numbers: next })
                          }}
                        />
                        <Button
                          type="button" variant="outline" size="sm"
                          onClick={() => setIdentity({ ...identity, extra_phone_numbers: identity.extra_phone_numbers.filter((_, j) => j !== i) })}
                        >
                          حذف
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => setIdentity({ ...identity, extra_phone_numbers: [...identity.extra_phone_numbers, ""] })}
                    >
                      + افزودن شماره
                    </Button>
                  </div>
                </div>
              </FormSection>

              <FormSection title="اطلاعات محل سکونت">
                <LocationPicker
                  province={identity.province}
                  city={identity.city}
                  district={identity.district}
                  onChange={(v) => setIdentity({ ...identity, ...v })}
                />
                <Field label="کد پستی"><Input value={identity.postal_code} onChange={(e) => setIdentity({ ...identity, postal_code: e.target.value })} dir="ltr" /></Field>
                <Field label="نشانی کامل"><Textarea value={identity.full_address} onChange={(e) => setIdentity({ ...identity, full_address: e.target.value })} /></Field>
              </FormSection>

              <FormSection title="اطلاعات تکمیلی">
                {!identity.has_children && (
                  <p className="text-sm text-muted-foreground">فعلاً مورد تکمیلی‌ای برای نمایش نیست.</p>
                )}
                {identity.has_children && (
                  <Field label="آیا در حال حاضر در حال مراقبت از فرزند خودتان هستید یا نیازی به مراقبت شما ندارد؟"><YesNo value={identity.currently_caring_for_own_child} onChange={(v) => setIdentity({ ...identity, currently_caring_for_own_child: v, ...(v ? {} : { child_accompany_at_work: "" }) })} /></Field>
                )}
                {identity.has_children && identity.currently_caring_for_own_child && (
                  <Field label="آیا مایل هستید در هنگام کار فرزندتان همراه شما باشد؟"><ChoiceSelect choices={C.CHILD_ACCOMPANY_AT_WORK} value={identity.child_accompany_at_work} onChange={(v) => setIdentity({ ...identity, child_accompany_at_work: v })} /></Field>
                )}
              </FormSection>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">💼</span> فرم ۲ — شرایط همکاری</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormSection title="نوع همکاری" hasError={!!fieldErrors.collaboration_schedule || !!fieldErrors.collaboration_types}>
                <CollaborationPicker
                  types={workPrefs.collaboration_types}
                  schedule={workPrefs.collaboration_schedule as CollaborationSchedule}
                  onChange={(types, schedule) => setWorkPrefs({ ...workPrefs, collaboration_types: types, collaboration_schedule: schedule })}
                  error={fieldErrors.collaboration_schedule || fieldErrors.collaboration_types}
                />
              </FormSection>
              <FormSection title="ترجیحات مراقبت از سالمند">
                <Field label="حضور خانواده سالمند"><ChoiceSelect choices={C.FAMILY_PRESENCE_PREFERENCE} value={workPrefs.family_presence_preference} onChange={(v) => setWorkPrefs({ ...workPrefs, family_presence_preference: v })} /></Field>
                <Field label="جنسیت سالمند قابل قبول"><ChoiceSelect choices={C.ACCEPTED_GENDER} value={workPrefs.accepted_gender} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_gender: v })} /></Field>
                <Field label="بازه سنی سالمند"><CheckboxGroup choices={C.ACCEPTED_AGE_RANGE} value={workPrefs.accepted_age_ranges} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_age_ranges: v })} /></Field>
                <Field label="خدمات قابل ارائه"><CheckboxGroup choices={C.OFFERED_SERVICE} value={workPrefs.offered_services} onChange={(v) => setWorkPrefs({ ...workPrefs, offered_services: v })} /></Field>
                <Field label="شرایط جسمانی سالمند قابل پذیرش"><CheckboxGroup choices={C.ACCEPTED_PHYSICAL_CONDITION} value={workPrefs.accepted_physical_conditions} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_physical_conditions: v })} /></Field>
                <Field label="محل ارائه خدمت"><CheckboxGroup choices={C.SERVICE_LOCATION} value={workPrefs.service_locations} onChange={(v) => setWorkPrefs({ ...workPrefs, service_locations: v })} /></Field>
              </FormSection>
              <FormSection title="شرایط محیط کار">
                <Field label="وضعیت استعمال دخانیات"><ChoiceSelect choices={C.SMOKING_STATUS} value={workPrefs.smoking_status} onChange={(v) => setWorkPrefs({ ...workPrefs, smoking_status: v })} /></Field>
                <Field label="پذیرش حیوان خانگی در محل کار"><YesNo value={workPrefs.pets_ok} onChange={(v) => setWorkPrefs({ ...workPrefs, pets_ok: v })} /></Field>
              </FormSection>
              <FormSection title="مناطق خدماتی">
                <div>
                  <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={workPrefs.serves_all_areas}
                      onChange={(e) => setWorkPrefs({ ...workPrefs, serves_all_areas: e.target.checked })}
                      className="accent-primary"
                    />
                    همه مناطق / فرقی نداره
                  </label>
                  {!workPrefs.serves_all_areas && (
                  <>
                  <div className="mb-3 space-y-2">
                    {areas.map((a, i) => (
                      <div key={a.id ?? i} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                        <span>{[a.province_name, a.city_name, a.district_name].filter(Boolean).join(" / ") || "(بدون منطقه انتخابی)"}</span>
                        {a.id && (
                          <button
                            type="button"
                            className="text-xs text-destructive underline"
                            onClick={async () => {
                              if (!caregiverId) return
                              await caregiverService.deleteServiceArea(caregiverId, a.id!)
                              setAreas(areas.filter((x) => x.id !== a.id))
                            }}
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    ))}
                    {areas.length === 0 && <p className="text-xs text-muted-foreground">هنوز منطقه‌ای اضافه نشده.</p>}
                  </div>
                  <LocationPicker
                    province={newArea.province}
                    city={newArea.city}
                    district={newArea.district}
                    onChange={setNewArea}
                  />
                  <Button type="button" variant="outline" className="mt-2" onClick={handleAddArea} disabled={!newArea.province || !newArea.city}>
                    + افزودن این منطقه
                  </Button>
                  </>
                  )}
                </div>
              </FormSection>
              <FormSection title="اطلاعات تکمیلی">
                <Field label="حقوق درخواستی (ماهانه)"><ChoiceSelect choices={C.REQUESTED_SALARY_RANGE} value={workPrefs.requested_salary_range} onChange={(v) => setWorkPrefs({ ...workPrefs, requested_salary_range: v })} /></Field>
                <Field label="توضیحات تکمیلی (اختیاری)"><Textarea value={workPrefs.additional_notes} onChange={(e) => setWorkPrefs({ ...workPrefs, additional_notes: e.target.value })} /></Field>
              </FormSection>

<Field label="پذیرش قوانین و مسئولیت اطلاعات" required error={fieldErrors.terms_accepted}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={workPrefs.terms_accepted} onChange={(e) => setWorkPrefs({ ...workPrefs, terms_accepted: e.target.checked })} className="accent-primary" />
                  اطلاعات فوق تأیید و مسئولیت صحت آن پذیرفته می‌شود.
                </label>
              </Field>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">🎓</span> فرم ۳ — سوابق کاری و مهارت‌ها</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormSection title="سوابق کاری">
                <Field label="سابقه مراقبت از سالمند"><ChoiceSelect choices={C.EXPERIENCE_RANGE} value={experience.elderly_care_experience} onChange={(v) => setExperience({ ...experience, elderly_care_experience: v })} /></Field>
                <Field label="سابقه سایر مشاغل خدماتی"><ChoiceSelect choices={C.EXPERIENCE_RANGE} value={experience.other_services_experience} onChange={(v) => setExperience({ ...experience, other_services_experience: v })} /></Field>
                {experience.elderly_care_experience !== "none" && (
                  <>
                    <Field label="محل‌های سابق فعالیت"><CheckboxGroup choices={C.PREVIOUS_WORKPLACE} value={experience.previous_workplaces} onChange={(v) => setExperience({ ...experience, previous_workplaces: v })} /></Field>
                    {experience.previous_workplaces.includes("other") && (
                      <Field label="توضیح سایر محل فعالیت">
                        <Input value={experience.additional_notes} onChange={(e) => setExperience({ ...experience, additional_notes: e.target.value })} />
                      </Field>
                    )}
                    <Field label="تعداد سالمندان تحت مراقبت تاکنون"><ChoiceSelect choices={C.PATIENTS_CARED_FOR_COUNT} value={experience.patients_cared_for_count} onChange={(v) => setExperience({ ...experience, patients_cared_for_count: v })} /></Field>
                  </>
                )}
                <Field label="تجربه شرایط خاص"><CheckboxGroup choices={C.SPECIAL_CONDITION_EXPERIENCE} value={experience.special_conditions_experience} onChange={(v) => setExperience({ ...experience, special_conditions_experience: v })} /></Field>
                <Field label="سابقه همکاری شبانه‌روزی (مقیم)"><YesNo value={experience.live_in_experience} onChange={(v) => setExperience({ ...experience, live_in_experience: v })} /></Field>
                <Field label="سابقه مراقبت از زوج سالمند"><YesNo value={experience.couple_care_experience} onChange={(v) => setExperience({ ...experience, couple_care_experience: v })} /></Field>
                <Field label="سابقه مراقبت از سالمند تنها"><YesNo value={experience.solo_elderly_care_experience} onChange={(v) => setExperience({ ...experience, solo_elderly_care_experience: v })} /></Field>
                <Field label="سابقه رانندگی برای سالمند"><YesNo value={experience.driving_for_patient_experience} onChange={(v) => setExperience({ ...experience, driving_for_patient_experience: v })} /></Field>
                <Field label="آخرین محل فعالیت"><Input value={experience.last_workplace} onChange={(e) => setExperience({ ...experience, last_workplace: e.target.value })} /></Field>
                <Field label="توضیحات تکمیلی سوابق"><Textarea value={experience.additional_notes} onChange={(e) => setExperience({ ...experience, additional_notes: e.target.value })} /></Field>
              </FormSection>
              <FormSection title="تحصیلات و زبان خارجی">
                <Field label="سطح تحصیلات"><ChoiceSelect choices={C.EDUCATION_LEVEL} value={skills.education_level} onChange={(v) => setSkills({ ...skills, education_level: v })} /></Field>
                <Field label="رشته تحصیلی"><Input value={skills.field_of_study} onChange={(e) => setSkills({ ...skills, field_of_study: e.target.value })} /></Field>
                {skills.education_level !== "diploma" && skills.education_level !== "under_diploma" && (
                  <Field label="زبان خارجی"><CheckboxGroup choices={C.FOREIGN_LANGUAGE} value={skills.foreign_languages} onChange={(v) => setSkills({ ...skills, foreign_languages: v })} /></Field>
                )}
              </FormSection>
              <FormSection title="آموزش‌ها و مهارت‌ها">
                <Field label="دوره‌های آموزشی گذرانده‌شده"><CheckboxGroup choices={C.TRAINING_COURSE} value={skills.training_courses} onChange={(v) => setSkills({ ...skills, training_courses: v })} /></Field>
                <Field label="مهارت‌های ارتباطی"><CheckboxGroup choices={C.COMMUNICATION_SKILL} value={skills.communication_skills} onChange={(v) => setSkills({ ...skills, communication_skills: v })} /></Field>
                <Field label="مهارت‌های مراقبتی"><CheckboxGroup choices={C.CAREGIVING_SKILL} value={skills.caregiving_skills} onChange={(v) => setSkills({ ...skills, caregiving_skills: v })} /></Field>
                <Field label="توانایی جسمی"><ChoiceSelect choices={C.PHYSICAL_ABILITY} value={skills.physical_ability} onChange={(v) => setSkills({ ...skills, physical_ability: v })} /></Field>
                <Field label="توانایی جابجایی سالمند"><CheckboxGroup choices={C.MOBILITY_ASSISTANCE_ABILITY} value={skills.mobility_assistance_ability} onChange={(v) => setSkills({ ...skills, mobility_assistance_ability: v })} /></Field>
                <Field label="مهارت‌های خانگی"><CheckboxGroup choices={C.HOUSEHOLD_SKILL} value={skills.household_skills} onChange={(v) => setSkills({ ...skills, household_skills: v })} /></Field>
              </FormSection>
              <FormSection title="زبان محلی و سایر توانایی‌ها">
                <Field label="زبان محلی"><CheckboxGroup choices={C.LOCAL_LANGUAGE} value={skills.local_languages} onChange={(v) => setSkills({ ...skills, local_languages: v })} /></Field>
                {skills.local_languages.length > 0 && (
                  <Field label="سطح تسلط به زبان(های) محلی"><ChoiceSelect choices={C.LOCAL_LANGUAGE_FLUENCY} value={skills.local_language_fluency} onChange={(v) => setSkills({ ...skills, local_language_fluency: v })} /></Field>
                )}
                <Field label="گواهینامه رانندگی"><YesNo value={skills.has_driving_license} onChange={(v) => setSkills({ ...skills, has_driving_license: v })} /></Field>
                <Field label="مهارت کار با تلفن هوشمند"><YesNo value={skills.can_use_smartphone} onChange={(v) => setSkills({ ...skills, can_use_smartphone: v })} /></Field>
                <Field label="توضیحات تکمیلی مهارت‌ها"><Textarea value={skills.additional_notes} onChange={(e) => setSkills({ ...skills, additional_notes: e.target.value })} /></Field>
              </FormSection>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">📇</span> فرم ۴ — معرف‌ها</CardTitle><p className="text-sm text-muted-foreground">افزودن معرف اختیاری است — هر تعداد که در دسترس دارید کافی است.</p></CardHeader>
            <CardContent className="space-y-6">
              {references.map((ref, i) => (
                <FormSection
                  key={i}
                  title={ref.full_name ? `معرف ${i + 1} — ${ref.full_name}` : `معرف ${i + 1}`}
                  defaultOpen={!ref.full_name && !ref.phone_number}
                  hasError={!!(referenceFieldError(error, i, "full_name") || referenceFieldError(error, i, "phone_number"))}
                >
                  <Field label="نام و نام خانوادگی" required error={referenceFieldError(error, i, "full_name")}>
                    <Input value={ref.full_name} onChange={(e) => updateReference(i, { full_name: e.target.value })} />
                  </Field>
                  <Field label="شغل معرف">
                    <Input value={ref.occupation} onChange={(e) => updateReference(i, { occupation: e.target.value })} />
                  </Field>
                  <Field label="نوع ارتباط">
                    <ChoiceSelect choices={C.REFERENCE_RELATION_TYPE} value={ref.relation_type} onChange={(v) => updateReference(i, { relation_type: v })} />
                  </Field>
                  <Field label="مدت آشنایی">
                    <ChoiceSelect choices={C.ACQUAINTANCE_DURATION} value={ref.acquaintance_duration} onChange={(v) => updateReference(i, { acquaintance_duration: v })} />
                  </Field>
                  <Field label="شماره تماس" required error={referenceFieldError(error, i, "phone_number")}>
                    <Input value={ref.phone_number} onChange={(e) => updateReference(i, { phone_number: e.target.value })} dir="ltr" />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={ref.callable_for_inquiry} onChange={(e) => updateReference(i, { callable_for_inquiry: e.target.checked })} className="accent-primary" />
                    امکان تماس جهت استعلام
                  </label>
                  {references.length > 0 && (
                    <Button variant="ghost" size="sm" className="text-primary-strong hover:bg-secondary" onClick={() => setReferences(references.filter((_, idx) => idx !== i))}>حذف این معرف</Button>
                  )}
                </FormSection>
              ))}
              {references.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  هنوز معرفی اضافه نشده — افزودن معرف اختیاری است.
                </p>
              )}
              <Button type="button" variant="outline" onClick={() => setReferences([...references, { ...EMPTY_REFERENCE }])}>
                + افزودن معرف
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">🧩</span> فرم ۵ — پرسشنامه سازگاری</CardTitle></CardHeader>
            <CardContent className="space-y-4">
            {CAREGIVER_QUESTIONNAIRE.map((section) => (
              <FormSection key={section.title} title={section.title}>
                  {section.questions.map((q) => (
                    <div key={q.field} className="rounded-lg border border-border p-3">
                      <p className="mb-4 text-lg font-medium">{q.question}</p>
                      <div className="space-y-1.5">
                        {q.options.map((opt) => (
                          <label key={opt.value} className="flex cursor-pointer items-start gap-3 text-base">
                            <input
                              type="radio"
                              name={q.field}
                              checked={questionnaireAnswers[q.field] === opt.value}
                              onChange={() => setQuestionnaireAnswers((prev) => ({ ...prev, [q.field]: opt.value }))}
                              className="mt-0.5 h-4 w-4"
                            />
                            <span>{opt.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </FormSection>
            ))}
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-2 p-3">
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={() => setStep(step - 1)} disabled={saving}>
              مرحله قبل
            </Button>
          )}
          {step === 0 && (
            <Button className="flex-1 bg-gradient-to-l from-primary to-primary shadow-md shadow-primary/20 hover:from-primary hover:to-primary" size="lg" onClick={handleStep0} disabled={saving || !firstName || !lastName || !phone}>
              {saving ? "در حال ذخیره..." : caregiverId ? "ذخیره تغییرات" : "ایجاد و ادامه"}
            </Button>
          )}
          {step === 1 && (
            <Button className="flex-1 bg-gradient-to-l from-primary to-primary shadow-md shadow-primary/20 hover:from-primary hover:to-primary" size="lg" onClick={handleStep1} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره و ادامه"}
            </Button>
          )}
          {step === 2 && (
            <Button className="flex-1 bg-gradient-to-l from-primary to-primary shadow-md shadow-primary/20 hover:from-primary hover:to-primary" size="lg" onClick={handleStep2} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره و ادامه"}
            </Button>
          )}
          {step === 3 && (
            <Button className="flex-1 bg-gradient-to-l from-primary to-primary shadow-md shadow-primary/20 hover:from-primary hover:to-primary" size="lg" onClick={handleStep3} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره و ادامه"}
            </Button>
          )}
          {step === 4 && (
            <Button className="flex-1 bg-gradient-to-l from-primary to-primary shadow-md shadow-primary/20 hover:from-primary hover:to-primary" size="lg" onClick={handleStep4} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره و ادامه"}
            </Button>
          )}
          {step === 5 && (
            <>
              <Button
                className="flex-1 bg-gradient-to-l from-primary to-primary shadow-md shadow-primary/20 hover:from-primary hover:to-primary"
                size="lg" onClick={handleStep5} disabled={saving || Object.keys(questionnaireAnswers).length < 4}
              >
                {saving ? "در حال ذخیره..." : "ذخیره نهایی"}
              </Button>
              <Button variant="outline" size="lg" onClick={handleSkipQuestionnaire} disabled={saving}>
                رد کردن این مرحله
              </Button>
            </>
          )}
        </div>
      </footer>
    </div>
  )

  function updateReference(index: number, patch: Partial<ReferenceFormData>) {
    setReferences(references.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
}


