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

const STEPS = ["اطلاعات پایه", "فرم ۱ — هویتی", "فرم ۲ — شرایط همکاری", "فرم ۳ — سوابق و مهارت", "فرم ۴ — معرف‌ها", "پرسشنامه سازگاری (اختیاری)"]

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
  father_name: "", birth_certificate_number: "", birth_certificate_issue_place: "",
  birth_date: "", gender: "", marital_status: "", children_count: "", military_status: null,
  height_range: "", weight_range: "", ethnicities: [],
  has_chronic_disease: false, chronic_disease_types: [],
  takes_permanent_medication: false, medication_types: [],
  emergency_contact_phone: "", emergency_contact_relation: "", landline_phone: "",
  province: null, city: null, district: null, postal_code: "", full_address: "",
}

const EMPTY_WORK_PREFS: WorkPreferencesFormData = {
  collaboration_types: [], work_status: "", family_presence_preference: "", accepted_gender: "",
  accepted_age_ranges: [], offered_services: [], accepted_physical_conditions: [], lifting_capacity: "",
  service_locations: [], max_commute_time: "", available_days: [], available_shifts: [],
  commute_methods: [], smoking_status: "", pets_ok: null, holiday_work_ok: null, overnight_stay_ok: null,
  terms_accepted: false, night_stay_until: "", has_night_time_limit: null, additional_notes: "",
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
  foreign_languages: [], local_languages: [], has_driving_license: null, can_use_smartphone: null,
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
      // Textareas need Enter to insert a real newline — advancing the
      // whole step on Enter there would make multi-line notes unusable.
      if (target.tagName === "TEXTAREA") return
      e.preventDefault()
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
        maxWidth="max-w-2xl"
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

      <main className="mx-auto max-w-2xl space-y-4 p-4 pb-28">
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
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">🪪</span> فرم ۱ — اطلاعات هویتی</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="نام پدر"><Input value={identity.father_name} onChange={(e) => setIdentity({ ...identity, father_name: e.target.value })} /></Field>
              <Field label="شماره شناسنامه"><Input value={identity.birth_certificate_number} onChange={(e) => setIdentity({ ...identity, birth_certificate_number: e.target.value })} /></Field>
              <Field label="محل صدور شناسنامه"><Input value={identity.birth_certificate_issue_place} onChange={(e) => setIdentity({ ...identity, birth_certificate_issue_place: e.target.value })} /></Field>
              <Field label="تاریخ تولد">
                <JalaliDatePicker value={identity.birth_date} onChange={(v) => setIdentity({ ...identity, birth_date: v })} />
              </Field>
              <Field label="جنسیت"><ChoiceSelect choices={C.GENDER} value={identity.gender} onChange={(v) => setIdentity({ ...identity, gender: v })} /></Field>
              <Field label="وضعیت تأهل"><ChoiceSelect choices={C.MARITAL_STATUS} value={identity.marital_status} onChange={(v) => setIdentity({ ...identity, marital_status: v })} /></Field>
              <Field label="تعداد فرزندان"><ChoiceSelect choices={C.CHILDREN_COUNT} value={identity.children_count} onChange={(v) => setIdentity({ ...identity, children_count: v })} /></Field>
              {identity.gender === "male" && (
                <Field label="وضعیت نظام وظیفه"><ChoiceSelect choices={C.MILITARY_STATUS} value={identity.military_status || ""} onChange={(v) => setIdentity({ ...identity, military_status: v })} /></Field>
              )}

              <SectionHeading>اطلاعات فردی</SectionHeading>
              <Field label="قد"><ChoiceSelect choices={C.HEIGHT_RANGE} value={identity.height_range} onChange={(v) => setIdentity({ ...identity, height_range: v })} /></Field>
              <Field label="وزن"><ChoiceSelect choices={C.WEIGHT_RANGE} value={identity.weight_range} onChange={(v) => setIdentity({ ...identity, weight_range: v })} /></Field>
              <Field label="قومیت / زبان مادری"><CheckboxGroup choices={C.ETHNICITY} value={identity.ethnicities} onChange={(v) => setIdentity({ ...identity, ethnicities: v })} /></Field>

              <SectionHeading>وضعیت سلامت</SectionHeading>
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

              <SectionHeading>اطلاعات تماس</SectionHeading>
              <Field label="شماره تماس اضطراری"><Input value={identity.emergency_contact_phone} onChange={(e) => setIdentity({ ...identity, emergency_contact_phone: e.target.value })} dir="ltr" /></Field>
              <Field label="نسبت فرد اضطراری"><ChoiceSelect choices={C.EMERGENCY_CONTACT_RELATION} value={identity.emergency_contact_relation} onChange={(v) => setIdentity({ ...identity, emergency_contact_relation: v })} /></Field>
              <Field label="تلفن ثابت"><Input value={identity.landline_phone} onChange={(e) => setIdentity({ ...identity, landline_phone: e.target.value })} dir="ltr" /></Field>

              <SectionHeading>محل سکونت</SectionHeading>
              <LocationPicker
                province={identity.province}
                city={identity.city}
                district={identity.district}
                onChange={(v) => setIdentity({ ...identity, ...v })}
              />
              <Field label="کد پستی"><Input value={identity.postal_code} onChange={(e) => setIdentity({ ...identity, postal_code: e.target.value })} dir="ltr" /></Field>
              <Field label="نشانی کامل"><Textarea value={identity.full_address} onChange={(e) => setIdentity({ ...identity, full_address: e.target.value })} /></Field>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">💼</span> فرم ۲ — شرایط همکاری</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="نوع همکاری"><CheckboxGroup choices={C.COLLABORATION_TYPE} value={workPrefs.collaboration_types} onChange={(v) => setWorkPrefs({ ...workPrefs, collaboration_types: v })} /></Field>
              <Field label="وضعیت کاری"><ChoiceSelect choices={C.WORK_STATUS} value={workPrefs.work_status} onChange={(v) => setWorkPrefs({ ...workPrefs, work_status: v })} /></Field>
              <Field label="حضور خانواده سالمند"><ChoiceSelect choices={C.FAMILY_PRESENCE_PREFERENCE} value={workPrefs.family_presence_preference} onChange={(v) => setWorkPrefs({ ...workPrefs, family_presence_preference: v })} /></Field>
              <Field label="جنسیت سالمند قابل قبول"><ChoiceSelect choices={C.ACCEPTED_GENDER} value={workPrefs.accepted_gender} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_gender: v })} /></Field>
              <Field label="بازه سنی سالمند"><CheckboxGroup choices={C.ACCEPTED_AGE_RANGE} value={workPrefs.accepted_age_ranges} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_age_ranges: v })} /></Field>
              <Field label="خدمات قابل ارائه"><CheckboxGroup choices={C.OFFERED_SERVICE} value={workPrefs.offered_services} onChange={(v) => setWorkPrefs({ ...workPrefs, offered_services: v })} /></Field>
              <Field label="شرایط جسمانی سالمند قابل پذیرش"><CheckboxGroup choices={C.ACCEPTED_PHYSICAL_CONDITION} value={workPrefs.accepted_physical_conditions} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_physical_conditions: v })} /></Field>
              <Field label="توانایی جابجایی"><ChoiceSelect choices={C.LIFTING_CAPACITY} value={workPrefs.lifting_capacity} onChange={(v) => setWorkPrefs({ ...workPrefs, lifting_capacity: v })} /></Field>
              <Field label="محل ارائه خدمت"><CheckboxGroup choices={C.SERVICE_LOCATION} value={workPrefs.service_locations} onChange={(v) => setWorkPrefs({ ...workPrefs, service_locations: v })} /></Field>
              <Field label="حداکثر زمان رفت‌وآمد"><ChoiceSelect choices={C.MAX_COMMUTE_TIME} value={workPrefs.max_commute_time} onChange={(v) => setWorkPrefs({ ...workPrefs, max_commute_time: v })} /></Field>
              <Field label="روزهای کاری"><CheckboxGroup choices={C.WEEKDAY} value={workPrefs.available_days} onChange={(v) => setWorkPrefs({ ...workPrefs, available_days: v })} /></Field>
              <Field label="شیفت‌های کاری (شبانه‌روزی با بقیه هم‌زمان انتخاب نشود)" error={fieldErrors.available_shifts}><CheckboxGroup choices={C.SHIFT} value={workPrefs.available_shifts} onChange={(v) => setWorkPrefs({ ...workPrefs, available_shifts: v })} /></Field>
              <Field label="شب تا ساعت چند می‌توانید بمانید؟"><ChoiceSelect choices={C.NIGHT_STAY_UNTIL} value={workPrefs.night_stay_until} onChange={(v) => setWorkPrefs({ ...workPrefs, night_stay_until: v })} /></Field>
              <Field label="آیا برای ماندن در شب محدودیت زمانی دارید؟"><YesNo value={workPrefs.has_night_time_limit} onChange={(v) => setWorkPrefs({ ...workPrefs, has_night_time_limit: v })} /></Field>
              <Field label="روش رفت‌وآمد"><CheckboxGroup choices={C.COMMUTE_METHOD} value={workPrefs.commute_methods} onChange={(v) => setWorkPrefs({ ...workPrefs, commute_methods: v })} /></Field>
              <Field label="وضعیت استعمال دخانیات"><ChoiceSelect choices={C.SMOKING_STATUS} value={workPrefs.smoking_status} onChange={(v) => setWorkPrefs({ ...workPrefs, smoking_status: v })} /></Field>
              <Field label="پذیرش حیوان خانگی در محل کار"><YesNo value={workPrefs.pets_ok} onChange={(v) => setWorkPrefs({ ...workPrefs, pets_ok: v })} /></Field>
              <Field label="امکان کار در تعطیلات"><YesNo value={workPrefs.holiday_work_ok} onChange={(v) => setWorkPrefs({ ...workPrefs, holiday_work_ok: v })} /></Field>
              <Field label="امکان شب‌مانی"><YesNo value={workPrefs.overnight_stay_ok} onChange={(v) => setWorkPrefs({ ...workPrefs, overnight_stay_ok: v })} /></Field>

              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">مناطق خدماتی</p>
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
              </div>

              <Field label="توضیحات تکمیلی (اختیاری)"><Textarea value={workPrefs.additional_notes} onChange={(e) => setWorkPrefs({ ...workPrefs, additional_notes: e.target.value })} /></Field>

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
              <SectionHeading>سوابق کاری</SectionHeading>
              <Field label="سابقه مراقبت از سالمند"><ChoiceSelect choices={C.EXPERIENCE_RANGE} value={experience.elderly_care_experience} onChange={(v) => setExperience({ ...experience, elderly_care_experience: v })} /></Field>
              <Field label="سابقه سایر مشاغل خدماتی"><ChoiceSelect choices={C.EXPERIENCE_RANGE} value={experience.other_services_experience} onChange={(v) => setExperience({ ...experience, other_services_experience: v })} /></Field>
              <Field label="محل‌های سابق فعالیت"><CheckboxGroup choices={C.PREVIOUS_WORKPLACE} value={experience.previous_workplaces} onChange={(v) => setExperience({ ...experience, previous_workplaces: v })} /></Field>
              <Field label="تعداد سالمندان تحت مراقبت تاکنون"><ChoiceSelect choices={C.PATIENTS_CARED_FOR_COUNT} value={experience.patients_cared_for_count} onChange={(v) => setExperience({ ...experience, patients_cared_for_count: v })} /></Field>
              <Field label="تجربه شرایط خاص"><CheckboxGroup choices={C.SPECIAL_CONDITION_EXPERIENCE} value={experience.special_conditions_experience} onChange={(v) => setExperience({ ...experience, special_conditions_experience: v })} /></Field>
              <Field label="سابقه همکاری شبانه‌روزی (مقیم)"><YesNo value={experience.live_in_experience} onChange={(v) => setExperience({ ...experience, live_in_experience: v })} /></Field>
              <Field label="سابقه مراقبت از زوج سالمند"><YesNo value={experience.couple_care_experience} onChange={(v) => setExperience({ ...experience, couple_care_experience: v })} /></Field>
              <Field label="سابقه مراقبت از سالمند تنها"><YesNo value={experience.solo_elderly_care_experience} onChange={(v) => setExperience({ ...experience, solo_elderly_care_experience: v })} /></Field>
              <Field label="سابقه رانندگی برای سالمند"><YesNo value={experience.driving_for_patient_experience} onChange={(v) => setExperience({ ...experience, driving_for_patient_experience: v })} /></Field>
              <Field label="آخرین محل فعالیت"><Input value={experience.last_workplace} onChange={(e) => setExperience({ ...experience, last_workplace: e.target.value })} /></Field>
              <Field label="توضیحات تکمیلی سوابق"><Textarea value={experience.additional_notes} onChange={(e) => setExperience({ ...experience, additional_notes: e.target.value })} /></Field>

              <SectionHeading>مهارت‌ها و آموزش‌ها</SectionHeading>
              <Field label="سطح تحصیلات"><ChoiceSelect choices={C.EDUCATION_LEVEL} value={skills.education_level} onChange={(v) => setSkills({ ...skills, education_level: v })} /></Field>
              <Field label="رشته تحصیلی"><Input value={skills.field_of_study} onChange={(e) => setSkills({ ...skills, field_of_study: e.target.value })} /></Field>
              <Field label="دوره‌های آموزشی گذرانده‌شده"><CheckboxGroup choices={C.TRAINING_COURSE} value={skills.training_courses} onChange={(v) => setSkills({ ...skills, training_courses: v })} /></Field>
              <Field label="مهارت‌های ارتباطی"><CheckboxGroup choices={C.COMMUNICATION_SKILL} value={skills.communication_skills} onChange={(v) => setSkills({ ...skills, communication_skills: v })} /></Field>
              <Field label="مهارت‌های مراقبتی"><CheckboxGroup choices={C.CAREGIVING_SKILL} value={skills.caregiving_skills} onChange={(v) => setSkills({ ...skills, caregiving_skills: v })} /></Field>
              <Field label="توانایی جسمی"><ChoiceSelect choices={C.PHYSICAL_ABILITY} value={skills.physical_ability} onChange={(v) => setSkills({ ...skills, physical_ability: v })} /></Field>
              <Field label="توانایی جابجایی سالمند"><CheckboxGroup choices={C.MOBILITY_ASSISTANCE_ABILITY} value={skills.mobility_assistance_ability} onChange={(v) => setSkills({ ...skills, mobility_assistance_ability: v })} /></Field>
              <Field label="مهارت‌های خانگی"><CheckboxGroup choices={C.HOUSEHOLD_SKILL} value={skills.household_skills} onChange={(v) => setSkills({ ...skills, household_skills: v })} /></Field>
              <Field label="زبان خارجی"><CheckboxGroup choices={C.FOREIGN_LANGUAGE} value={skills.foreign_languages} onChange={(v) => setSkills({ ...skills, foreign_languages: v })} /></Field>
              <Field label="زبان محلی"><CheckboxGroup choices={C.LOCAL_LANGUAGE} value={skills.local_languages} onChange={(v) => setSkills({ ...skills, local_languages: v })} /></Field>
              <Field label="گواهینامه رانندگی"><YesNo value={skills.has_driving_license} onChange={(v) => setSkills({ ...skills, has_driving_license: v })} /></Field>
              <Field label="مهارت کار با تلفن هوشمند"><YesNo value={skills.can_use_smartphone} onChange={(v) => setSkills({ ...skills, can_use_smartphone: v })} /></Field>
              <Field label="توضیحات تکمیلی مهارت‌ها"><Textarea value={skills.additional_notes} onChange={(e) => setSkills({ ...skills, additional_notes: e.target.value })} /></Field>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">📇</span> فرم ۴ — معرف‌ها</CardTitle><p className="text-sm text-muted-foreground">افزودن معرف اختیاری است — هر تعداد که در دسترس دارید کافی است.</p></CardHeader>
            <CardContent className="space-y-6">
              {references.map((ref, i) => (
                <div key={i} className="space-y-3 rounded-md border p-3">
                  <p className="text-sm font-semibold">معرف {i + 1}</p>
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
                </div>
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
          <div className="space-y-4">
            <p className="rounded-lg border border-dashed border-border bg-secondary/40 p-3 text-base text-muted-foreground">
              این پرسشنامه اختیاری است — تکمیل آن در تأیید یا رد پروفایل مراقب تأثیری ندارد، فقط کیفیت پیشنهاد مراقب در بخش «تطابق» را بهبود می‌دهد. هر زمان می‌توانید آن را رد کنید و بعداً از صفحه بررسی مراقب تکمیل کنید.
            </p>
            {CAREGIVER_QUESTIONNAIRE.map((section) => (
              <Card key={section.title}>
                <CardHeader><CardTitle className="text-lg text-foreground">{section.title}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {section.questions.map((q) => (
                    <div key={q.field} className="rounded-lg border border-border p-3">
                      <p className="mb-3 text-base font-medium">{q.question}</p>
                      <div className="space-y-1.5">
                        {q.options.map((opt) => (
                          <label key={opt.value} className="flex cursor-pointer items-start gap-2.5 text-sm">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2 p-3">
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
                size="lg" onClick={handleStep5} disabled={saving || Object.keys(questionnaireAnswers).length < 16}
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


