"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Field, ChoiceSelect, CheckboxGroup, YesNo } from "@/components/wizard-forms/fields"
import { LocationPicker } from "@/components/wizard-forms/location-picker"
import { JalaliDatePicker } from "@/components/wizard-forms/jalali-date-picker"
import { FormSection } from "@/components/wizard-forms/form-section"
import { jalaliAge } from "@/lib/jalali"
import { ErrorSummary } from "@/components/wizard-forms/error-summary"
import { StepIndicator } from "@/components/wizard-forms/step-indicator"
import { AppHeader } from "@/components/layout/app-header"
import { parseApiErrors, errorsByField, referenceFieldError, type ApiFieldError } from "@/lib/field-labels"
import { useAuth } from "@/hooks/useauth"
import { caregiverWizardService } from "@/services/caregiver_wizard.service"
import { CAREGIVER_QUESTIONNAIRE } from "@/lib/compatibility-questionnaire"
import { ROUTES } from "@/lib/routes"
import * as C from "@/lib/wizard-constants"
import type {
  ExperienceFormData, IdentityFormData, ReferenceFormData, ServiceArea,
  SkillsFormData, WorkPreferencesFormData,
} from "@/types/caregiver"

// Continues a caregiver candidate's 4-form registration wizard, right
// here in agency-panel — ported from the separate supervisor.moraqebman.ir
// panel's own wizard (same 4 forms + optional compatibility
// questionnaire, same backend endpoints) so agency staff no longer
// have to leave this panel and log into a different subdomain
// mid-flow. Unlike that original, the caregiver ALWAYS already
// exists by the time this page opens — the account itself is created
// from the Kanban card ("+ افزودن خدمت‌دهنده" in caregivers/page.tsx),
// so there's no "step 0: create account" branch to a brand-new id;
// step 0 here is edit-only (fixing a typo in the name/phone).
const STEPS = ["اطلاعات پایه", "نوع خدمت", "فرم ۱ — هویتی", "فرم ۲ — شرایط همکاری", "فرم ۳ — سوابق و مهارت", "فرم ۴ — معرف‌ها", "پرسشنامه سازگاری (اختیاری)"]

// service type -> its subtype choice list (SALMANDYAR has none —
// it's the original, already-built flow with no subtypes of its own).
const SUBTYPE_CHOICES_BY_SERVICE_TYPE: Record<string, C.Choice[]> = {
  nezafatchi: C.NEZAFATCHI_SUBTYPE,
  madaryar: C.MADARYAR_SUBTYPE,
  // parastar's own subtype choice PLUS, only once "specialized_nurse"
  // is picked, the specialty list — handled specially in the render
  // below rather than flattened here, since that second list is
  // conditional on a specific value within this same type.
  parastar: C.PARASTAR_SUBTYPE,
  behyar: C.BEHYAR_SUBTYPE,
}

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
  nursing_license_number: "", extra_phone_numbers: [],
  birth_date: "", gender: "", marital_status: "", children_count: "",
  has_children: null, currently_caring_for_own_child: null, military_status: null,
  height_range: "", weight_range: "", ethnicities: [], is_non_iranian_national: null, nationality_country: "",
  has_chronic_disease: false, chronic_disease_types: [], chronic_disease_detail: "",
  takes_permanent_medication: false, medication_types: [], medication_detail: "", psychiatric_medication_detail: "",
  emergency_contact_phone: "", emergency_contact_relation: "", landline_phone: "",
  province: null, city: null, district: null, postal_code: "", full_address: "",
}

const EMPTY_WORK_PREFS: WorkPreferencesFormData = {
  collaboration_types: [], daily_work_hours: "", work_status: "", family_presence_preference: "", accepted_gender: "",
  accepted_age_ranges: [], offered_services: [], accepted_physical_conditions: [], lifting_capacity: "",
  service_locations: [], max_commute_time: "", available_days: [], available_shifts: [],
  commute_methods: [], smoking_status: "", pets_ok: null, holiday_work_ok: null, overnight_stay_ok: null,
  problem_with_single_father: null, problem_with_single_mother: null, problem_with_father_present_at_home: null,
  problem_with_grandparent_or_relative_at_home: null, problem_with_home_camera: null,
  problem_with_dog: null, problem_with_cat: null, pets_other_notes: "",
  problem_with_domestic_travel: null, problem_with_international_travel: null,
  problem_without_private_room: null, pay_basis: "",
  terms_accepted: false, night_stay_until: "", has_night_time_limit: null, additional_notes: "",
  requested_salary: "", cleaning_willingness: "", day_off_request: "", serves_all_areas: false,
  service_specific_answers: {},
}

const EMPTY_EXPERIENCE: ExperienceFormData = {
  elderly_care_experience: "", other_services_experience: "", previous_workplaces: [],
  patients_cared_for_count: "", special_conditions_experience: [], live_in_experience: null,
  couple_care_experience: null, solo_elderly_care_experience: null, driving_for_patient_experience: null,
  last_workplace: "", additional_notes: "", service_specific_answers: {},
}

const EMPTY_SKILLS: SkillsFormData = {
  education_level: "", field_of_study: "", training_courses: [], communication_skills: [],
  caregiving_skills: [], physical_ability: "", mobility_assistance_ability: [], household_skills: [],
  foreign_languages: [], local_languages: [], local_language_fluency: "", english_level: "", arabic_level: "", other_languages_detail: "",
  has_driving_license: null, can_use_smartphone: null,
  additional_notes: "",
}

const EMPTY_REFERENCE: ReferenceFormData = {
  full_name: "", occupation: "", relation_type: "", acquaintance_duration: "",
  phone_number: "", callable_for_inquiry: true,
}

export default function CaregiverRegistrationWizard() {
  const { loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const router = useRouter()
  const params = useParams()
  const caregiverId = Number(params.id)

  const [step, setStep] = useState(0)
  const [caregiverName, setCaregiverName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ApiFieldError[]>([])
  const fieldErrors = errorsByField(error)
  const [done, setDone] = useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")

  const [identity, setIdentity] = useState<IdentityFormData>(EMPTY_IDENTITY)
  const [workPrefs, setWorkPrefs] = useState<WorkPreferencesFormData>(EMPTY_WORK_PREFS)
  const [areas, setAreas] = useState<ServiceArea[]>([])
  const [newArea, setNewArea] = useState<ServiceArea>({ province: null, city: null, district: null })
  const [experience, setExperience] = useState<ExperienceFormData>(EMPTY_EXPERIENCE)
  const [skills, setSkills] = useState<SkillsFormData>(EMPTY_SKILLS)
  // Per-language proficiency for any foreign language selected besides
  // English/Arabic (which have their own dedicated model fields) —
  // keyed by language code, rendered as one level Select per selected
  // language instead of asking the caregiver to type "Language - Level"
  // into free text. Composed into skills.other_languages_detail.
  const [otherLangLevels, setOtherLangLevels] = useState<Record<string, string>>({})
  // Free text for the "سایر" (other) foreign-language option only —
  // kept separate from otherLangLevels so the two don't stomp each
  // other when composing other_languages_detail.
  const [otherLangFreeText, setOtherLangFreeText] = useState("")
  const composeOtherLanguagesDetail = (levels: Record<string, string>, freeText: string, languages: string[]) => {
    const dropdownPart = languages
      .filter((c) => c !== "english" && c !== "arabic" && c !== "other" && levels[c])
      .map((c) => `${C.FOREIGN_LANGUAGE.find((x) => x[0] === c)?.[1] || c} - ${C.LANGUAGE_LEVEL.find((l) => l[0] === levels[c])?.[1] || levels[c]}`)
      .join("، ")
    return [dropdownPart, freeText].filter(Boolean).join(dropdownPart && freeText ? "، " : "")
  }
  const [references, setReferences] = useState<ReferenceFormData[]>([{ ...EMPTY_REFERENCE }])
  // Flat {field: "0"|"50"|"100"} for the 4 common questions, PLUS a
  // nested service_specific_answers: {service_type: {field: value}}
  // key for the per-type extras below — both flow through this one
  // object untouched on load/save since the backend's GET/PUT already
  // treat it as one flat payload (see caregiverWizardService's
  // get/saveCompatibilityQuestionnaire).
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, any>>({})
  const [serviceTypes, setServiceTypes] = useState<string[]>([])
  const [serviceSubtypes, setServiceSubtypes] = useState<Record<string, string[]>>({})

  // Load whatever's already saved for this (always pre-existing)
  // caregiver — same resume-in-progress logic as the original wizard.
  useEffect(() => {
    if (!caregiverId) return
    caregiverWizardService.getBasicInfo(caregiverId).then((info) => {
      setFirstName(info.first_name)
      setLastName(info.last_name)
      setPhone(info.phone_number)
    }).catch(() => {})
    caregiverWizardService.progress(caregiverId).then((p) => setCaregiverName(p.full_name))
    caregiverWizardService.getServiceTypes(caregiverId).then((st) => {
      setServiceTypes(st.service_types)
      setServiceSubtypes(st.service_subtypes)
    }).catch(() => {})
    caregiverWizardService.getIdentity(caregiverId).then(setIdentity).catch(() => {})
    caregiverWizardService.getWorkPreferences(caregiverId).then(setWorkPrefs).catch(() => {})
    caregiverWizardService.listServiceAreas(caregiverId).then(setAreas).catch(() => {})
    caregiverWizardService.getExperience(caregiverId).then(setExperience).catch(() => {})
    caregiverWizardService.getSkills(caregiverId).then(setSkills).catch(() => {})
    caregiverWizardService.getReferences(caregiverId).then((refs) => {
      if (refs.length > 0) setReferences(refs)
    }).catch(() => {})
    caregiverWizardService.getCompatibilityQuestionnaire(caregiverId).then((data) => {
      const { section_scores, overall_flexibility_score, updated_at, ...answers } = data
      setQuestionnaireAnswers(answers)
    }).catch(() => {})
    // Land straight on the service-type step — the account already
    // exists, so there's no "step 0: create account" to show first.
    // Every step (including this one) stays reachable via the step
    // indicator.
    setStep(1)
  }, [caregiverId])

  // Same Enter-to-advance / smart-next-field keyboard navigation as
  // the original wizard — see its own comment for why advanceRef is
  // refreshed every render instead of just when `step` changes.
  const advanceRef = useRef<() => void>(() => {})
  useEffect(() => {
    advanceRef.current = () => {
      if (saving) return
      if (step === 0) handleStep0()
      else if (step === 1) handleServiceTypesStep()
      else if (step === 2) handleStep1()
      else if (step === 3) handleStep2()
      else if (step === 4) handleStep3()
      else if (step === 5) handleStep4()
      else if (step === 6) handleStep5()
    }
  })

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter") return
      const target = e.target as HTMLElement
      if (target.tagName === "TEXTAREA") return
      e.preventDefault()

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

  // Sets one field inside a service type's own answers slot of a
  // service_specific_answers: {service_type: {field: value}} dict —
  // shared by the Form 2 (workPrefs), Form 3 (experience) and
  // questionnaire sections below, which all store their per-type
  // extras in exactly this shape.
  function setServiceAnswer(
    current: Record<string, Record<string, any>>,
    onChange: (next: Record<string, Record<string, any>>) => void,
    serviceType: string, field: string, value: any,
  ) {
    onChange({ ...current, [serviceType]: { ...(current[serviceType] ?? {}), [field]: value } })
  }

  // Renders one Field+control for a single ServiceSpecificField
  // (SERVICE_SPECIFIC_FORMS entry), reused across Form 2/3/the
  // questionnaire so each of those only needs to loop + call this.
  function ServiceFieldControl({ field, value, onChange }: {
    field: C.ServiceSpecificField
    value: any
    onChange: (value: any) => void
  }) {
    if (field.type === "choice") {
      return <Field label={field.label}><ChoiceSelect choices={field.choices ?? []} value={value ?? ""} onChange={onChange} /></Field>
    }
    if (field.type === "multi") {
      return <Field label={field.label}><CheckboxGroup choices={field.choices ?? []} value={value ?? []} onChange={onChange} /></Field>
    }
    if (field.type === "bool") {
      return <Field label={field.label}><YesNo value={value ?? null} onChange={onChange} /></Field>
    }
    if (field.type === "score") {
      return (
        <Field label={field.label}>
          <ChoiceSelect choices={C.SCORE_OPTIONS} value={value ?? ""} onChange={onChange} />
        </Field>
      )
    }
    return <Field label={field.label}><Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></Field>
  }

  // One stacked section per selected service type, for a given form
  // ("form2" | "form3" | "questionnaire") — each field's showIf is
  // checked against that type's own chosen subtypes/specialties
  // (serviceSubtypes[type], a flat list for every type including
  // پرستار's merged subtype+specialty values). سالمندیار is included
  // here too now (it has its own SERVICE_SPECIFIC_FORMS.salmandyar
  // entry) alongside its existing universal/real-model-field
  // sections below — those aren't duplicated here.
  // showIfField checks a sibling field's CURRENT stored value (within
  // the same service_specific_answers[type] bucket) instead of the
  // top-level subtype list — needed for a field that depends on an
  // activity checkbox (e.g. hosting_etiquette_level depending on
  // indoor_activities including "hosting") rather than a service
  // subtype.
  // `fallbackAnswers`: فیلدی در فرم ۳/پرسشنامه ممکن است به پاسخ فرم ۲ وابسته
  // باشد (مثلاً مرحله‌ی همراهی با نوزاد که در فرم ۲ پرسیده می‌شود).
  function matchesShowIfField(
    f: C.ServiceSpecificField,
    typeAnswers: Record<string, any>,
    fallbackAnswers: Record<string, any> = {},
  ) {
    if (!f.showIfField) return true
    const v = typeAnswers?.[f.showIfField.key] ?? fallbackAnswers?.[f.showIfField.key]
    // A bool-type sibling field (e.g. is_non_iranian_national) stores a
    // real boolean, not "true"/"false" strings — normalize so oneOf can
    // still match it with string literals.
    const raw = typeof v === "boolean" ? String(v) : v
    const values: string[] = Array.isArray(raw) ? raw : raw != null ? [raw] : []
    return values.some((x) => f.showIfField!.oneOf.includes(x))
  }

  function renderServiceSpecificSections(
    formKey: "form2" | "form3" | "questionnaire",
    current: Record<string, Record<string, any>>,
    onChange: (next: Record<string, Record<string, any>>) => void,
  ) {
    const applicableTypes = serviceTypes.filter((t) => C.SERVICE_SPECIFIC_FORMS[t]?.[formKey]?.length)
    if (applicableTypes.length === 0) return null
    return (
      <>
        {applicableTypes.map((type) => {
          const typeLabel = C.ALL_SERVICE_TYPE.find((c) => c[0] === type)?.[1] ?? type
          const chosenSubtypes = serviceSubtypes[type] ?? []
          const typeAnswers = current[type] ?? {}
          const fields = C.SERVICE_SPECIFIC_FORMS[type][formKey]
            .filter((f) => !f.showIf || f.showIf.some((s) => chosenSubtypes.includes(s)))
            .filter((f) => matchesShowIfField(f, typeAnswers, workPrefs.service_specific_answers[type] ?? {}))
          if (fields.length === 0) return null
          return (
            <div key={type}>
              <SectionHeading>سوالات مخصوص {typeLabel}</SectionHeading>
              {fields.map((f) => (
                <ServiceFieldControl
                  key={f.key}
                  field={f}
                  value={current[type]?.[f.key]}
                  onChange={(v) => setServiceAnswer(current, onChange, type, f.key, v)}
                />
              ))}
            </div>
          )
        })}
      </>
    )
  }

  async function handleStep0() {
    setError([]); setSaving(true)
    try {
      const result = await caregiverWizardService.updateBasicInfo(caregiverId, { first_name: firstName, last_name: lastName, phone_number: phone })
      setCaregiverName(`${result.first_name} ${result.last_name}`.trim())
      setStep(1)
    } catch (err: any) {
      showErrors(err, "خطا در ذخیره اطلاعات.")
    } finally {
      setSaving(false)
    }
  }

  async function handleServiceTypesStep() {
    setError([]); setSaving(true)
    try {
      await caregiverWizardService.saveServiceTypes(caregiverId, { service_types: serviceTypes, service_subtypes: serviceSubtypes })
      setStep(2)
    } catch (err: any) {
      showErrors(err, "خطا در ذخیره نوع خدمت.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep1() {
    setError([]); setSaving(true)
    try {
      await caregiverWizardService.saveIdentity(caregiverId, identity)
      setStep(3)
    } catch (err: any) {
      showErrors(err, "لطفاً همه فیلدهای الزامی را تکمیل کنید.")
    } finally {
      setSaving(false)
    }
  }

  async function handleAddArea() {
    if (!newArea.province) return
    const created = await caregiverWizardService.addServiceArea(caregiverId, newArea)
    setAreas([...areas, created])
    setNewArea({ province: null, city: null, district: null })
  }

  async function handleStep2() {
    setError([]); setSaving(true)
    try {
      await caregiverWizardService.saveWorkPreferences(caregiverId, workPrefs)
      setStep(4)
    } catch (err: any) {
      showErrors(err, "لطفاً همه فیلدهای الزامی را تکمیل کنید.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep3() {
    setError([]); setSaving(true)
    try {
      await caregiverWizardService.saveExperience(caregiverId, experience)
      await caregiverWizardService.saveSkills(caregiverId, skills)
      setStep(5)
    } catch (err: any) {
      showErrors(err, "لطفاً همه فیلدهای الزامی را تکمیل کنید.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep4() {
    setError([]); setSaving(true)
    try {
      await caregiverWizardService.saveReferences(caregiverId, references)
      setStep(6)
    } catch (err: any) {
      showErrors(err, "ثبت معرف‌ها با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep5() {
    setError([]); setSaving(true)
    try {
      await caregiverWizardService.saveCompatibilityQuestionnaire(caregiverId, questionnaireAnswers)
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

  function updateReference(index: number, patch: Partial<ReferenceFormData>) {
    setReferences(references.map((r, i) => (i === index ? { ...r, ...patch } : r)))
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
            <Button size="lg" className="w-full" onClick={() => router.push(ROUTES.caregivers)}>بازگشت به لیست خدمت‌دهنده‌ها</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background">
      <AppHeader
        title={caregiverName || "تکمیل ثبت‌نام خدمت‌دهنده"}
        maxWidth="max-w-5xl"
        subheader={
          <>
            <StepIndicator steps={STEPS} current={step} onNavigate={setStep} canNavigate />
            <p className="mt-2 text-center text-sm font-medium text-muted-foreground">{STEPS[step]}</p>
          </>
        }
      >
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.caregivers)}>بازگشت به لیست</Button>
      </AppHeader>

      <main className="mx-auto max-w-5xl space-y-4 p-4 pb-28">
        <ErrorSummary errors={error} />

        {step === 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">👤</span> ویرایش اطلاعات پایه</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="نام" required><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
              <Field label="نام خانوادگی" required><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
              <Field label="شماره موبایل" required>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" dir="ltr" />
              </Field>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">🏷️</span> نوع خدمت</CardTitle><p className="text-sm text-muted-foreground">این خدمت‌دهنده چه نوع خدمتی ارائه می‌دهد؟ می‌توانید بیش از یک مورد را انتخاب کنید.</p></CardHeader>
            <CardContent className="space-y-4">
              <Field label="نوع خدمت" required>
                <CheckboxGroup
                  choices={C.SERVICE_TYPE}
                  value={serviceTypes}
                  onChange={(v) => {
                    setServiceTypes(v)
                    // drop any subtype selections for a type that just got unchecked
                    setServiceSubtypes((prev) => {
                      const next: Record<string, string[]> = {}
                      for (const t of v) if (prev[t]) next[t] = prev[t]
                      return next
                    })
                  }}
                />
              </Field>
              {serviceTypes.map((type) => {
                const subtypeChoices = SUBTYPE_CHOICES_BY_SERVICE_TYPE[type]
                if (!subtypeChoices) return null
                const typeLabel = C.ALL_SERVICE_TYPE.find((c) => c[0] === type)?.[1] ?? type
                const selectedSubtypes = serviceSubtypes[type] ?? []
                return (
                  <div key={type} className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
                    <Field label={`زیرشاخه — ${typeLabel}`}>
                      <CheckboxGroup
                        choices={subtypeChoices}
                        value={selectedSubtypes}
                        onChange={(v) => setServiceSubtypes({ ...serviceSubtypes, [type]: v })}
                      />
                    </Field>
                    {type === "parastar" && selectedSubtypes.includes("specialized_nurse") && (
                      <Field label="زمینه تخصصی پرستار">
                        {/* backend stores parastar's subtype + specialty values together
                            in one flat list under the "parastar" key, so specialty picks
                            are merged into the same array rather than a separate key. */}
                        <CheckboxGroup
                          choices={C.PARASTAR_SPECIALTY}
                          value={selectedSubtypes.filter((s) => C.PARASTAR_SPECIALTY.some((c) => c[0] === s))}
                          onChange={(v) => {
                            const baseSubtypes = selectedSubtypes.filter((s) => C.PARASTAR_SUBTYPE.some((c) => c[0] === s))
                            setServiceSubtypes({ ...serviceSubtypes, parastar: [...baseSubtypes, ...v] })
                          }}
                        />
                      </Field>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">🪪</span> فرم ۱ — اطلاعات هویتی</CardTitle>
              <p className="text-sm text-muted-foreground">هر بخش را با زدن روی عنوانش باز یا بسته کنید.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormSection title="اطلاعات شناسایی" defaultOpen>
                <Field label="جنسیت"><ChoiceSelect choices={C.GENDER} value={identity.gender} onChange={(v) => setIdentity({ ...identity, gender: v })} /></Field>
                <Field label="نام پدر"><Input value={identity.father_name} onChange={(e) => setIdentity({ ...identity, father_name: e.target.value })} /></Field>
                <Field label="کد ملی"><Input value={identity.national_id} onChange={(e) => setIdentity({ ...identity, national_id: e.target.value })} dir="ltr" /></Field>
                <Field label="شماره شناسنامه"><Input value={identity.birth_certificate_number} onChange={(e) => setIdentity({ ...identity, birth_certificate_number: e.target.value })} /></Field>
                <Field label="تاریخ تولد">
                  <JalaliDatePicker value={identity.birth_date} onChange={(v) => setIdentity({ ...identity, birth_date: v })} />
                </Field>
                {jalaliAge(identity.birth_date) !== null && (
                  <p className="-mt-2 text-sm text-muted-foreground">سن: {jalaliAge(identity.birth_date)!.toLocaleString("fa-IR")} سال</p>
                )}
                <Field label="آیا تابعیت غیرایرانی (اتباع) دارید؟"><YesNo value={identity.is_non_iranian_national} onChange={(v) => setIdentity({ ...identity, is_non_iranian_national: v })} /></Field>
                {identity.is_non_iranian_national && (
                  <>
                    <Field label="اهل کدام کشور هستید؟"><Input value={identity.nationality_country} onChange={(e) => setIdentity({ ...identity, nationality_country: e.target.value })} /></Field>
                    <p className="-mt-2 text-xs text-muted-foreground">مدارک پاسپورت/اقامت از بخش «مدارک» در کاریز خدمت‌دهنده آپلود می‌شود.</p>
                  </>
                )}
                {serviceTypes.includes("parastar") && (
                  <Field label="شماره پروانه نظام پرستاری"><Input value={identity.nursing_license_number} onChange={(e) => setIdentity({ ...identity, nursing_license_number: e.target.value })} /></Field>
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
                    <Field label="توضیح نوع بیماری (نام دقیق بیماری)"><Input value={identity.chronic_disease_detail} onChange={(e) => setIdentity({ ...identity, chronic_disease_detail: e.target.value })} /></Field>
                    {identity.chronic_disease_types.includes("psychological_issues") && (
                      <Field label="داروهای مصرفی برای مشکلات روحی/روانی">
                        <Textarea value={identity.psychiatric_medication_detail} onChange={(e) => setIdentity({ ...identity, psychiatric_medication_detail: e.target.value })} />
                      </Field>
                    )}
                  </div>
                )}
                <Field label="آیا داروی دائمی مصرف می‌کند؟"><YesNo value={identity.takes_permanent_medication} onChange={(v) => setIdentity({ ...identity, takes_permanent_medication: !!v })} /></Field>
                {identity.takes_permanent_medication && (
                  <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
                    <Field label="نوع دارو" required><CheckboxGroup choices={C.MEDICATION_TYPE} value={identity.medication_types} onChange={(v) => setIdentity({ ...identity, medication_types: v })} /></Field>
                    <Field label="توضیح نوع دارو (نام دقیق دارو)"><Input value={identity.medication_detail} onChange={(e) => setIdentity({ ...identity, medication_detail: e.target.value })} /></Field>
                  </div>
                )}
              </FormSection>

              <FormSection title="اطلاعات تماس">
                <Field label="شماره تماس‌های دیگر"><Input value={identity.emergency_contact_phone} onChange={(e) => setIdentity({ ...identity, emergency_contact_phone: e.target.value })} dir="ltr" /></Field>
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
                <Field label="قومیت / زبان مادری"><CheckboxGroup choices={C.ETHNICITY} value={identity.ethnicities} onChange={(v) => setIdentity({ ...identity, ethnicities: v })} /></Field>
                {identity.has_children && (
                  <Field label="آیا در حال حاضر در حال مراقبت از فرزند خودتان هستید یا نیازی به مراقبت شما ندارد؟"><YesNo value={identity.currently_caring_for_own_child} onChange={(v) => setIdentity({ ...identity, currently_caring_for_own_child: v })} /></Field>
                )}
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
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">💼</span> فرم ۲ — شرایط همکاری</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="نوع همکاری"><CheckboxGroup choices={C.getCollaborationTypeChoices(serviceTypes, serviceSubtypes)} value={workPrefs.collaboration_types} onChange={(v) => setWorkPrefs({ ...workPrefs, collaboration_types: v })} /></Field>
              {workPrefs.collaboration_types.includes("daily") && (
                <Field label="ساعات کاری مراقبت روزانه"><Input value={workPrefs.daily_work_hours} onChange={(e) => setWorkPrefs({ ...workPrefs, daily_work_hours: e.target.value })} placeholder="مثلاً از ساعت ۸ تا ۱۶" /></Field>
              )}
              <Field label="حقوق درخواستی"><Input value={workPrefs.requested_salary} onChange={(e) => setWorkPrefs({ ...workPrefs, requested_salary: e.target.value })} /></Field>
              <Field label="مبنای دریافت حقوق"><ChoiceSelect choices={C.PAY_BASIS} value={workPrefs.pay_basis} onChange={(v) => setWorkPrefs({ ...workPrefs, pay_basis: v })} /></Field>
              <Field label="وضعیت کاری"><ChoiceSelect choices={C.WORK_STATUS} value={workPrefs.work_status} onChange={(v) => setWorkPrefs({ ...workPrefs, work_status: v })} /></Field>
              {serviceTypes.includes("salmandyar") && (
                <>
                  <Field label="حضور خانواده سالمند"><ChoiceSelect choices={C.FAMILY_PRESENCE_PREFERENCE} value={workPrefs.family_presence_preference} onChange={(v) => setWorkPrefs({ ...workPrefs, family_presence_preference: v })} /></Field>
                  <Field label="جنسیت سالمند قابل قبول"><ChoiceSelect choices={C.ACCEPTED_GENDER} value={workPrefs.accepted_gender} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_gender: v })} /></Field>
                  <Field label="بازه سنی سالمند"><CheckboxGroup choices={C.ACCEPTED_AGE_RANGE} value={workPrefs.accepted_age_ranges} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_age_ranges: v })} /></Field>
                  <Field label="خدمات قابل ارائه"><CheckboxGroup choices={C.OFFERED_SERVICE} value={workPrefs.offered_services} onChange={(v) => setWorkPrefs({ ...workPrefs, offered_services: v })} /></Field>
                  <Field label="شرایط جسمانی سالمند قابل پذیرش"><CheckboxGroup choices={C.ACCEPTED_PHYSICAL_CONDITION} value={workPrefs.accepted_physical_conditions} onChange={(v) => setWorkPrefs({ ...workPrefs, accepted_physical_conditions: v })} /></Field>
                  <Field label="میزان انجام نظافت"><ChoiceSelect choices={C.CLEANING_WILLINGNESS} value={workPrefs.cleaning_willingness} onChange={(v) => setWorkPrefs({ ...workPrefs, cleaning_willingness: v })} /></Field>
                  <Field label="محل ارائه خدمت"><CheckboxGroup choices={C.SERVICE_LOCATION} value={workPrefs.service_locations} onChange={(v) => setWorkPrefs({ ...workPrefs, service_locations: v })} /></Field>
                </>
              )}
              {(workPrefs.collaboration_types.includes("daily") || workPrefs.collaboration_types.includes("short_term")) && (
                <Field label="حداکثر زمان رفت‌وآمد"><ChoiceSelect choices={C.MAX_COMMUTE_TIME} value={workPrefs.max_commute_time} onChange={(v) => setWorkPrefs({ ...workPrefs, max_commute_time: v })} /></Field>
              )}
              <Field label="روزهای کاری"><CheckboxGroup choices={C.WEEKDAY} value={workPrefs.available_days} onChange={(v) => setWorkPrefs({ ...workPrefs, available_days: v })} /></Field>
              <Field label="روز درخواستی برای تعطیلی"><Input value={workPrefs.day_off_request} onChange={(e) => setWorkPrefs({ ...workPrefs, day_off_request: e.target.value })} placeholder="مثلاً جمعه‌ها" /></Field>
              <Field label="شیفت‌های کاری (شبانه‌روزی با بقیه هم‌زمان انتخاب نشود)" error={fieldErrors.available_shifts}><CheckboxGroup choices={C.SHIFT} value={workPrefs.available_shifts} onChange={(v) => setWorkPrefs({ ...workPrefs, available_shifts: v })} /></Field>
              {(workPrefs.available_shifts.includes("night") || workPrefs.available_shifts.includes("24h")) && (
                <Field label="آیا به فضا یا اتاق شخصی نیاز دارید؟"><YesNo value={workPrefs.problem_without_private_room} onChange={(v) => setWorkPrefs({ ...workPrefs, problem_without_private_room: v })} /></Field>
              )}
              <Field label="روش رفت‌وآمد"><CheckboxGroup choices={C.COMMUTE_METHOD} value={workPrefs.commute_methods} onChange={(v) => setWorkPrefs({ ...workPrefs, commute_methods: v })} /></Field>
              <Field label="وضعیت استعمال دخانیات"><ChoiceSelect choices={C.SMOKING_STATUS} value={workPrefs.smoking_status} onChange={(v) => setWorkPrefs({ ...workPrefs, smoking_status: v })} /></Field>
              <Field label="امکان کار در تعطیلات"><YesNo value={workPrefs.holiday_work_ok} onChange={(v) => setWorkPrefs({ ...workPrefs, holiday_work_ok: v })} /></Field>

              {/* Universal — common to every service type, moved out of
                  کودک‌یار-only per the full-redesign request. Phrased
                  as "آیا مشکلی دارید؟" — true means the caregiver DOES
                  have a problem with that situation. */}
              {/* فقط یکی از این دو پرسیده می‌شود، بر اساس جنسیت خود
                  مراقب (که در فرم ۱ پرسیده شده): مراقب مرد نزد مادر
                  تنها، و مراقب زن نزد پدر مجرد — سؤال حساس آن ترکیب
                  است، نه هر دو ترکیب هم‌زمان. */}
              {identity.gender === "female" && (
                <Field label="آیا مشکلی با کار نزد پدر مجرد دارید؟"><YesNo value={workPrefs.problem_with_single_father} onChange={(v) => setWorkPrefs({ ...workPrefs, problem_with_single_father: v })} /></Field>
              )}
              {identity.gender === "male" && (
                <Field label="آیا مشکلی با کار نزد مادر تنها (بدون همسر) دارید؟"><YesNo value={workPrefs.problem_with_single_mother} onChange={(v) => setWorkPrefs({ ...workPrefs, problem_with_single_mother: v })} /></Field>
              )}
              {/* برای نظافت‌چیِ خالص بی‌اهمیت است (طبق تأیید صریح) —
                  فقط وقتی حداقل یک نوع خدمت دیگر هم انتخاب شده نشان
                  داده می‌شود. */}
              {serviceTypes.some((t) => t !== "nezafatchi") && (
                <>
                  <Field label="آیا مشکلی با کار در خانه‌ای که پدر در ساعات کاری در منزل است دارید؟"><YesNo value={workPrefs.problem_with_father_present_at_home} onChange={(v) => setWorkPrefs({ ...workPrefs, problem_with_father_present_at_home: v })} /></Field>
                  <Field label="آیا مشکلی با کار در خانه‌ای که پدربزرگ/مادربزرگ یا یکی از اقوام هم حضور دارد دارید؟"><YesNo value={workPrefs.problem_with_grandparent_or_relative_at_home} onChange={(v) => setWorkPrefs({ ...workPrefs, problem_with_grandparent_or_relative_at_home: v })} /></Field>
                </>
              )}
              <Field label="آیا مشکلی با کار در منزلی که دوربین مداربسته دارد، دارید؟"><YesNo value={workPrefs.problem_with_home_camera} onChange={(v) => setWorkPrefs({ ...workPrefs, problem_with_home_camera: v })} /></Field>
              <Field label="آیا مشکلی با حضور سگ در منزل دارید؟"><YesNo value={workPrefs.problem_with_dog} onChange={(v) => setWorkPrefs({ ...workPrefs, problem_with_dog: v })} /></Field>
              <Field label="آیا مشکلی با حضور گربه در منزل دارید؟"><YesNo value={workPrefs.problem_with_cat} onChange={(v) => setWorkPrefs({ ...workPrefs, problem_with_cat: v })} /></Field>
              <Field label="سایر حیوانات خانگی (اختیاری)"><Input value={workPrefs.pets_other_notes} onChange={(e) => setWorkPrefs({ ...workPrefs, pets_other_notes: e.target.value })} placeholder="مثلاً پرنده، ماهی" /></Field>
              <Field label="آیا مشکلی با سفر همراه خانواده در داخل ایران دارید؟"><YesNo value={workPrefs.problem_with_domestic_travel} onChange={(v) => setWorkPrefs({ ...workPrefs, problem_with_domestic_travel: v })} /></Field>
              <Field label="آیا مشکلی با سفر همراه خانواده به خارج از کشور دارید؟"><YesNo value={workPrefs.problem_with_international_travel} onChange={(v) => setWorkPrefs({ ...workPrefs, problem_with_international_travel: v })} /></Field>

              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">مناطق خدماتی</p>
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
                            await caregiverWizardService.deleteServiceArea(caregiverId, a.id!)
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

              <Field label="توضیحات تکمیلی (اختیاری)"><Textarea value={workPrefs.additional_notes} onChange={(e) => setWorkPrefs({ ...workPrefs, additional_notes: e.target.value })} /></Field>

              {renderServiceSpecificSections("form2", workPrefs.service_specific_answers, (next) => setWorkPrefs({ ...workPrefs, service_specific_answers: next }))}

              <Field label="پذیرش قوانین و مسئولیت اطلاعات" required error={fieldErrors.terms_accepted}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={workPrefs.terms_accepted} onChange={(e) => setWorkPrefs({ ...workPrefs, terms_accepted: e.target.checked })} className="accent-primary" />
                  اطلاعات فوق تأیید و مسئولیت صحت آن پذیرفته می‌شود.
                </label>
              </Field>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">🎓</span> فرم ۳ — سوابق کاری و مهارت‌ها</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SectionHeading>سوابق کاری</SectionHeading>
              {serviceTypes.includes("salmandyar") && (
                <>
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
                </>
              )}
              <Field label="آخرین محل فعالیت"><Input value={experience.last_workplace} onChange={(e) => setExperience({ ...experience, last_workplace: e.target.value })} /></Field>
              <Field label="توضیحات تکمیلی سوابق"><Textarea value={experience.additional_notes} onChange={(e) => setExperience({ ...experience, additional_notes: e.target.value })} /></Field>

              <SectionHeading>مهارت‌ها و آموزش‌ها</SectionHeading>
              <Field label="سطح تحصیلات"><ChoiceSelect choices={C.EDUCATION_LEVEL} value={skills.education_level} onChange={(v) => setSkills({ ...skills, education_level: v })} /></Field>
              <Field label="رشته تحصیلی"><Input value={skills.field_of_study} onChange={(e) => setSkills({ ...skills, field_of_study: e.target.value })} /></Field>
              {skills.education_level !== "diploma" && skills.education_level !== "under_diploma" && (
                <Field label="زبان خارجی"><CheckboxGroup choices={C.FOREIGN_LANGUAGE} value={skills.foreign_languages} onChange={(v) => setSkills({ ...skills, foreign_languages: v })} /></Field>
              )}
              {/* بسیاری از افراد اصلاً انگلیسی نمی‌دانند — مثل عربی،
                  اول بلی/خیر پرسیده می‌شود، نه مستقیم سطح تسلط. */}
              <Field label="آیا زبان انگلیسی می‌دانید؟">
                <YesNo
                  value={skills.english_level !== ""}
                  onChange={(v) => setSkills({ ...skills, english_level: v ? (skills.english_level || "basic") : "" })}
                />
              </Field>
              {skills.english_level !== "" && (
                <Field label="میزان تسلط به زبان انگلیسی"><ChoiceSelect choices={C.LANGUAGE_LEVEL} value={skills.english_level} onChange={(v) => setSkills({ ...skills, english_level: v })} /></Field>
              )}
              <Field label="آیا زبان عربی می‌دانید؟">
                <YesNo
                  value={skills.arabic_level !== ""}
                  onChange={(v) => setSkills({ ...skills, arabic_level: v ? (skills.arabic_level || "basic") : "" })}
                />
              </Field>
              {skills.arabic_level !== "" && (
                <Field label="میزان تسلط به زبان عربی"><ChoiceSelect choices={C.LANGUAGE_LEVEL} value={skills.arabic_level} onChange={(v) => setSkills({ ...skills, arabic_level: v })} /></Field>
              )}
              {/* هر زبان دیگری که در «زبان خارجی» انتخاب شده (غیر از
                  انگلیسی/عربی که فیلد اختصاصی خود را دارند) سطح تسلط
                  جدا دارد، به‌جای تایپ آزاد «زبان - سطح». */}
              {skills.foreign_languages.filter((code) => code !== "english" && code !== "arabic" && code !== "other").map((code) => {
                const label = C.FOREIGN_LANGUAGE.find((c) => c[0] === code)?.[1] || code
                return (
                  <Field key={code} label={`میزان تسلط به زبان ${label}`}>
                    <ChoiceSelect
                      choices={C.LANGUAGE_LEVEL}
                      value={otherLangLevels[code] || ""}
                      onChange={(v) => {
                        const nextLevels = { ...otherLangLevels, [code]: v }
                        setOtherLangLevels(nextLevels)
                        setSkills({ ...skills, other_languages_detail: composeOtherLanguagesDetail(nextLevels, otherLangFreeText, skills.foreign_languages) })
                      }}
                    />
                  </Field>
                )
              })}
              {skills.foreign_languages.includes("other") && (
                <Field label="توضیح سایر زبان و سطح آن (اختیاری)">
                  <Input
                    value={otherLangFreeText}
                    onChange={(e) => {
                      setOtherLangFreeText(e.target.value)
                      setSkills({ ...skills, other_languages_detail: composeOtherLanguagesDetail(otherLangLevels, e.target.value, skills.foreign_languages) })
                    }}
                    placeholder="مثلاً زبان و سطح آن را بنویسید"
                  />
                </Field>
              )}
              {serviceTypes.includes("salmandyar") && (
                <>
                  <Field label="دوره‌های آموزشی گذرانده‌شده"><CheckboxGroup choices={C.TRAINING_COURSE} value={skills.training_courses} onChange={(v) => setSkills({ ...skills, training_courses: v })} /></Field>
                  <Field label="مهارت‌های مراقبتی"><CheckboxGroup choices={C.CAREGIVING_SKILL} value={skills.caregiving_skills} onChange={(v) => setSkills({ ...skills, caregiving_skills: v })} /></Field>
                  <Field label="توانایی جابجایی سالمند"><CheckboxGroup choices={C.MOBILITY_ASSISTANCE_ABILITY} value={skills.mobility_assistance_ability} onChange={(v) => setSkills({ ...skills, mobility_assistance_ability: v })} /></Field>
                  <Field label="مهارت‌های خانگی"><CheckboxGroup choices={C.HOUSEHOLD_SKILL} value={skills.household_skills} onChange={(v) => setSkills({ ...skills, household_skills: v })} /></Field>
                </>
              )}
              <Field label="توانایی جسمی"><ChoiceSelect choices={C.PHYSICAL_ABILITY} value={skills.physical_ability} onChange={(v) => setSkills({ ...skills, physical_ability: v })} /></Field>
              <Field label="زبان محلی"><CheckboxGroup choices={C.LOCAL_LANGUAGE} value={skills.local_languages} onChange={(v) => setSkills({ ...skills, local_languages: v })} /></Field>
              {skills.local_languages.length > 0 && (
                <Field label="سطح تسلط به زبان(های) محلی"><ChoiceSelect choices={C.LOCAL_LANGUAGE_FLUENCY} value={skills.local_language_fluency} onChange={(v) => setSkills({ ...skills, local_language_fluency: v })} /></Field>
              )}
              <Field label="گواهینامه رانندگی"><YesNo value={skills.has_driving_license} onChange={(v) => setSkills({ ...skills, has_driving_license: v })} /></Field>
              <Field label="مهارت کار با تلفن هوشمند"><YesNo value={skills.can_use_smartphone} onChange={(v) => setSkills({ ...skills, can_use_smartphone: v })} /></Field>
              <Field label="توضیحات تکمیلی مهارت‌ها"><Textarea value={skills.additional_notes} onChange={(e) => setSkills({ ...skills, additional_notes: e.target.value })} /></Field>

              {renderServiceSpecificSections("form3", experience.service_specific_answers, (next) => setExperience({ ...experience, service_specific_answers: next }))}
            </CardContent>
          </Card>
        )}

        {step === 5 && (
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

        {step === 6 && (
          <div className="space-y-4">
            <p className="rounded-lg border border-dashed border-border bg-secondary/40 p-3 text-base text-muted-foreground">
              این پرسشنامه اختیاری است — تکمیل آن در تأیید یا رد پروفایل مراقب تأثیری ندارد، فقط کیفیت پیشنهاد مراقب در بخش «تطابق» را بهبود می‌دهد. هر زمان می‌توانید آن را رد کنید و بعداً تکمیل کنید.
            </p>
            {CAREGIVER_QUESTIONNAIRE.map((section) => (
              <Card key={section.title}>
                <CardHeader><CardTitle className="text-xl text-foreground">{section.title}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {/* clinical_compatibility_level ("رعایت دستورات پزشکی و شرایط
                      درمانی سالمند") only makes sense when سالمندیار is one of
                      this caregiver's selected types — asking it of a pure
                      نظافت‌چی/کودک‌یار/... is exactly the irrelevant-question
                      noise this gating removes. */}
                  {section.questions.filter((q) => q.field !== "clinical_compatibility_level" || serviceTypes.includes("salmandyar")).map((q) => (
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
                </CardContent>
              </Card>
            ))}
            {serviceTypes.filter((t) => C.SERVICE_SPECIFIC_FORMS[t]?.questionnaire?.length).map((type) => {
              const typeLabel = C.ALL_SERVICE_TYPE.find((c) => c[0] === type)?.[1] ?? type
              const chosenSubtypes = serviceSubtypes[type] ?? []
              // showIfField here checks form2's own answers (where
              // activity checkboxes like indoor_activities/
              // outdoor_activities live), not the questionnaire's.
              const form2Answers = workPrefs.service_specific_answers[type] ?? {}
              const fields = C.SERVICE_SPECIFIC_FORMS[type].questionnaire
                .filter((f) => !f.showIf || f.showIf.some((s) => chosenSubtypes.includes(s)))
                .filter((f) => matchesShowIfField(f, form2Answers))
              if (fields.length === 0) return null
              const typeAnswers = questionnaireAnswers.service_specific_answers?.[type] ?? {}
              return (
                <Card key={type}>
                  <CardHeader><CardTitle className="text-xl text-foreground">سازگاری مخصوص {typeLabel}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {fields.map((f) => (
                      <div key={f.key} className="rounded-lg border border-border p-3">
                        <p className="mb-4 text-lg font-medium">{f.label}</p>
                        <div className="space-y-1.5">
                          {C.SCORE_OPTIONS.map(([value, text]) => (
                            <label key={value} className="flex cursor-pointer items-start gap-3 text-base">
                              <input
                                type="radio"
                                name={`${type}.${f.key}`}
                                checked={typeAnswers[f.key] === value}
                                onChange={() => setServiceAnswer(
                                  questionnaireAnswers.service_specific_answers ?? {},
                                  (next) => setQuestionnaireAnswers((prev) => ({ ...prev, service_specific_answers: next })),
                                  type, f.key, value,
                                )}
                                className="mt-0.5 h-4 w-4"
                              />
                              <span>{text}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
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
            <Button className="flex-1" size="lg" onClick={handleStep0} disabled={saving || !firstName || !lastName || !phone}>
              {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
          )}
          {step === 1 && (
            <Button className="flex-1" size="lg" onClick={handleServiceTypesStep} disabled={saving || serviceTypes.length === 0}>
              {saving ? "در حال ذخیره..." : "ذخیره و ادامه"}
            </Button>
          )}
          {step === 2 && (
            <Button className="flex-1" size="lg" onClick={handleStep1} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره و ادامه"}
            </Button>
          )}
          {step === 3 && (
            <Button className="flex-1" size="lg" onClick={handleStep2} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره و ادامه"}
            </Button>
          )}
          {step === 4 && (
            <Button className="flex-1" size="lg" onClick={handleStep3} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره و ادامه"}
            </Button>
          )}
          {step === 5 && (
            <Button className="flex-1" size="lg" onClick={handleStep4} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره و ادامه"}
            </Button>
          )}
          {step === 6 && (
            <>
              <Button
                className="flex-1"
                size="lg" onClick={handleStep5} disabled={saving || Object.keys(questionnaireAnswers).length < (serviceTypes.includes("salmandyar") ? 4 : 3)}
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
}
