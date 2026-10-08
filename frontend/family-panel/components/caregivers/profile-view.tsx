"use client"

import { useEffect, useRef, useState } from "react"
import { CaregiverAvatar } from "./caregiver-avatar"
import { cn } from "@/lib/utils"
import type { PublicCaregiverProfile } from "@/types/caregiver-public"

const TABS = [
  { id: "overview", label: "اطلاعات کلی" },
  { id: "skills", label: "تخصص‌ها و مهارت‌ها" },
  { id: "reviews", label: "نظرات" },
] as const

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5 text-amber-400", className)} aria-label={`${value} از ۵`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= Math.round(value) ? "" : "text-muted-foreground/30"}>★</span>)}
    </span>
  )
}

function Chips({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => <span key={x} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground ring-1 ring-border">{x}</span>)}
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

function Sub({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (<div className="space-y-1.5"><p className="text-xs text-muted-foreground">{title}</p><Chips items={items} /></div>)
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <h2 className="text-base font-bold text-foreground">{children}</h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

const card = "rounded-xl border bg-card p-4 shadow-sm"

export function CaregiverProfileView({ p, stickyTop = 0 }: { p: PublicCaregiverProfile; stickyTop?: number }) {
  const [active, setActive] = useState<string>("overview")
  const refs = useRef<Record<string, HTMLElement | null>>({})
  const lockUntil = useRef(0)

  // تب فعال با اسکرول خودکار عوض می‌شود (scrollspy).
  useEffect(() => {
    const onScroll = () => {
      if (Date.now() < lockUntil.current) return
      const line = stickyTop + 80
      let current: string = TABS[0].id
      for (const t of TABS) {
        const el = refs.current[t.id]
        if (el && el.getBoundingClientRect().top - line <= 0) current = t.id
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = TABS[TABS.length - 1].id
      setActive(current)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [stickyTop])

  function goTo(id: string) {
    const el = refs.current[id]
    if (!el) return
    setActive(id)
    lockUntil.current = Date.now() + 700
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - stickyTop - 56, behavior: "smooth" })
  }

  const total = p.review_count
  const dist = p.rating_distribution || {}
  const e = p.experience
  const sk = p.skills
  const av = p.availability
  const yn = (v: boolean | null | undefined) => (v === true ? "بله" : v === false ? "خیر" : null)
  const languages = [...sk.foreign_languages, ...sk.local_languages]

  return (
    <div>
      <nav className="sticky z-20 -mx-4 border-b bg-background/95 px-4 backdrop-blur" style={{ top: stickyTop }}>
        <div className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => goTo(t.id)}
              className={cn(
                "flex-1 border-b-2 py-3 text-sm transition-colors",
                active === t.id ? "border-primary font-bold text-primary" : "border-transparent text-muted-foreground",
              )}
            >{t.label}</button>
          ))}
        </div>
      </nav>

      <div className="space-y-8 pt-4">
        {/* ── اطلاعات کلی ── */}
        <section ref={(el) => { refs.current.overview = el }} className="space-y-4">
          <div className={cn(card, "relative")}>
            {(p.elderly_experience || p.satisfaction_percent != null) && (
              <div className="absolute left-4 top-4 space-y-0.5 text-left text-[11px] text-muted-foreground">
                {p.elderly_experience && <p>سابقه: <span className="font-semibold text-foreground">{p.elderly_experience}</span></p>}
                {p.satisfaction_percent != null && <p>رضایت کاربران: <span className="font-semibold text-foreground">{fa(p.satisfaction_percent)}٪</span></p>}
              </div>
            )}
            <div className="flex flex-col items-center gap-2 pt-2 text-center">
              <CaregiverAvatar url={p.photo_url} name={p.display_name} gender={p.gender} className="h-24 w-24 text-4xl" />
              <h1 className="text-lg font-bold">{p.display_name}</h1>
              <p className="text-xs text-muted-foreground">{[p.age ? `${fa(p.age)} ساله` : "", p.city].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-x-reverse rounded-lg bg-secondary/60 text-center">
              <div className="p-3"><p className="text-base font-bold">{fa(p.care_count)}</p><p className="text-[11px] text-muted-foreground">مراقبت انجام‌شده</p></div>
              <div className="p-3"><p className="text-base font-bold">{p.avg_rating != null ? <>{fa(p.avg_rating)} <span className="text-amber-400">★</span></> : "—"}</p><p className="text-[11px] text-muted-foreground">({fa(p.review_count)} نظر)</p></div>
              <div className="p-3"><p className="text-base font-bold">{p.satisfaction_percent != null ? `${fa(p.satisfaction_percent)}٪` : "—"}</p><p className="text-[11px] text-muted-foreground">رضایت خانواده‌ها</p></div>
            </div>
            {p.highlights.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold">ویژگی‌های برجسته</p>
                <Chips items={p.highlights} />
              </div>
            )}
            {total > 0 && (
              <div className="mt-4 rounded-lg bg-secondary/60 p-4 text-center">
                <p className="text-3xl font-bold">{fa(p.avg_rating ?? 0)}</p>
                <Stars value={p.avg_rating ?? 0} className="text-lg" />
                <p className="mb-3 text-xs text-muted-foreground">({fa(total)} نفر امتیاز داده‌اند)</p>
                <div className="mx-auto max-w-xs space-y-1.5">
                  {[5, 4, 3, 2, 1].map((i) => {
                    const n = dist[String(i)] ?? 0
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-6 text-muted-foreground">{fa(i)}★</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
                        </div>
                        <span className="w-6 text-left text-muted-foreground">{fa(n)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={cn(card, "space-y-3")}>
            <p className="text-sm font-semibold">شرایط همکاری</p>
            <Sub title="نوع همکاری" items={av.collaboration_types} />
            <Sub title="روزهای کاری" items={av.days} />
            <Sub title="شیفت‌ها" items={av.shifts} />
            <Row label="اقامت شبانه" value={yn(av.overnight_stay)} />
            <Row label="کار در تعطیلات" value={yn(av.holiday_work)} />
            {p.serves_all_areas ? <Row label="مناطق خدمت" value="همه‌ی مناطق" /> : <Sub title="مناطق خدمت" items={p.areas} />}
          </div>
        </section>

        {/* ── تخصص‌ها و مهارت‌ها ── */}
        <section ref={(el) => { refs.current.skills = el }} className="space-y-3">
          <SectionTitle>تخصص‌ها و مهارت‌ها</SectionTitle>
          <div className={cn(card, "divide-y p-0")}>
            {p.services.map((s) => (
              <div key={s.key} className="space-y-1 p-4">
                <p className="font-semibold">{s.label}</p>
                {s.subtypes.length > 0 && <p className="text-xs text-muted-foreground">{s.subtypes.join("، ")}</p>}
                {p.city && <p className="text-xs">📍 {p.city}</p>}
              </div>
            ))}
          </div>

          <div className={cn(card, "space-y-3")}>
            <Row label="تجربه‌ی مراقبت از سالمند" value={e.elderly_care} />
            <Row label="تجربه‌ی خدمات دیگر" value={e.other_services} />
            <Row label="تعداد افراد مراقبت‌شده" value={e.patients_cared_for} />
            {e.live_in && <Row label="مراقبت مقیم" value="تجربه دارد" />}
            {e.couple_care && <Row label="مراقبت از زوج" value="تجربه دارد" />}
            {e.solo_elderly_care && <Row label="مراقبت تنها از سالمند" value="تجربه دارد" />}
            <Row label="تحصیلات" value={[sk.education, sk.field_of_study].filter(Boolean).join(" — ")} />
            {sk.driving_license && <Row label="گواهینامه" value="دارد" />}
            <Sub title="استعدادهای ویژه" items={p.special_talents} />
            <Sub title="محل‌های سابق فعالیت" items={e.previous_workplaces} />
            <Sub title="تجربه با شرایط خاص" items={e.special_conditions} />
            <Sub title="دوره‌های آموزشی" items={sk.training_courses} />
            <Sub title="مهارت‌های مراقبتی" items={sk.caregiving} />
            <Sub title="مهارت‌های ارتباطی" items={sk.communication} />
            <Sub title="مهارت‌های خانگی" items={sk.household} />
            <Sub title="کمک به جابجایی" items={sk.mobility} />
            <Sub title="زبان‌ها" items={languages} />
          </div>
        </section>

        {/* ── نظرات ── */}
        <section ref={(el) => { refs.current.reviews = el }} className="space-y-3">
          <SectionTitle>نظرات</SectionTitle>
          {p.reviews.length === 0 ? (
            <p className="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground">هنوز نظری ثبت نشده است.</p>
          ) : (
            <div className={cn(card, "divide-y p-0")}>
              {p.reviews.map((r) => (
                <div key={r.id} className="space-y-1.5 p-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{r.name}</span>
                    <span>{r.when}</span>
                  </div>
                  <Stars value={r.rating} className="text-sm" />
                  <p className="text-sm leading-7">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="px-2 pb-4 text-center text-[11px] text-muted-foreground">
          برای حفظ حریم خصوصی، اطلاعات تماس و هویتی مراقب در این صفحه نمایش داده نمی‌شود.
        </p>
      </div>
    </div>
  )
}
