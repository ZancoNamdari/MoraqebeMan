"use client"

import { useEffect, useRef, useState } from "react"
import { CaregiverAvatar } from "./caregiver-avatar"
import { cn } from "@/lib/utils"
import type { PublicCaregiverProfile } from "@/types/caregiver-public"

const BRAND = "#00b394"
const TABS = [
  { id: "overview", label: "اطلاعات کلی" },
  { id: "skills", label: "تخصص‌ها و مهارت‌ها" },
  { id: "reviews", label: "نظرات" },
] as const

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" style={{ fontSize: size }} aria-label={`${value} از ۵`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} style={{ color: i <= Math.round(value) ? "#f5a623" : "#d9dce1" }}>★</span>)}
    </span>
  )
}

function Pin() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="h-px flex-1 bg-[#e3e5e8]" />
      <h2 className="text-[15px] font-bold text-[#222]">{children}</h2>
      <div className="h-px flex-1 bg-[#e3e5e8]" />
    </div>
  )
}

const card = "rounded-lg border border-[#ececef] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]"

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#f1f1f3] py-2.5 text-[13px] last:border-0">
      <span className="shrink-0 text-[#8a8f98]">{label}</span>
      <span className="text-left font-medium text-[#222]">{value}</span>
    </div>
  )
}

function Tags({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="border-b border-[#f1f1f3] py-3 last:border-0">
      <p className="mb-2 text-[12px] text-[#8a8f98]">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x) => <span key={x} className="rounded-md bg-[#f3f4f6] px-2.5 py-1 text-[12px] text-[#444]">{x}</span>)}
      </div>
    </div>
  )
}

export function CaregiverProfileView({ p, stickyTop = 0 }: { p: PublicCaregiverProfile; stickyTop?: number }) {
  const [active, setActive] = useState<string>("overview")
  const [introOpen, setIntroOpen] = useState(false)
  const [shown, setShown] = useState(5)
  const refs = useRef<Record<string, HTMLElement | null>>({})
  const lockUntil = useRef(0)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // کانتینر اسکرول: در بعضی پنل‌ها (مثل آژانس) خودِ صفحه اسکرول نمی‌شود و فقط
  // <main> اسکرول دارد؛ پس نزدیک‌ترین والدِ قابل‌اسکرول را پیدا می‌کنیم.
  function findScroller(): HTMLElement | null {
    let el = rootRef.current?.parentElement ?? null
    while (el) {
      const oy = getComputedStyle(el).overflowY
      if ((oy === "auto" || oy === "scroll" || oy === "overlay") && el.scrollHeight > el.clientHeight) return el
      el = el.parentElement
    }
    return null
  }

  // تب فعال با اسکرول خودکار عوض می‌شود (scrollspy).
  useEffect(() => {
    const scroller = findScroller()
    const target: HTMLElement | Window = scroller ?? window
    const onScroll = () => {
      if (Date.now() < lockUntil.current) return
      const base = scroller ? scroller.getBoundingClientRect().top : 0
      const line = base + stickyTop + 90
      let current: string = TABS[0].id
      for (const t of TABS) {
        const el = refs.current[t.id]
        if (el && el.getBoundingClientRect().top - line <= 0) current = t.id
      }
      const atBottom = scroller
        ? scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4
        : window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      if (atBottom) current = TABS[TABS.length - 1].id
      setActive(current)
    }
    onScroll()
    target.addEventListener("scroll", onScroll, { passive: true })
    return () => target.removeEventListener("scroll", onScroll)
  }, [stickyTop])

  function goTo(id: string) {
    const el = refs.current[id]
    if (!el) return
    const scroller = findScroller()
    const base = scroller ? scroller.getBoundingClientRect().top : 0
    const delta = el.getBoundingClientRect().top - (base + stickyTop + 62)
    setActive(id)
    lockUntil.current = Date.now() + 700
    if (scroller) scroller.scrollBy({ top: delta, behavior: "smooth" })
    else window.scrollBy({ top: delta, behavior: "smooth" })
  }

  const total = p.review_count
  const dist = p.rating_distribution || {}
  const e = p.experience
  const sk = p.skills
  const av = p.availability
  const yn = (v: boolean | null | undefined) => (v === true ? "بله" : v === false ? "خیر" : null)
  const languages = [...sk.foreign_languages, ...sk.local_languages]
  const introItems = introOpen ? p.highlights : p.highlights.slice(0, 3)

  return (
    <div ref={rootRef} className="-mx-4 bg-[#f6f6f7] px-4 pb-10" style={{ ["--brand" as any]: BRAND }}>
      <nav className="sticky z-20 -mx-4 border-b border-[#e3e5e8] bg-white px-4" style={{ top: stickyTop }}>
        <div className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => goTo(t.id)}
              className="flex-1 py-3.5 text-[13px] transition-colors"
              style={{
                color: active === t.id ? BRAND : "#6b7078",
                fontWeight: active === t.id ? 700 : 400,
                boxShadow: active === t.id ? `inset 0 -2px 0 ${BRAND}` : "none",
              }}
            >{t.label}</button>
          ))}
        </div>
      </nav>

      <div className="space-y-9 pt-4">
        {/* ── اطلاعات کلی ── */}
        <section ref={(el) => { refs.current.overview = el }} className="space-y-4">
          <div className={cn(card, "relative p-4 pb-5")}>
            {p.elderly_experience && (
              <div className="absolute left-4 top-4 text-left text-[11px] leading-5 text-[#8a8f98]">
                سابقه کار
                <p className="text-[12px] font-bold text-[#222]">{p.elderly_experience}</p>
              </div>
            )}
            <div className="flex flex-col items-center gap-2.5 pt-3 text-center">
              <CaregiverAvatar url={p.photo_url} name={p.display_name} className="h-[84px] w-[84px] ring-2 ring-[#eef0f2]" />
              <h1 className="text-[15px] font-bold text-[#222]">{p.display_name}</h1>
              {(p.age || p.city) && (
                <p className="flex items-center gap-1 text-[12px] text-[#8a8f98]">
                  {p.age ? <span>{fa(p.age)} ساله</span> : null}
                  {p.age && p.city ? <span>·</span> : null}
                  {p.city ? <span className="flex items-center gap-0.5"><Pin />{p.city}</span> : null}
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 rounded-md bg-[#f1f2f4] py-3 text-center">
              <div className="border-l border-[#dcdfe3]">
                <p className="text-[15px] font-bold text-[#222]">{fa(p.care_count)}</p>
                <p className="mt-0.5 text-[11px] text-[#8a8f98]">مراقبت موفق</p>
              </div>
              <div className="border-l border-[#dcdfe3]">
                <p className="text-[15px] font-bold text-[#222]">{p.avg_rating != null ? <>{fa(p.avg_rating.toFixed ? p.avg_rating.toFixed(1) : p.avg_rating)} <span className="text-[#f5a623]">★</span></> : "—"}</p>
                <p className="mt-0.5 text-[11px] text-[#8a8f98]">({fa(p.review_count)} نظر)</p>
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#222]">{p.satisfaction_percent != null ? `${fa(p.satisfaction_percent)}٪` : "—"}</p>
                <p className="mt-0.5 text-[11px] text-[#8a8f98]">رضایت کاربران</p>
              </div>
            </div>

            {p.highlights.length > 0 && (
              <p className="mt-4 text-[13px] leading-7 text-[#333]">
                <span className="font-bold">ویژگی‌ها: </span>
                {introItems.join("، ")}
                {!introOpen && p.highlights.length > 3 && (
                  <>… <button onClick={() => setIntroOpen(true)} className="font-medium" style={{ color: BRAND }}>بیشتر</button></>
                )}
              </p>
            )}

            {total > 0 && (
              <div className="mt-4 rounded-md bg-[#f1f2f4] px-4 py-5 text-center">
                <p className="text-[28px] font-bold leading-none text-[#222]">{fa((p.avg_rating ?? 0).toFixed(1))}</p>
                <div className="mt-2"><Stars value={p.avg_rating ?? 0} size={18} /></div>
                <p className="mb-4 mt-1.5 text-[11px] text-[#8a8f98]">({fa(total)} نفر امتیاز داده‌اند)</p>
                <div className="mx-auto max-w-[260px] space-y-2">
                  {[5, 4, 3, 2, 1].map((i) => {
                    const n = dist[String(i)] ?? 0
                    return (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-[#8a8f98]">
                        <span className="w-5 shrink-0 text-left">{fa(i)}<span className="text-[#f5a623]">★</span></span>
                        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#d9dce1]">
                          <div className="h-full rounded-full bg-[#f5a623]" style={{ width: `${(n / total) * 100}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={cn(card, "px-4 py-2")}>
            <p className="border-b border-[#f1f1f3] py-3 text-[14px] font-bold text-[#222]">مشخصات</p>
            <Row label="نام و نام خانوادگی" value={p.display_name} />
            <Row label="سن" value={p.age ? `${fa(p.age)} سال` : null} />
            <Row label="جنسیت" value={p.about.gender} />
            <Row label="وضعیت تأهل" value={p.about.marital_status} />
            <Row label="تعداد فرزندان" value={p.about.children_count} />
            <Row label="قومیت / زبان مادری" value={p.about.ethnicities.join("، ")} />
            <Row label="محل سکونت" value={[p.about.province, p.city].filter(Boolean).join("، ")} />
            <Row label="سابقه‌ی کار" value={p.elderly_experience} />
          </div>

          <div className={cn(card, "px-4 py-2")}>
            <p className="border-b border-[#f1f1f3] py-3 text-[14px] font-bold text-[#222]">شرایط همکاری</p>
            <Tags title="نوع همکاری" items={av.collaboration_types} />
            <Tags title="روزهای کاری" items={av.days} />
            <Tags title="شیفت‌ها" items={av.shifts} />
            <Row label="اقامت شبانه" value={yn(av.overnight_stay)} />
            <Row label="کار در تعطیلات" value={yn(av.holiday_work)} />
            {p.serves_all_areas ? <Row label="مناطق خدمت" value="همه‌ی مناطق" /> : <Tags title="مناطق خدمت" items={p.areas} />}
          </div>
        </section>

        {/* ── تخصص‌ها و مهارت‌ها ── */}
        <section ref={(el) => { refs.current.skills = el }}>
          <Heading>تخصص‌ها و مهارت‌ها</Heading>
          <div className="space-y-4">
            <div className={cn(card, "px-4")}>
              {p.services.map((s) => (
                <div key={s.key} className="flex items-center gap-3 border-b border-[#f1f1f3] py-4 last:border-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md" style={{ background: "#e6f7f4", color: BRAND }}>
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                      <path d="M12 21s-7-4.4-9.3-9A5.2 5.2 0 0 1 12 6.6 5.2 5.2 0 0 1 21.3 12C19 16.6 12 21 12 21z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-[#222]">{s.label}</p>
                    {s.subtypes.length > 0 && <p className="mt-0.5 text-[12px] leading-5 text-[#8a8f98]">{s.subtypes.join("، ")}</p>}
                    {p.city && <p className="mt-1 flex items-center gap-0.5 text-[12px] font-medium text-[#222]"><Pin />{p.city}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className={cn(card, "px-4 py-1")}>
              <Row label="تجربه‌ی مراقبت از سالمند" value={e.elderly_care} />
              <Row label="تجربه‌ی خدمات دیگر" value={e.other_services} />
              <Row label="تعداد افراد مراقبت‌شده" value={e.patients_cared_for} />
              {e.live_in && <Row label="مراقبت مقیم" value="تجربه دارد" />}
              {e.couple_care && <Row label="مراقبت از زوج" value="تجربه دارد" />}
              {e.solo_elderly_care && <Row label="مراقبت تنها از سالمند" value="تجربه دارد" />}
              <Row label="تحصیلات" value={[sk.education, sk.field_of_study].filter(Boolean).join(" — ")} />
              {sk.driving_license && <Row label="گواهینامه" value="دارد" />}
              <Tags title="استعدادهای ویژه" items={p.special_talents} />
              <Tags title="محل‌های سابق فعالیت" items={e.previous_workplaces} />
              <Tags title="تجربه با شرایط خاص" items={e.special_conditions} />
              <Tags title="دوره‌های آموزشی" items={sk.training_courses} />
              <Tags title="مهارت‌های مراقبتی" items={sk.caregiving} />
              <Tags title="مهارت‌های ارتباطی" items={sk.communication} />
              <Tags title="مهارت‌های خانگی" items={sk.household} />
              <Tags title="کمک به جابجایی" items={sk.mobility} />
              <Tags title="زبان‌ها" items={languages} />
            </div>
          </div>
        </section>

        {/* ── نظرات ── */}
        <section ref={(el) => { refs.current.reviews = el }}>
          <Heading>نظرات</Heading>
          {p.reviews.length === 0 ? (
            <p className={cn(card, "py-10 text-center text-[13px] text-[#8a8f98]")}>هنوز نظری ثبت نشده است.</p>
          ) : (
            <div className={cn(card, "px-4")}>
              {p.reviews.slice(0, shown).map((r) => (
                <div key={r.id} className="border-b border-[#f1f1f3] py-4">
                  <div className="flex items-center justify-between gap-2 text-[12px] text-[#8a8f98]">
                    <span>{r.name}{p.city ? ` (${p.city})` : ""}</span>
                    <span>{r.when}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#444]">
                    <Stars value={r.rating} size={13} />
                    <span>امتیاز به مراقبت</span>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-7 text-[#222]">{r.comment}</p>
                </div>
              ))}
              {shown < p.reviews.length && (
                <button onClick={() => setShown(shown + 5)} className="w-full py-4 text-center text-[13px] font-medium" style={{ color: BRAND }}>
                  + نمایش بیشتر
                </button>
              )}
            </div>
          )}
        </section>

        <p className="px-2 text-center text-[11px] text-[#9aa0a8]">
          برای حفظ حریم خصوصی، اطلاعات تماس و هویتی مراقب در این صفحه نمایش داده نمی‌شود.
        </p>
      </div>
    </div>
  )
}
