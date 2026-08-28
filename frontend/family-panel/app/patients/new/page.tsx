"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AppHeader } from "@/components/layout/app-header"
import { Field, ChoiceSelect } from "@/components/forms/fields"
import { JalaliDatePicker } from "@/components/forms/jalali-date-picker"
import { LocationPicker } from "@/components/forms/location-picker"
import { ErrorSummary } from "@/components/forms/error-summary"
import { RELATION_TYPE, GENDER } from "@/lib/constants"
import { parseApiErrors, type ApiFieldError } from "@/lib/field-labels"
import { patientService } from "@/services/patient.service"
import { ROUTES } from "@/lib/routes"

export default function NewPatientPage() {
  const { user, loading: authLoading, logout } = useAuth(["family"])
  const router = useRouter()

  const [fullName, setFullName] = useState("")
  const [gender, setGender] = useState("")
  const [relation, setRelation] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [province, setProvince] = useState<number | null>(null)
  const [city, setCity] = useState<number | null>(null)
  const [district, setDistrict] = useState<number | null>(null)
  const [fullAddress, setFullAddress] = useState("")
  const [emergencyPhone, setEmergencyPhone] = useState("")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ApiFieldError[]>([])

  if (authLoading || !user) return null

  async function handleSubmit() {
    setSaving(true); setError([])
    try {
      const patient = await patientService.create({
        full_name: fullName, gender, relation,
        birth_date: birthDate || null,
        province, city, district,
        full_address: fullAddress,
        emergency_contact_phone: emergencyPhone,
      } as any)
      router.push(ROUTES.patientDetail(patient.id))
    } catch (err: any) {
      const parsed = parseApiErrors(err?.response?.data)
      setError(parsed.length > 0 ? parsed : [{ field: "detail", messages: ["ثبت با خطا مواجه شد."] }])
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background pb-24">
      <AppHeader title="افزودن سالمند جدید" maxWidth="max-w-xl">
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        <Button variant="ghost" size="sm" className="text-primary-strong" onClick={logout}>خروج</Button>
      </AppHeader>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        <ErrorSummary errors={error} />

        <Card className="border-border">
          <CardHeader><CardTitle className="text-foreground">اطلاعات پایه</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="نام و نام خانوادگی سالمند" required>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="جنسیت">
              <ChoiceSelect choices={GENDER} value={gender} onChange={setGender} />
            </Field>
            <Field label="نسبت شما با سالمند" required>
              <ChoiceSelect choices={RELATION_TYPE} value={relation} onChange={setRelation} />
            </Field>
            <Field label="تاریخ تولد">
              <JalaliDatePicker value={birthDate} onChange={setBirthDate} />
            </Field>
            <LocationPicker
              province={province} city={city} district={district}
              onChange={(v) => { setProvince(v.province); setCity(v.city); setDistrict(v.district) }}
            />
            <Field label="نشانی کامل">
              <Input value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} />
            </Field>
            <Field label="شماره تماس اضطراری">
              <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} dir="ltr" />
            </Field>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          اطلاعات بیشتر (پرسشنامه سازگاری و مدارک شناسایی) را می‌توانید پس از ثبت، از صفحه سالمند تکمیل کنید.
        </p>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-xl p-3">
          <Button
            className="w-full bg-gradient-to-l from-primary to-primary shadow-md shadow-primary/15 hover:from-primary hover:to-primary"
            size="lg"
            disabled={saving || !fullName || !relation}
            onClick={handleSubmit}
          >
            {saving ? "در حال ثبت..." : "ثبت سالمند"}
          </Button>
        </div>
      </footer>
    </div>
  )
}
