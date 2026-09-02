"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { myFullProfileService, type MyFullProfile } from "@/services/my_full_profile.service"
import {
  EDUCATION_LEVEL, CAREGIVING_SKILL, COMMUNICATION_SKILL, PHYSICAL_ABILITY,
  MOBILITY_ASSISTANCE_ABILITY, HOUSEHOLD_SKILL, FOREIGN_LANGUAGE, LOCAL_LANGUAGE,
  TRAINING_COURSE, PREVIOUS_WORKPLACE, PATIENTS_CARED_FOR_COUNT, SPECIAL_CONDITION_EXPERIENCE,
  REFERENCE_RELATION_TYPE, REFERENCE_ACQUAINTANCE_DURATION, labelForValue,
} from "@/lib/constants"
import { ROUTES } from "@/lib/routes"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-pink-100">
      <CardHeader><CardTitle className="text-base text-rose-900">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 border-b border-pink-50 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-rose-900">{value}</span>
    </div>
  )
}

function TagList({ label, values, choices }: { label: string; values?: string[]; choices: [string, string][] }) {
  if (!values || values.length === 0) return null
  return (
    <div className="border-b border-pink-50 py-1.5 last:border-0">
      <p className="mb-1.5 text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs text-rose-800">
            {labelForValue(choices, v)}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function MyProfilePage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()

  const [profile, setProfile] = useState<MyFullProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    myFullProfileService.get()
      .then(setProfile)
      .catch(() => setError("دریافت اطلاعات پروفایل با خطا مواجه شد."))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">پروفایل من</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : profile && (
          <>
            <Section title="اطلاعات اولیه">
              {profile.identity ? (
                <>
                  <Row label="نام و نام خانوادگی" value={profile.identity.full_name} />
                  <Row label="کد ملی" value={profile.identity.national_id} />
                  <Row label="جنسیت" value={profile.identity.gender} />
                </>
              ) : (
                <p className="text-muted-foreground">هنوز ثبت نشده — فرم «اطلاعات هویتی» را تکمیل کنید.</p>
              )}
            </Section>

            <Section title="سوابق تحصیلی">
              {profile.skills?.education_level || profile.skills?.field_of_study ? (
                <>
                  <Row label="سطح تحصیلات" value={labelForValue(EDUCATION_LEVEL, profile.skills.education_level)} />
                  <Row label="رشته تحصیلی" value={profile.skills.field_of_study} />
                  <TagList label="دوره‌های آموزشی" values={profile.skills.training_courses} choices={TRAINING_COURSE} />
                </>
              ) : (
                <p className="text-muted-foreground">هنوز ثبت نشده — بخش تحصیلات در فرم «مهارت‌ها» تکمیل می‌شود.</p>
              )}
            </Section>

            <Section title="سوابق شغلی">
              {profile.experience ? (
                <>
                  <Row label="سابقه مراقبت از سالمند" value={labelForValue(PATIENTS_CARED_FOR_COUNT, profile.experience.elderly_care_experience)} />
                  <Row label="تعداد سالمندانی که مراقبت کرده‌اید" value={labelForValue(PATIENTS_CARED_FOR_COUNT, profile.experience.patients_cared_for_count)} />
                  <Row label="آخرین محل کار" value={profile.experience.last_workplace} />
                  <TagList label="محل‌های کار قبلی" values={profile.experience.previous_workplaces} choices={PREVIOUS_WORKPLACE} />
                  <TagList label="تجربه شرایط خاص" values={profile.experience.special_conditions_experience} choices={SPECIAL_CONDITION_EXPERIENCE} />
                  {profile.experience.additional_notes && <Row label="توضیحات" value={profile.experience.additional_notes} />}
                </>
              ) : (
                <p className="text-muted-foreground">هنوز ثبت نشده — فرم «سوابق کاری» را تکمیل کنید.</p>
              )}
            </Section>

            <Section title="مهارت‌های تکمیلی">
              {profile.skills ? (
                <>
                  <Row label="توانایی فیزیکی" value={labelForValue(PHYSICAL_ABILITY, profile.skills.physical_ability)} />
                  <TagList label="مهارت‌های مراقبتی" values={profile.skills.caregiving_skills} choices={CAREGIVING_SKILL} />
                  <TagList label="مهارت‌های ارتباطی" values={profile.skills.communication_skills} choices={COMMUNICATION_SKILL} />
                  <TagList label="توانایی کمک به جابجایی" values={profile.skills.mobility_assistance_ability} choices={MOBILITY_ASSISTANCE_ABILITY} />
                  <TagList label="مهارت‌های خانگی" values={profile.skills.household_skills} choices={HOUSEHOLD_SKILL} />
                  <TagList label="زبان‌های خارجی" values={profile.skills.foreign_languages} choices={FOREIGN_LANGUAGE} />
                  <TagList label="زبان‌های محلی" values={profile.skills.local_languages} choices={LOCAL_LANGUAGE} />
                  <Row label="گواهینامه رانندگی" value={profile.skills.has_driving_license ? "دارد" : null} />
                  <Row label="استفاده از تلفن هوشمند" value={profile.skills.can_use_smartphone ? "بله" : null} />
                </>
              ) : (
                <p className="text-muted-foreground">هنوز ثبت نشده — فرم «مهارت‌ها» را تکمیل کنید.</p>
              )}
            </Section>

            <Section title={`معرف‌ها (${profile.references.length})`}>
              {profile.references.length === 0 ? (
                <p className="text-muted-foreground">معرفی ثبت نشده (اختیاری است).</p>
              ) : (
                profile.references.map((ref) => (
                  <div key={ref.id} className="border-b border-pink-50 py-2 last:border-0">
                    <p className="font-medium text-rose-900">{ref.full_name} — {ref.occupation}</p>
                    <p className="text-xs text-muted-foreground">
                      {labelForValue(REFERENCE_RELATION_TYPE, ref.relation_type)} ·{" "}
                      {labelForValue(REFERENCE_ACQUAINTANCE_DURATION, ref.acquaintance_duration)} · {ref.phone_number}
                    </p>
                  </div>
                ))
              )}
            </Section>

            <Section title="مناطق تحت پوشش">
              {profile.service_areas.length === 0 ? (
                <p className="text-muted-foreground">هنوز ثبت نشده — فرم «مناطق تحت پوشش» را تکمیل کنید.</p>
              ) : (
                profile.service_areas.map((area) => (
                  <p key={area.id} className="border-b border-pink-50 py-1.5 text-rose-900 last:border-0">
                    {area.province_name} {area.city_name && `— ${area.city_name}`} {area.district_name && `— ${area.district_name}`}
                  </p>
                ))
              )}
            </Section>
          </>
        )}
      </main>
    </div>
  )
}
