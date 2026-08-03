"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Field, ChoiceSelect, CheckboxGroup, YesNo } from "@/components/forms/fields"
import { useAuth } from "@/hooks/useauth"
import { caregiverService } from "@/services/caregiver.service"
import { ROUTES } from "@/lib/routes"
import * as C from "@/lib/constants"
import type {
  ExperienceFormData, IdentityFormData, ReferenceFormData, ServiceArea,
  SkillsFormData, WorkPreferencesFormData,
} from "@/types/caregiver"

const STEPS = ["اطلاعات پایه", "فرم ۱ — هویتی", "فرم ۲ — شرایط همکاری", "فرم ۳ — سوابق و مهارت", "فرم ۴ — معرف‌ها"]

const EMPTY_IDENTITY: IdentityFormData = {
  father_name: "", birth_certificate_number: "", birth_certificate_issue_place: "",
  birth_date: "", gender: "", marital_status: "", children_count: "", military_status: null,
  height_range: "", weight_range: "", ethnicities: [],
  has_chronic_disease: false, chronic_disease_types: [],
  takes_permanent_medication: false, medication_types: [],
  emergency_contact_phone: "", emergency_contact_relation: "", landline_phone: "",
  province: "", city: "", district: "", postal_code: "", full_address: "",
}

const EMPTY_WORK_PREFS: WorkPreferencesFormData = {
  collaboration_types: [], work_status: "", family_presence_preference: "", accepted_gender: "",
  accepted_age_ranges: [], offered_services: [], accepted_physical_conditions: [], lifting_capacity: "",
  service_locations: [], max_commute_time: "", available_days: [], available_shifts: [],
  commute_methods: [], smoking_status: "", pets_ok: null, holiday_work_ok: null, overnight_stay_ok: null,
  terms_accepted: false,
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
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const existingId = searchParams.get("id")

  const [step, setStep] = useState(0)
  const [caregiverId, setCaregiverId] = useState<number | null>(existingId ? Number(existingId) : null)
  const [caregiverName, setCaregiverName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  // Step 0 fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")

  const [identity, setIdentity] = useState<IdentityFormData>(EMPTY_IDENTITY)
  const [workPrefs, setWorkPrefs] = useState<WorkPreferencesFormData>(EMPTY_WORK_PREFS)
  const [areas, setAreas] = useState<ServiceArea[]>([])
  const [newArea, setNewArea] = useState<ServiceArea>({ province: "", city: "", district: "" })
  const [experience, setExperience] = useState<ExperienceFormData>(EMPTY_EXPERIENCE)
  const [skills, setSkills] = useState<SkillsFormData>(EMPTY_SKILLS)
  const [references, setReferences] = useState<ReferenceFormData[]>([{ ...EMPTY_REFERENCE }, { ...EMPTY_REFERENCE }])

  // Resume an in-progress caregiver: load whatever's already saved for each step.
  useEffect(() => {
    if (!caregiverId) return
    caregiverService.progress(caregiverId).then((p) => setCaregiverName(p.full_name))
    caregiverService.getIdentity(caregiverId).then(setIdentity).catch(() => {})
    caregiverService.getWorkPreferences(caregiverId).then(setWorkPrefs).catch(() => {})
    caregiverService.listServiceAreas(caregiverId).then(setAreas).catch(() => {})
    caregiverService.getExperience(caregiverId).then(setExperience).catch(() => {})
    caregiverService.getSkills(caregiverId).then(setSkills).catch(() => {})
    caregiverService.getReferences(caregiverId).then((refs) => {
      if (refs.length >= 2) setReferences(refs)
    }).catch(() => {})
  }, [caregiverId])

  if (authLoading) return null

  async function handleStep0() {
    setError(""); setSaving(true)
    try {
      const result = await caregiverService.create({ first_name: firstName, last_name: lastName, phone_number: phone })
      setCaregiverId(result.user_id)
      setCaregiverName(result.full_name)
      setStep(1)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "خطا در ایجاد حساب مراقب.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep1() {
    if (!caregiverId) return
    setError(""); setSaving(true)
    try {
      await caregiverService.saveIdentity(caregiverId, identity)
      setStep(2)
    } catch (err: any) {
      setError(firstApiError(err) || "لطفاً همه فیلدهای الزامی را تکمیل کنید.")
    } finally {
      setSaving(false)
    }
  }

  async function handleAddArea() {
    if (!caregiverId || !newArea.province) return
    const created = await caregiverService.addServiceArea(caregiverId, newArea)
    setAreas([...areas, created])
    setNewArea({ province: "", city: "", district: "" })
  }

  async function handleStep2() {
    if (!caregiverId) return
    setError(""); setSaving(true)
    try {
      await caregiverService.saveWorkPreferences(caregiverId, workPrefs)
      setStep(3)
    } catch (err: any) {
      setError(firstApiError(err) || "لطفاً همه فیلدهای الزامی را تکمیل کنید.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep3() {
    if (!caregiverId) return
    setError(""); setSaving(true)
    try {
      await caregiverService.saveExperience(caregiverId, experience)
      await caregiverService.saveSkills(caregiverId, skills)
      setStep(4)
    } catch (err: any) {
      setError(firstApiError(err) || "لطفاً همه فیلدهای الزامی را تکمیل کنید.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep4() {
    if (!caregiverId) return
    setError(""); setSaving(true)
    try {
      await caregiverService.saveReferences(caregiverId, references)
      setDone(true)
    } catch (err: any) {
      setError(firstApiError(err) || "حداقل دو معرف با اطلاعات کامل لازم است.")
    } finally {
      setSaving(false)
    }
  }

  function startNext() {
    setStep(0); setCaregiverId(null); setCaregiverName(""); setDone(false); setError("")
    setFirstName(""); setLastName(""); setPhone("")
    setIdentity(EMPTY_IDENTITY); setWorkPrefs(EMPTY_WORK_PREFS); setAreas([])
    setExperience(EMPTY_EXPERIENCE); setSkills(EMPTY_SKILLS)
    setReferences([{ ...EMPTY_REFERENCE }, { ...EMPTY_REFERENCE }])
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 p-8">
            <div className="text-4xl">✓</div>
            <h2 className="text-xl font-bold">اطلاعات {caregiverName} با موفقیت ثبت شد</h2>
            <div className="flex flex-col gap-2">
              <Button size="lg" onClick={startNext}>+ افزودن مراقب بعدی</Button>
              <Button variant="outline" onClick={() => router.push(ROUTES.dashboard)}>بازگشت به لیست</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto max-w-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="font-bold">{caregiverName || "مراقب جدید"}</h1>
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
          </div>
          <Progress value={(step / (STEPS.length - 1)) * 100} />
          <p className="mt-1 text-sm text-muted-foreground">
            مرحله {step + 1} از {STEPS.length} — {STEPS[step]}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {step === 0 && (
          <Card>
            <CardHeader><CardTitle>اطلاعات پایه حساب</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="نام" required><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
              <Field label="نام خانوادگی" required><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
              <Field label="شماره موبایل" required>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" dir="ltr" />
              </Field>
              <p className="text-xs text-muted-foreground">نام کاربری و رمز عبور به‌صورت خودکار ساخته می‌شود.</p>
              <Button className="w-full" size="lg" onClick={handleStep0} disabled={saving || !firstName || !lastName || !phone}>
                {saving ? "در حال ایجاد..." : "ایجاد و ادامه"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>فرم ۱ — اطلاعات هویتی</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="نام پدر" required><Input value={identity.father_name} onChange={(e) => setIdentity({ ...identity, father_name: e.target.value })} /></Field>
              <Field label="شماره شناسنامه" required><Input value={identity.birth_certificate_number} onChange={(e) => setIdentity({ ...identity, birth_certificate_number: e.target.value })} /></Field>
              <Field label="محل صدور شناسنامه" required><Input value={identity.birth_certificate_issue_place} onChange={(e) => setIdentity({ ...identity, birth_certificate_issue_place: e.target.value })} /></Field>
              <Field label="تاریخ تولد (شمسی، مثلاً ۱۳۶۰-۰۱-۰۱)" required>
                <Input value={identity.birth_date} onChange={(e) => setIdentity({ ...identity, birth_date: e.target.value })} placeholder="1360-01-01" dir="ltr" />
              </Field>
              <Field label="جنسیت" required><ChoiceSelect choices={C.GENDER} value={identity.gender} onChange={(v) => setIdentity({ ...identity, gender: v })} /></Field>
              <Field label="وضعیت تأهل" required><ChoiceSelect choices={C.MARITAL_STATUS} value={identity.marital_status} onChange={(v) => setIdentity({ ...identity, marital_status: v })} /></Field>
              <Field label="تعداد فرزندان" required><ChoiceSelect choices={C.CHILDREN_COUNT} value={identity.children_count} onChange={(v) => setIdentity({ ...identity, children_count: v })} /></Field>
              {identity.gender === "male" && (
                <Field label="وضعیت نظام وظیفه"><ChoiceSelect choices={C.MILITARY_STATUS} value={identity.military_status || ""} onChange={(v) => setIdentity({ ...identity, military_status: v })} /></Field>
              )}
              <Field label="قد"><ChoiceSelect choices={C.HEIGHT_RANGE} value={identity.height_range} onChange={(v) => setIdentity({ ...identity, height_range: v })} /></Field>
              <Field label="وزن"><ChoiceSelect choices={C.WEIGHT_RANGE} value={identity.weight_range} onChange={(v) => setIdentity({ ...identity, weight_range: v })} /></Field>
              <Field label="قومیت / زبان مادری"><CheckboxGroup choices={C.ETHNICITY} value={identity.ethnicities} onChange={(v) => setIdentity({ ...identity, ethnicities: v })} /></Field>

              <Field label="آیا بیماری زمینه‌ای دارد؟" required><YesNo value={identity.has_chronic_disease} onChange={(v) => setIdentity({ ...identity, has_chronic_disease: !!v })} /></Field>
              {identity.has_chronic_disease && (
                <Field label="نوع بیماری" required><CheckboxGroup choices={C.CHRONIC_DISEASE_TYPE} value={identity.chronic_disease_types} onChange={(v) => setIdentity({ ...identity, chronic_disease_types: v })} /></Field>
              )}
              <Field label="آیا داروی دائمی مصرف می‌کند؟"><YesNo value={identity.takes_permanent_medication} onChange={(v) => setIdentity({ ...identity, takes_permanent_medication: !!v })} /></Field>
              {identity.takes_permanent_medication && (
                <Field label="نوع دارو" required><CheckboxGroup choices={C.MEDICATION_TYPE} value={identity.medication_types} onChange={(v) => setIdentity({ ...identity, medication_types: v })} /></Field>
              )}

              <Field label="شماره تماس اضطراری" required><Input value={identity.emergency_contact_phone} onChange={(e) => setIdentity({ ...identity, emergency_contact_phone: e.target.value })} dir="ltr" /></Field>
              <Field label="نسبت فرد اضطراری" required><ChoiceSelect choices={C.EMERGENCY_CONTACT_RELATION} value={identity.emergency_contact_relation} onChange={(v) => setIdentity({ ...identity, emergency_contact_relation: v })} /></Field>
              <Field label="تلفن ثابت"><Input value={identity.landline_phone} onChange={(e) => setIdentity({ ...identity, landline_phone: e.target.value })} dir="ltr" /></Field>

              <Field label="استان" required><Input value={identity.province} onChange={(e) => setIdentity({ ...identity, province: e.target.value })} /></Field>
              <Field label="شهر" required><Input value={identity.city} onChange={(e) => setIdentity({ ...identity, city: e.target.value })} /></Field>
              <Field label="منطقه" required><Input value={identity.district} onChange={(e) => setIdentity({ ...identity, district: e.target.value })} /></Field>
              <Field label="کد پستی" required><Input value={identity.postal_code} onChange={(e) => setIdentity({ ...identity, postal_code: e.target.value })} dir="ltr" /></Field>
              <Field label="نشانی کامل" required><Textarea value={identity.full_address} onChange={(e) => setIdentity({ ...identity, full_address: e.target.value })} /></Field>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(0)}>قبلی</Button>
                <Button className="flex-1" onClick={handleStep1} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره و ادامه"}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader><CardTitle>فرم ۲ — شرایط همکاری</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="نوع همکاری" required><CheckboxGroup choices={C.COLLABORATION_TYPE} value={workPrefs.collaboration_types} onChange={(v) => setWorkPrefs({ ...workPrefs, collaboration_types: v })} /></Field>
              <Field label="وضعیت کاری" required><ChoiceSelect choices={C.WORK_STATUS} value={workPrefs.work_status} onChange={(v) => setWorkPrefs({ ...workPrefs, work_status: v })} /></Field>
              <Field label="حضور خانواده سالمند" required><ChoiceSelect choices={C.FAMILY_PRESENCE_PREFERENCE} value={workPrefs.family_presence_preference} onChange={(v) => setWorkPrefs({ ...workPrefs, family_presence_preference: v })} /></Field>
              <Field label="جنسیت سالمند قابل قبول" required><ChoiceSelect choices={C.ACCEPTED_GENDER} value={workPrefs.accepted_gender} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_gender: v })} /></Field>
              <Field label="بازه سنی سالمند" required><CheckboxGroup choices={C.ACCEPTED_AGE_RANGE} value={workPrefs.accepted_age_ranges} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_age_ranges: v })} /></Field>
              <Field label="خدمات قابل ارائه" required><CheckboxGroup choices={C.OFFERED_SERVICE} value={workPrefs.offered_services} onChange={(v) => setWorkPrefs({ ...workPrefs, offered_services: v })} /></Field>
              <Field label="شرایط جسمانی سالمند قابل پذیرش" required><CheckboxGroup choices={C.ACCEPTED_PHYSICAL_CONDITION} value={workPrefs.accepted_physical_conditions} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_physical_conditions: v })} /></Field>
              <Field label="توانایی جابجایی" required><ChoiceSelect choices={C.LIFTING_CAPACITY} value={workPrefs.lifting_capacity} onChange={(v) => setWorkPrefs({ ...workPrefs, lifting_capacity: v })} /></Field>
              <Field label="محل ارائه خدمت" required><CheckboxGroup choices={C.SERVICE_LOCATION} value={workPrefs.service_locations} onChange={(v) => setWorkPrefs({ ...workPrefs, service_locations: v })} /></Field>
              <Field label="حداکثر زمان رفت‌وآمد"><ChoiceSelect choices={C.MAX_COMMUTE_TIME} value={workPrefs.max_commute_time} onChange={(v) => setWorkPrefs({ ...workPrefs, max_commute_time: v })} /></Field>
              <Field label="روزهای کاری" required><CheckboxGroup choices={C.WEEKDAY} value={workPrefs.available_days} onChange={(v) => setWorkPrefs({ ...workPrefs, available_days: v })} /></Field>
              <Field label="شیفت‌های کاری (شبانه‌روزی با بقیه هم‌زمان انتخاب نشود)" required><CheckboxGroup choices={C.SHIFT} value={workPrefs.available_shifts} onChange={(v) => setWorkPrefs({ ...workPrefs, available_shifts: v })} /></Field>
              <Field label="روش رفت‌وآمد"><CheckboxGroup choices={C.COMMUTE_METHOD} value={workPrefs.commute_methods} onChange={(v) => setWorkPrefs({ ...workPrefs, commute_methods: v })} /></Field>
              <Field label="وضعیت استعمال دخانیات"><ChoiceSelect choices={C.SMOKING_STATUS} value={workPrefs.smoking_status} onChange={(v) => setWorkPrefs({ ...workPrefs, smoking_status: v })} /></Field>
              <Field label="پذیرش حیوان خانگی در محل کار"><YesNo value={workPrefs.pets_ok} onChange={(v) => setWorkPrefs({ ...workPrefs, pets_ok: v })} /></Field>
              <Field label="امکان کار در تعطیلات"><YesNo value={workPrefs.holiday_work_ok} onChange={(v) => setWorkPrefs({ ...workPrefs, holiday_work_ok: v })} /></Field>
              <Field label="امکان شب‌مانی"><YesNo value={workPrefs.overnight_stay_ok} onChange={(v) => setWorkPrefs({ ...workPrefs, overnight_stay_ok: v })} /></Field>

              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">مناطق خدماتی</p>
                <div className="mb-2 space-y-2">
                  {areas.map((a, i) => (
                    <div key={a.id ?? i} className="flex items-center justify-between rounded bg-muted p-2 text-sm">
                      <span>{a.province} / {a.city} / {a.district}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input placeholder="استان" className="w-28" value={newArea.province} onChange={(e) => setNewArea({ ...newArea, province: e.target.value })} />
                  <Input placeholder="شهر" className="w-28" value={newArea.city} onChange={(e) => setNewArea({ ...newArea, city: e.target.value })} />
                  <Input placeholder="منطقه" className="w-28" value={newArea.district} onChange={(e) => setNewArea({ ...newArea, district: e.target.value })} />
                  <Button type="button" variant="outline" onClick={handleAddArea}>+ افزودن</Button>
                </div>
              </div>

              <Field label="پذیرش قوانین و مسئولیت اطلاعات" required>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={workPrefs.terms_accepted} onChange={(e) => setWorkPrefs({ ...workPrefs, terms_accepted: e.target.checked })} className="accent-primary" />
                  اطلاعات فوق تأیید و مسئولیت صحت آن پذیرفته می‌شود.
                </label>
              </Field>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>قبلی</Button>
                <Button className="flex-1" onClick={handleStep2} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره و ادامه"}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader><CardTitle>فرم ۳ — سوابق کاری و مهارت‌ها</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground">سوابق کاری</p>
              <Field label="سابقه مراقبت از سالمند" required><ChoiceSelect choices={C.EXPERIENCE_RANGE} value={experience.elderly_care_experience} onChange={(v) => setExperience({ ...experience, elderly_care_experience: v })} /></Field>
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

              <p className="pt-2 text-sm font-semibold text-muted-foreground">مهارت‌ها و آموزش‌ها</p>
              <Field label="سطح تحصیلات" required><ChoiceSelect choices={C.EDUCATION_LEVEL} value={skills.education_level} onChange={(v) => setSkills({ ...skills, education_level: v })} /></Field>
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

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>قبلی</Button>
                <Button className="flex-1" onClick={handleStep3} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره و ادامه"}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader><CardTitle>فرم ۴ — معرف‌ها (حداقل دو مورد)</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {references.map((ref, i) => (
                <div key={i} className="space-y-3 rounded-md border p-3">
                  <p className="text-sm font-semibold">معرف {i + 1}</p>
                  <Field label="نام و نام خانوادگی" required>
                    <Input value={ref.full_name} onChange={(e) => updateReference(i, { full_name: e.target.value })} />
                  </Field>
                  <Field label="شغل معرف" required>
                    <Input value={ref.occupation} onChange={(e) => updateReference(i, { occupation: e.target.value })} />
                  </Field>
                  <Field label="نوع ارتباط" required>
                    <ChoiceSelect choices={C.REFERENCE_RELATION_TYPE} value={ref.relation_type} onChange={(v) => updateReference(i, { relation_type: v })} />
                  </Field>
                  <Field label="مدت آشنایی">
                    <ChoiceSelect choices={C.ACQUAINTANCE_DURATION} value={ref.acquaintance_duration} onChange={(v) => updateReference(i, { acquaintance_duration: v })} />
                  </Field>
                  <Field label="شماره تماس" required>
                    <Input value={ref.phone_number} onChange={(e) => updateReference(i, { phone_number: e.target.value })} dir="ltr" />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={ref.callable_for_inquiry} onChange={(e) => updateReference(i, { callable_for_inquiry: e.target.checked })} className="accent-primary" />
                    امکان تماس جهت استعلام
                  </label>
                  {references.length > 2 && (
                    <Button variant="ghost" size="sm" onClick={() => setReferences(references.filter((_, idx) => idx !== i))}>حذف این معرف</Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setReferences([...references, { ...EMPTY_REFERENCE }])}>
                + افزودن معرف بیشتر
              </Button>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(3)}>قبلی</Button>
                <Button className="flex-1" onClick={handleStep4} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره نهایی"}</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )

  function updateReference(index: number, patch: Partial<ReferenceFormData>) {
    setReferences(references.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
}

function firstApiError(err: any): string | null {
  const data = err?.response?.data
  if (!data) return null
  if (typeof data.detail === "string") return data.detail
  const firstKey = Object.keys(data)[0]
  if (firstKey) {
    const val = data[firstKey]
    return Array.isArray(val) ? `${firstKey}: ${val[0]}` : String(val)
  }
  return null
}
