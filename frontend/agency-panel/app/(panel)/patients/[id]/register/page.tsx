"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, ChoiceSelect } from "@/components/wizard-forms/fields"
import { LocationPicker } from "@/components/wizard-forms/location-picker"
import { JalaliDatePicker } from "@/components/wizard-forms/jalali-date-picker"
import { ErrorSummary } from "@/components/wizard-forms/error-summary"
import { StepIndicator } from "@/components/wizard-forms/step-indicator"
import { AppHeader } from "@/components/layout/app-header"
import { parseApiErrors, type ApiFieldError } from "@/lib/field-labels"
import { useAuth } from "@/hooks/useauth"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { GENDER, GUARDIANSHIP_STATUS } from "@/lib/constants"
import { PATIENT_QUESTIONNAIRE } from "@/lib/patient-compatibility-questionnaire"
import { PATIENT_DOCUMENT_TYPES } from "@/types/agency_management"
import { ROUTES } from "@/lib/routes"

// Continues a patient's registration right after the quick "افزودن
// خدمت‌گیرنده" create (patients/page.tsx) — same shape as the
// caregiver wizard at caregivers/[id]/register: the record already
// exists by the time this page opens, so step 0 here is a full
// identity edit/completion (everything the quick-create form didn't
// ask for), step 1 is the optional compatibility questionnaire, and
// step 2 is uploading the identity documents — the two things the
// family-panel's own "افزودن سالمند جدید" page promises can be
// "completed later from the patient's page" but never actually had a
// page to do that from, for an agency-entered patient. Both step 1
// and step 2 are skippable, same as the caregiver wizard's own
// questionnaire step.
const STEPS = ["اطلاعات هویتی", "پرسشنامه سازگاری (اختیاری)", "مدارک شناسایی (اختیاری)"]

const EMPTY_IDENTITY = {
  full_name: "", gender: "", father_name: "", birth_date: "",
  national_id: "", birth_certificate_number: "", birth_certificate_issue_place: "",
  province: null as number | null, city: null as number | null, district: null as number | null,
  postal_code: "", full_address: "", emergency_contact_phone: "",
  guardianship_status: "none", guardian_details: "",
  language_dialect: "", basic_medical_info: "",
}

export default function PatientRegistrationWizard() {
  return (
    <Suspense fallback={null}>
      <PatientRegistrationWizardInner />
    </Suspense>
  )
}

function PatientRegistrationWizardInner() {
  const { loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const router = useRouter()
  const params = useParams()
  const patientId = Number(params.id)
  const searchParams = useSearchParams()
  const accessCode = searchParams.get("access_code")
  const familyPhone = searchParams.get("family_phone")
  const familyCode = searchParams.get("family_code")

  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [step, setStep] = useState(0)
  const [patientName, setPatientName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ApiFieldError[]>([])
  const [done, setDone] = useState(false)

  const [identity, setIdentity] = useState(EMPTY_IDENTITY)
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, string>>({})
  const [uploadedTypes, setUploadedTypes] = useState<Set<string>>(new Set())
  const [uploadingType, setUploadingType] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) return
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      agencyManagementService.getPatientDetail(profile.id, patientId).then((p) => {
        setPatientName(p.full_name)
        setIdentity({
          full_name: p.full_name, gender: p.gender || "", father_name: p.father_name || "",
          birth_date: p.birth_date || "",
          national_id: p.national_id || "", birth_certificate_number: p.birth_certificate_number || "",
          birth_certificate_issue_place: p.birth_certificate_issue_place || "",
          province: p.province, city: p.city, district: p.district,
          postal_code: p.postal_code || "", full_address: p.full_address || "",
          emergency_contact_phone: p.emergency_contact_phone || "",
          guardianship_status: p.guardianship_status || "none", guardian_details: p.guardian_details || "",
          language_dialect: p.language_dialect || "", basic_medical_info: p.basic_medical_info || "",
        })
      })
      agencyManagementService.getPatientQuestionnaire(profile.id, patientId)
        .then((data) => {
          const { created_at, updated_at, ...answers } = data as any
          setQuestionnaireAnswers(answers)
        })
        .catch(() => {})
    })
  }, [patientId])

  const advanceRef = useRef<() => void>(() => {})
  useEffect(() => {
    advanceRef.current = () => {
      if (saving) return
      if (step === 0) handleStep0()
      else if (step === 1) handleStep1()
    }
  })

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter") return
      const target = e.target as HTMLElement
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
    if (agencyId === null) return
    setError([]); setSaving(true)
    try {
      const result = await agencyManagementService.updatePatientDetail(agencyId, patientId, {
        ...identity,
        birth_date: identity.birth_date || null,
      })
      setPatientName(result.full_name)
      setStep(1)
    } catch (err: any) {
      showErrors(err, "لطفاً فیلدهای الزامی را تکمیل کنید.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStep1() {
    if (agencyId === null) return
    setError([]); setSaving(true)
    try {
      await agencyManagementService.savePatientQuestionnaire(agencyId, patientId, questionnaireAnswers)
      setStep(2)
    } catch (err: any) {
      showErrors(err, "ثبت پرسشنامه با خطا مواجه شد — همه سؤالات باید پاسخ داده شوند.")
    } finally {
      setSaving(false)
    }
  }

  function handleSkipQuestionnaire() {
    setStep(2)
  }

  async function handleUpload(documentType: string, file: File) {
    if (agencyId === null) return
    setUploadingType(documentType)
    try {
      await agencyManagementService.uploadPatientDocument(agencyId, patientId, documentType, file)
      setUploadedTypes((prev) => new Set(prev).add(documentType))
    } catch {
      window.alert("بارگذاری فایل با خطا مواجه شد.")
    } finally {
      setUploadingType(null)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-secondary p-4">
        <Card className="w-full max-w-md border-0 text-center shadow-xl">
          <CardContent className="space-y-4 p-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-4xl text-white shadow-lg shadow-emerald-500/30">
              ✓
            </div>
            <h2 className="text-xl font-bold text-emerald-900">پرونده {patientName} تکمیل شد</h2>
            <Button size="lg" className="w-full" onClick={() => router.push(ROUTES.patients)}>بازگشت به لیست خدمت‌گیرنده‌ها</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background">
      <AppHeader
        title={patientName || "تکمیل پرونده خدمت‌گیرنده"}
        maxWidth="max-w-5xl"
        subheader={
          <>
            <StepIndicator steps={STEPS} current={step} onNavigate={setStep} canNavigate />
            <p className="mt-2 text-center text-sm font-medium text-muted-foreground">{STEPS[step]}</p>
          </>
        }
      >
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.patients)}>بازگشت به لیست</Button>
      </AppHeader>

      <main className="mx-auto max-w-5xl space-y-4 p-4 pb-28">
        <ErrorSummary errors={error} />

        {accessCode && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <p>خدمت‌گیرنده ثبت شد — کد: <span dir="ltr" className="font-mono">{accessCode}</span></p>
            {familyPhone && familyCode && (
              <p className="mt-1">
                حساب خانواده ساخته شد (<span dir="ltr">{familyPhone}</span>) —
                کد پیوستن: <span dir="ltr" className="font-mono">{familyCode}</span>
              </p>
            )}
          </div>
        )}

        {step === 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">🪪</span> اطلاعات هویتی</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="نام و نام خانوادگی" required>
                <Input value={identity.full_name} onChange={(e) => setIdentity({ ...identity, full_name: e.target.value })} />
              </Field>
              <Field label="جنسیت"><ChoiceSelect choices={GENDER} value={identity.gender} onChange={(v) => setIdentity({ ...identity, gender: v })} /></Field>
              <Field label="نام پدر"><Input value={identity.father_name} onChange={(e) => setIdentity({ ...identity, father_name: e.target.value })} /></Field>
              <Field label="تاریخ تولد">
                <JalaliDatePicker value={identity.birth_date} onChange={(v) => setIdentity({ ...identity, birth_date: v })} />
              </Field>
              <Field label="شماره ملی"><Input dir="ltr" value={identity.national_id} onChange={(e) => setIdentity({ ...identity, national_id: e.target.value })} /></Field>
              <Field label="شماره شناسنامه"><Input value={identity.birth_certificate_number} onChange={(e) => setIdentity({ ...identity, birth_certificate_number: e.target.value })} /></Field>
              <Field label="محل صدور شناسنامه"><Input value={identity.birth_certificate_issue_place} onChange={(e) => setIdentity({ ...identity, birth_certificate_issue_place: e.target.value })} /></Field>

              <LocationPicker
                province={identity.province} city={identity.city} district={identity.district}
                onChange={(v) => setIdentity({ ...identity, ...v })}
              />
              <Field label="کد پستی"><Input dir="ltr" value={identity.postal_code} onChange={(e) => setIdentity({ ...identity, postal_code: e.target.value })} /></Field>
              <Field label="نشانی کامل"><Textarea value={identity.full_address} onChange={(e) => setIdentity({ ...identity, full_address: e.target.value })} /></Field>
              <Field label="شماره تماس اضطراری"><Input dir="ltr" value={identity.emergency_contact_phone} onChange={(e) => setIdentity({ ...identity, emergency_contact_phone: e.target.value })} /></Field>

              <Field label="وضعیت قیمومیت/وصایت">
                <ChoiceSelect choices={GUARDIANSHIP_STATUS} value={identity.guardianship_status} onChange={(v) => setIdentity({ ...identity, guardianship_status: v })} />
              </Field>
              {identity.guardianship_status !== "none" && (
                <Field label="اطلاعات وصی/قیم" required>
                  <Textarea value={identity.guardian_details} onChange={(e) => setIdentity({ ...identity, guardian_details: e.target.value })} />
                </Field>
              )}

              <Field label="زبان و گویش"><Input value={identity.language_dialect} onChange={(e) => setIdentity({ ...identity, language_dialect: e.target.value })} /></Field>
              <Field label="اطلاعات پزشکی پایه">
                <Textarea value={identity.basic_medical_info} onChange={(e) => setIdentity({ ...identity, basic_medical_info: e.target.value })} />
              </Field>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="rounded-lg border border-dashed border-border bg-secondary/40 p-3 text-base text-muted-foreground">
              این پرسشنامه اختیاری است — فقط کیفیت پیشنهاد مراقب در بخش «تطابق» را بهبود می‌دهد. هر زمان می‌توانید آن را رد کنید و بعداً تکمیل کنید.
            </p>
            <Card>
              <CardContent className="space-y-3 pt-6">
                {PATIENT_QUESTIONNAIRE.map((q) => (
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
          </div>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground"><span className="text-xl">📎</span> مدارک شناسایی</CardTitle>
              <p className="text-sm text-muted-foreground">بارگذاری مدارک اختیاری است — هر زمان می‌توانید از همین صفحه تکمیل کنید.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {PATIENT_DOCUMENT_TYPES.map(([type, label]) => {
                const isUploaded = uploadedTypes.has(type)
                const isUploading = uploadingType === type
                return (
                  <div key={type} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      {isUploaded && <span className="text-emerald-600">✓</span>}
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUpload(type, file)
                          e.target.value = ""
                        }}
                      />
                      <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
                        {isUploading ? "در حال بارگذاری..." : isUploaded ? "جایگزینی فایل" : "انتخاب فایل"}
                      </span>
                    </label>
                  </div>
                )
              })}
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
            <Button className="flex-1" size="lg" onClick={handleStep0} disabled={saving || !identity.full_name}>
              {saving ? "در حال ذخیره..." : "ذخیره و ادامه"}
            </Button>
          )}
          {step === 1 && (
            <>
              <Button
                className="flex-1" size="lg" onClick={handleStep1}
                disabled={saving || Object.keys(questionnaireAnswers).length < PATIENT_QUESTIONNAIRE.length}
              >
                {saving ? "در حال ذخیره..." : "ذخیره و ادامه"}
              </Button>
              <Button variant="outline" size="lg" onClick={handleSkipQuestionnaire} disabled={saving}>
                رد کردن این مرحله
              </Button>
            </>
          )}
          {step === 2 && (
            <Button className="flex-1" size="lg" onClick={() => setDone(true)}>
              پایان و بازگشت به لیست
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
