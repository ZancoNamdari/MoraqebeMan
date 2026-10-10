"use client"

import { ProfilePhotoUploader } from "@/components/forms/profile-photo-uploader"
import * as C from "@/lib/wizard-constants"
import { labelForValue, labelsForValues } from "@/lib/wizard-constants"
import type { FullCaregiverProfile } from "@/types/caregiver"

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function Chips({ items, tone = "bg-secondary text-foreground" }: { items: string[]; tone?: string }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => <span key={x} className={`rounded-full px-2.5 py-0.5 text-xs ${tone}`}>{x}</span>)}
    </div>
  )
}

// متن معرفی کوتاه را فقط از داده‌های واقعیِ ثبت‌شده می‌سازد؛ هر بخشی که پر نشده
// باشد حذف می‌شود تا جمله‌ی بی‌معنی یا ساختگی نسازد.
function buildBio(name: string, p: FullCaregiverProfile): string {
  const id = p.identity as (FullCaregiverProfile["identity"] & { age?: number | null }) | null
  const parts: string[] = []
  const gender = id?.gender ? labelForValue(C.GENDER, id.gender) : ""
  const age = id?.age ? `${id.age} ساله` : ""
  const who = [name, age && `${gender || ""} ${age}`.trim()].filter(Boolean).join("، ")
  if (who) parts.push(who + (age ? " است." : ""))
  const roles = (p.service_types ?? []).map((t) => labelForValue(C.ALL_SERVICE_TYPE, t)).filter(Boolean)
  if (roles.length) parts.push(`در حوزه‌ی ${roles.join(" و ")} فعالیت می‌کند.`)
  const exp = p.experience?.elderly_care_experience ? labelForValue(C.EXPERIENCE_RANGE, p.experience.elderly_care_experience) : ""
  if (exp) parts.push(`سابقه ارائه خدمت: ${exp}.`)
  const collab = p.work_preferences?.collaboration_types?.length
    ? labelsForValues(C.COLLABORATION_TYPE, p.work_preferences.collaboration_types) : ""
  if (collab) parts.push(`آماده‌ی همکاری به صورت ${collab}.`)
  const langs = [
    ...(p.skills?.foreign_languages ?? []).map((v) => labelForValue(C.FOREIGN_LANGUAGE, v)),
    ...(p.skills?.local_languages ?? []).map((v) => labelForValue(C.LOCAL_LANGUAGE, v)),
  ].filter(Boolean)
  if (langs.length) parts.push(`زبان‌ها: ${langs.join("، ")}.`)
  return parts.join(" ")
}

export function CaregiverHero({ userId, name, profile }: { userId: number; name: string; profile: FullCaregiverProfile }) {
  const id = profile.identity as (FullCaregiverProfile["identity"] & { age?: number | null }) | null
  const talents = [
    ...(id?.special_talents ?? []).filter((v) => v !== "other").map((v) => labelForValue(C.SPECIAL_TALENT, v)),
    ...((id?.special_talents ?? []).includes("other") ? [id?.special_talents_other?.trim() || "سایر"] : []),
  ].filter(Boolean)
  const roles = (profile.service_types ?? []).map((t) => labelForValue(C.ALL_SERVICE_TYPE, t)).filter(Boolean)
  const area = profile.service_areas?.[0]
  const areaText = area ? [area.province_name, area.city_name].filter(Boolean).join("، ") : ""
  const skills = (profile.skills?.caregiving_skills ?? []).slice(0, 8).map((v) => labelForValue(C.CAREGIVING_SKILL, v)).filter(Boolean)
  const exp = profile.experience?.elderly_care_experience ? labelForValue(C.EXPERIENCE_RANGE, profile.experience.elderly_care_experience) : ""
  const salary = profile.work_preferences?.requested_salary_range
    ? labelForValue(C.REQUESTED_SALARY_RANGE, profile.work_preferences.requested_salary_range) : ""
  const showcase = profile.showcase
  const bio = buildBio(name, profile)

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm">
      <div className="grid gap-6 p-5 md:grid-cols-[11rem_minmax(0,1fr)] md:p-6">
        <div className="flex justify-center md:justify-start"><ProfilePhotoUploader userId={userId} stacked /></div>
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{name || "—"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {[id?.gender ? labelForValue(C.GENDER, id.gender) : "", id?.age ? `${id.age} ساله` : "", areaText].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Chips items={roles} tone="bg-primary/10 text-primary" />
          </div>
          {bio && <p className="max-w-3xl text-sm leading-7 text-slate-700">{bio}</p>}
          {(talents.length > 0 || skills.length > 0) && (
            <div className="grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-2">
              {talents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">استعدادها و مهارت‌های ویژه</p>
                  <Chips items={talents} tone="bg-amber-100 text-amber-900" />
                </div>
              )}
              {skills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">مهارت‌های مراقبتی</p>
                  <Chips items={skills} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-x-reverse divide-y divide-slate-200 border-t border-slate-200 bg-muted/30 sm:grid-cols-4 sm:divide-y-0">
        <Stat value={exp || "—"} label="سابقه ارائه خدمت" />
        <Stat value={showcase ? showcase.care_count : "—"} label="خدمت انجام‌شده" />
        <Stat value={showcase?.satisfaction_percent != null ? `${showcase.satisfaction_percent}٪` : "—"} label="رضایت خانواده‌ها" />
        <Stat value={salary || "—"} label="حقوق درخواستی" />
      </div>
    </section>
  )
}
