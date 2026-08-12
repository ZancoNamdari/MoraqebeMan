"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, ChoiceSelect, SelectWithOther } from "@/components/forms/fields"
import { JalaliDatePicker } from "@/components/forms/jalali-date-picker"
import { LocationPicker } from "@/components/forms/location-picker"
import { ErrorSummary } from "@/components/forms/error-summary"
import { parseApiErrors, type ApiFieldError } from "@/lib/field-labels"
import { GUARDIANSHIP_STATUS, LANGUAGE_DIALECT, GENDER } from "@/lib/constants"
import { myPatientService } from "@/services/patient.service"
import { ROUTES } from "@/lib/routes"
import type { PatientProfile } from "@/types/patient"

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ApiFieldError[]>([])
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!user) return
    myPatientService.get()
      .then(setProfile)
      .catch(() => {
        // No profile yet — a freshly-registered patient hasn't
        // created one. Start an empty, editable draft rather than
        // leaving the page stuck on a loading skeleton forever.
        setProfile({
          id: 0, user_id: null, access_code: "", full_name: "", gender: "", father_name: "", birth_date: null,
          national_id: "", birth_certificate_number: "", birth_certificate_issue_place: "",
          full_address: "", province: null, city: null, district: null,
          province_name: null, city_name: null, district_name: null, postal_code: "",
          emergency_contact_phone: "", guardianship_status: "none", guardian_details: "",
          language_dialect: "", basic_medical_info: "", created_at: "", updated_at: "",
        })
      })
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  async function handleSave(andContinue = false) {
    if (!profile) return
    setSaving(true); setError([]); setMessage("")
    try {
      const updated = await myPatientService.update({
        full_name: profile.full_name, gender: profile.gender, father_name: profile.father_name,
        birth_date: profile.birth_date, national_id: profile.national_id,
        full_address: profile.full_address, province: profile.province,
        city: profile.city, district: profile.district, postal_code: profile.postal_code,
        emergency_contact_phone: profile.emergency_contact_phone,
        guardianship_status: profile.guardianship_status, guardian_details: profile.guardian_details,
        language_dialect: profile.language_dialect, basic_medical_info: profile.basic_medical_info,
      })
      setProfile(updated)
      if (andContinue) {
        router.push(ROUTES.questionnaire)
        return
      }
      setMessage("تغییرات ذخیره شد.")
    } catch (err: any) {
      setError(parseApiErrors(err?.response?.data))
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b border-pink-100 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">اطلاعات پروفایل</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        {loading || !profile ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : (
          <>
            <ErrorSummary errors={error} />
            {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-rose-900">اطلاعات هویتی</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="نام و نام خانوادگی" required>
                  <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                </Field>
                <Field label="جنسیت">
                  <ChoiceSelect choices={GENDER} value={profile.gender} onChange={(v) => setProfile({ ...profile, gender: v })} />
                </Field>
                <Field label="نام پدر">
                  <Input value={profile.father_name} onChange={(e) => setProfile({ ...profile, father_name: e.target.value })} />
                </Field>
                <Field label="تاریخ تولد">
                  <JalaliDatePicker value={profile.birth_date || ""} onChange={(v) => setProfile({ ...profile, birth_date: v })} />
                </Field>
                <Field label="شماره ملی">
                  <Input value={profile.national_id} onChange={(e) => setProfile({ ...profile, national_id: e.target.value })} dir="ltr" />
                </Field>

                <LocationPicker
                  province={profile.province} city={profile.city} district={profile.district}
                  onChange={(v) => setProfile({ ...profile, ...v })}
                />
                <Field label="نشانی کامل">
                  <Textarea value={profile.full_address} onChange={(e) => setProfile({ ...profile, full_address: e.target.value })} />
                </Field>
                <Field label="شماره تماس اضطراری">
                  <Input value={profile.emergency_contact_phone} onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })} dir="ltr" />
                </Field>

                <Field label="وضعیت سرپرستی">
                  <ChoiceSelect choices={GUARDIANSHIP_STATUS} value={profile.guardianship_status} onChange={(v) => setProfile({ ...profile, guardianship_status: v })} />
                </Field>
                {profile.guardianship_status !== "none" && (
                  <Field label="اطلاعات وصی/قیم" required>
                    <Textarea value={profile.guardian_details} onChange={(e) => setProfile({ ...profile, guardian_details: e.target.value })} />
                  </Field>
                )}
                <Field label="زبان و گویش">
                  <SelectWithOther choices={LANGUAGE_DIALECT} value={profile.language_dialect} onChange={(v) => setProfile({ ...profile, language_dialect: v })} />
                </Field>
                <Field label="اطلاعات پزشکی پایه">
                  <Textarea value={profile.basic_medical_info} onChange={(e) => setProfile({ ...profile, basic_medical_info: e.target.value })} />
                </Field>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-gradient-to-l from-pink-400 to-rose-400 shadow-md shadow-pink-200/50 hover:from-pink-500 hover:to-rose-500"
                size="lg" onClick={() => handleSave(false)} disabled={saving}
              >
                {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
              <Button
                variant="outline" className="flex-1 border-pink-200 text-rose-700 hover:bg-pink-50"
                size="lg" onClick={() => handleSave(true)} disabled={saving}
              >
                ذخیره و ادامه به پرسشنامه ←
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
