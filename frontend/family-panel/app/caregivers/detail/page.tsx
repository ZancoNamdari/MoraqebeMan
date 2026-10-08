"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CaregiverAvatar } from "@/components/caregivers/caregiver-avatar"
import { TraitView } from "@/components/caregivers/trait-view"
import { caregiverDirectoryService } from "@/services/caregiver-directory.service"
import type { PublicCaregiverProfile } from "@/types/caregiver-public"
import { ROUTES } from "@/lib/routes"

function Chips({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => <span key={x} className="rounded-full bg-pink-50 px-2.5 py-1 text-xs text-rose-800 ring-1 ring-pink-100">{x}</span>)}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-left font-medium">{value}</span>
    </div>
  )
}

function Section({ title, children, show = true }: { title: string; children: React.ReactNode; show?: boolean }) {
  if (!show) return null
  return (
    <Card className="border-pink-100">
      <CardHeader className="pb-2"><CardTitle className="text-base text-rose-900">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}

function Content() {
  const { user, loading: authLoading } = useAuth(["family"])
  const router = useRouter()
  const id = useSearchParams().get("id")
  const [p, setP] = useState<PublicCaregiverProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user || !id) return
    caregiverDirectoryService.get(id).then(setP).catch(() => setError("این مراقب پیدا نشد.")).finally(() => setLoading(false))
  }, [user, id])

  if (authLoading || !user) return null

  const yn = (v: boolean | null | undefined) => (v === true ? "بله" : v === false ? "خیر" : null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">پروفایل مراقب</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.caregivers)}>بازگشت به فهرست</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {loading ? <Skeleton className="h-80 w-full rounded-2xl" /> : error || !p ? (
          <p className="py-10 text-center text-sm text-rose-700">{error || "این مراقب پیدا نشد."}</p>
        ) : (
          <>
            <Card className="border-pink-100">
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <CaregiverAvatar url={p.photo_url} name={p.display_name} gender={p.gender} className="h-28 w-28 text-5xl" />
                <div>
                  <h2 className="text-xl font-bold text-rose-900">{p.display_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[p.age ? `${p.age} ساله` : "", p.city].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {p.services.map((s) => (
                    <span key={s.key} className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">
                      {s.label}{s.subtypes.length ? ` — ${s.subtypes.join("، ")}` : ""}
                    </span>
                  ))}
                </div>
                <div className="grid w-full grid-cols-3 gap-2 pt-2">
                  <div className="rounded-xl bg-pink-50 p-3">
                    <p className="text-lg font-bold text-rose-900">{p.avg_rating ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">امتیاز ({p.review_count} نظر)</p>
                  </div>
                  <div className="rounded-xl bg-pink-50 p-3">
                    <p className="text-lg font-bold text-rose-900">{p.care_count}</p>
                    <p className="text-[11px] text-muted-foreground">مراقبت انجام‌شده</p>
                  </div>
                  <div className="rounded-xl bg-pink-50 p-3">
                    <p className="text-lg font-bold text-rose-900">{p.satisfaction_percent != null ? `${p.satisfaction_percent}٪` : "—"}</p>
                    <p className="text-[11px] text-muted-foreground">رضایت خانواده‌ها</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Section title="استعدادهای ویژه" show={p.special_talents.length > 0}>
              <Chips items={p.special_talents} />
            </Section>

            <Section title="تجربه">
              <Row label="تجربه‌ی مراقبت از سالمند" value={p.experience.elderly_care} />
              <Row label="تجربه‌ی خدمات دیگر" value={p.experience.other_services} />
              <Row label="تعداد افراد مراقبت‌شده" value={p.experience.patients_cared_for} />
              {p.experience.live_in && <Row label="مراقبت مقیم" value="تجربه دارد" />}
              {p.experience.couple_care && <Row label="مراقبت از زوج" value="تجربه دارد" />}
              {p.experience.solo_elderly_care && <Row label="مراقبت تنها از سالمند" value="تجربه دارد" />}
              {p.experience.previous_workplaces.length > 0 && (<><p className="text-xs text-muted-foreground">محل‌های سابق فعالیت</p><Chips items={p.experience.previous_workplaces} /></>)}
              {p.experience.special_conditions.length > 0 && (<><p className="text-xs text-muted-foreground">تجربه با شرایط خاص</p><Chips items={p.experience.special_conditions} /></>)}
            </Section>

            <Section title="مهارت و تحصیلات">
              <Row label="تحصیلات" value={[p.skills.education, p.skills.field_of_study].filter(Boolean).join(" — ")} />
              {p.skills.driving_license && <Row label="گواهینامه" value="دارد" />}
              {p.skills.training_courses.length > 0 && (<><p className="text-xs text-muted-foreground">دوره‌های آموزشی</p><Chips items={p.skills.training_courses} /></>)}
              {p.skills.caregiving.length > 0 && (<><p className="text-xs text-muted-foreground">مهارت‌های مراقبتی</p><Chips items={p.skills.caregiving} /></>)}
              {p.skills.communication.length > 0 && (<><p className="text-xs text-muted-foreground">مهارت‌های ارتباطی</p><Chips items={p.skills.communication} /></>)}
              {p.skills.household.length > 0 && (<><p className="text-xs text-muted-foreground">مهارت‌های خانگی</p><Chips items={p.skills.household} /></>)}
              {p.skills.mobility.length > 0 && (<><p className="text-xs text-muted-foreground">کمک به جابجایی</p><Chips items={p.skills.mobility} /></>)}
              {[...p.skills.foreign_languages, ...p.skills.local_languages].length > 0 && (<><p className="text-xs text-muted-foreground">زبان‌ها</p><Chips items={[...p.skills.foreign_languages, ...p.skills.local_languages]} /></>)}
            </Section>

            <Section title="شرایط همکاری">
              {p.availability.collaboration_types.length > 0 && (<><p className="text-xs text-muted-foreground">نوع همکاری</p><Chips items={p.availability.collaboration_types} /></>)}
              {p.availability.days.length > 0 && (<><p className="text-xs text-muted-foreground">روزهای کاری</p><Chips items={p.availability.days} /></>)}
              {p.availability.shifts.length > 0 && (<><p className="text-xs text-muted-foreground">شیفت‌ها</p><Chips items={p.availability.shifts} /></>)}
              <Row label="اقامت شبانه" value={yn(p.availability.overnight_stay)} />
              <Row label="کار در تعطیلات" value={yn(p.availability.holiday_work)} />
              {p.serves_all_areas ? <Row label="مناطق خدمت" value="همه‌ی مناطق" /> : p.areas.length > 0 && (<><p className="text-xs text-muted-foreground">مناطق خدمت</p><Chips items={p.areas} /></>)}
            </Section>

            <Section title="سبک کار و برخورد" show={p.trait_profiles.length > 0}>
              <TraitView profiles={p.trait_profiles} />
            </Section>

            <p className="px-2 text-center text-[11px] text-muted-foreground">
              برای حفظ حریم خصوصی، اطلاعات تماس و هویتی مراقب در این صفحه نمایش داده نمی‌شود.
            </p>
          </>
        )}
      </main>
    </div>
  )
}

export default function CaregiverDetailPage() {
  return <Suspense fallback={null}><Content /></Suspense>
}
