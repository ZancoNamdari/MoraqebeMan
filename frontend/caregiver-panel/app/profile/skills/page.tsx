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
import { skillsService, type MySkills } from "@/services/experience_skills.service"
import {
  EDUCATION_LEVEL, TRAINING_COURSE, COMMUNICATION_SKILL, CAREGIVING_SKILL, PHYSICAL_ABILITY,
  MOBILITY_ASSISTANCE_ABILITY, HOUSEHOLD_SKILL, FOREIGN_LANGUAGE, LOCAL_LANGUAGE,
} from "@/lib/constants"
import { ROUTES } from "@/lib/routes"

const emptyForm: MySkills = {
  education_level: "", field_of_study: "", training_courses: [],
  communication_skills: [], caregiving_skills: [], physical_ability: "",
  mobility_assistance_ability: [], household_skills: [],
  foreign_languages: [], local_languages: [],
  has_driving_license: null, can_use_smartphone: null, additional_notes: "",
}

export default function SkillsFormPage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()

  const [form, setForm] = useState<MySkills>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    skillsService.me().then((data) => { if (data) setForm({ ...emptyForm, ...data }) }).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  function set<K extends keyof MySkills>(key: K, value: MySkills[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true); setError(""); setSaved(false)
    try {
      const savedData = await skillsService.save(form)
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
          <h1 className="font-bold text-rose-900">مهارت‌ها</h1>
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
                <Field label="سطح تحصیلات"><ChoiceSelect choices={EDUCATION_LEVEL} value={form.education_level || ""} onChange={(v) => set("education_level", v)} /></Field>
                <Field label="رشته تحصیلی"><Input value={form.field_of_study} onChange={(e) => set("field_of_study", e.target.value)} /></Field>
                <Field label="دوره‌های آموزشی گذرانده‌شده">
                  <CheckboxGroup choices={TRAINING_COURSE} value={form.training_courses || []} onChange={(v) => set("training_courses", v)} />
                </Field>
                <Field label="مهارت‌های ارتباطی">
                  <CheckboxGroup choices={COMMUNICATION_SKILL} value={form.communication_skills || []} onChange={(v) => set("communication_skills", v)} />
                </Field>
                <Field label="مهارت‌های مراقبتی">
                  <CheckboxGroup choices={CAREGIVING_SKILL} value={form.caregiving_skills || []} onChange={(v) => set("caregiving_skills", v)} />
                </Field>
                <Field label="توانایی فیزیکی"><ChoiceSelect choices={PHYSICAL_ABILITY} value={form.physical_ability || ""} onChange={(v) => set("physical_ability", v)} /></Field>
                <Field label="توانایی کمک به جابجایی">
                  <CheckboxGroup choices={MOBILITY_ASSISTANCE_ABILITY} value={form.mobility_assistance_ability || []} onChange={(v) => set("mobility_assistance_ability", v)} />
                </Field>
                <Field label="مهارت‌های خانگی">
                  <CheckboxGroup choices={HOUSEHOLD_SKILL} value={form.household_skills || []} onChange={(v) => set("household_skills", v)} />
                </Field>
                <Field label="زبان‌های خارجی">
                  <CheckboxGroup choices={FOREIGN_LANGUAGE} value={form.foreign_languages || []} onChange={(v) => set("foreign_languages", v)} />
                </Field>
                <Field label="زبان‌ها/گویش‌های محلی">
                  <CheckboxGroup choices={LOCAL_LANGUAGE} value={form.local_languages || []} onChange={(v) => set("local_languages", v)} />
                </Field>
                <Field label="گواهینامه رانندگی دارید؟"><YesNo value={form.has_driving_license ?? null} onChange={(v) => set("has_driving_license", v)} /></Field>
                <Field label="توانایی استفاده از تلفن هوشمند؟"><YesNo value={form.can_use_smartphone ?? null} onChange={(v) => set("can_use_smartphone", v)} /></Field>
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
