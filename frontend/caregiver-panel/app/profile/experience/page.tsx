"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, ChoiceSelect, CheckboxGroup, YesNo } from "@/components/forms/fields"
import { experienceService, type MyExperience } from "@/services/experience_skills.service"
import {
  EXPERIENCE_RANGE, PREVIOUS_WORKPLACE, PATIENTS_CARED_FOR_COUNT, SPECIAL_CONDITION_EXPERIENCE,
} from "@/lib/constants"
import { ROUTES } from "@/lib/routes"

const emptyForm: MyExperience = {
  elderly_care_experience: "", other_services_experience: "", previous_workplaces: [],
  patients_cared_for_count: "", special_conditions_experience: [],
  live_in_experience: null, couple_care_experience: null,
  solo_elderly_care_experience: null, driving_for_patient_experience: null,
  last_workplace: "", additional_notes: "",
}

export default function ExperienceFormPage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()

  const [form, setForm] = useState<MyExperience>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    experienceService.me().then((data) => { if (data) setForm({ ...emptyForm, ...data }) }).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  function set<K extends keyof MyExperience>(key: K, value: MyExperience[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true); setError(""); setSaved(false)
    try {
      const savedData = await experienceService.save(form)
      setForm({ ...emptyForm, ...savedData })
      setSaved(true)
    } catch {
      setError("ثبت اطلاعات با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">سوابق کاری</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : (
          <>
            {saved && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">اطلاعات با موفقیت ذخیره شد.</div>}
            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

            <Card className="border-pink-100">
              <CardContent className="space-y-3 p-4">
                <Field label="سابقه مراقبت از سالمند">
                  <ChoiceSelect choices={EXPERIENCE_RANGE} value={form.elderly_care_experience || ""} onChange={(v) => set("elderly_care_experience", v)} />
                </Field>
                <Field label="سابقه سایر خدمات مراقبتی">
                  <ChoiceSelect choices={EXPERIENCE_RANGE} value={form.other_services_experience || ""} onChange={(v) => set("other_services_experience", v)} />
                </Field>
                <Field label="محل‌های سابق فعالیت">
                  <CheckboxGroup choices={PREVIOUS_WORKPLACE} value={form.previous_workplaces || []} onChange={(v) => set("previous_workplaces", v)} />
                </Field>
                <Field label="تعداد سالمندانی که تاکنون مراقبت کرده‌اید">
                  <ChoiceSelect choices={PATIENTS_CARED_FOR_COUNT} value={form.patients_cared_for_count || ""} onChange={(v) => set("patients_cared_for_count", v)} />
                </Field>
                <Field label="سابقه مراقبت از شرایط خاص">
                  <CheckboxGroup choices={SPECIAL_CONDITION_EXPERIENCE} value={form.special_conditions_experience || []} onChange={(v) => set("special_conditions_experience", v)} />
                </Field>

                <Field label="سابقه مراقبت مقیم (شبانه‌روزی)"><YesNo value={form.live_in_experience ?? null} onChange={(v) => set("live_in_experience", v)} /></Field>
                <Field label="سابقه مراقبت هم‌زمان از زوج سالمند"><YesNo value={form.couple_care_experience ?? null} onChange={(v) => set("couple_care_experience", v)} /></Field>
                <Field label="سابقه مراقبت تنها از یک سالمند"><YesNo value={form.solo_elderly_care_experience ?? null} onChange={(v) => set("solo_elderly_care_experience", v)} /></Field>
                <Field label="سابقه رانندگی برای بیمار"><YesNo value={form.driving_for_patient_experience ?? null} onChange={(v) => set("driving_for_patient_experience", v)} /></Field>

                <Field label="آخرین محل فعالیت"><Input value={form.last_workplace} onChange={(e) => set("last_workplace", e.target.value)} /></Field>
                <Field label="توضیحات تکمیلی"><Textarea maxLength={500} value={form.additional_notes} onChange={(e) => set("additional_notes", e.target.value)} /></Field>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {!loading && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <Button className="w-full" disabled={saving} onClick={handleSave}>
              {saving ? "در حال ذخیره..." : "ذخیره اطلاعات"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
