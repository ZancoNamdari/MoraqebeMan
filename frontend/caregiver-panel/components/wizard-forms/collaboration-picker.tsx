"use client"

import { Input } from "@/components/ui/input"
import { Field, CheckboxGroup } from "@/components/wizard-forms/fields"
import { JalaliDatePicker } from "@/components/wizard-forms/jalali-date-picker"
import {
  COLLABORATION_GROUP, COLLABORATION_LONG_TERM, COLLABORATION_SHORT_TERM,
  COLLABORATION_DAYS_HOURS, COLLABORATION_TYPE, WEEKDAY, SHIFT,
} from "@/lib/wizard-constants"

export interface ScheduleEntry {
  days?: string[]
  from?: string
  to?: string
  shifts?: string[]
  target_date?: string
}
export type CollaborationSchedule = Record<string, ScheduleEntry>

const SPECIFIC_SHIFTS = SHIFT.filter((c) => c[0] !== "24h")
const LONG_KEYS = COLLABORATION_LONG_TERM.map((c) => c[0])
const SHORT_KEYS = COLLABORATION_SHORT_TERM.map((c) => c[0])
const labelOf = (key: string) => COLLABORATION_TYPE.find((c) => c[0] === key)?.[1] ?? key

/** پیام مشکلات تکمیل‌نشده‌ی نوع همکاری (برای نمایش قبل از ذخیره). */
export function collaborationProblems(types: string[], schedule: CollaborationSchedule): string[] {
  const out: string[] = []
  if (types.includes("long_term") && !types.some((t) => LONG_KEYS.includes(t)))
    out.push("برای «بلندمدت» حداقل یکی از گزینه‌های شبانه‌روزی / روزانه / شبانه / ماهانه را انتخاب کنید.")
  if (types.includes("short_term") && !types.some((t) => SHORT_KEYS.includes(t)))
    out.push("برای «کوتاه‌مدت» حداقل یکی از گزینه‌های ساعتی / بیمارستان / شیفتی را انتخاب کنید.")
  for (const key of types) {
    const e = schedule[key] ?? {}
    if (COLLABORATION_DAYS_HOURS.includes(key)) {
      if (!(e.days?.length)) out.push(`روزهای «${labelOf(key)}» را انتخاب کنید.`)
      if (!e.from || !e.to) out.push(`ساعت شروع و پایان «${labelOf(key)}» را وارد کنید.`)
    } else if (key === "shift") {
      if (!(e.days?.length)) out.push("روزهای «شیفتی» را انتخاب کنید.")
      if (!(e.shifts?.length)) out.push("شیفت‌های «شیفتی» را انتخاب کنید.")
    } else if (key === "monthly") {
      if (!e.target_date) out.push("تاریخ مدنظر برای «ماهانه» را وارد کنید.")
    }
  }
  return out
}

function EntryFields({
  type, entry, onChange,
}: { type: string; entry: ScheduleEntry; onChange: (e: ScheduleEntry) => void }) {
  if (type === "live_in") return null
  const set = (patch: Partial<ScheduleEntry>) => onChange({ ...entry, ...patch })
  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <p className="text-sm font-semibold">{labelOf(type)}</p>
      {type === "monthly" ? (
        <Field label="تاریخ مدنظر شما برای همکاری ماهانه">
          <JalaliDatePicker value={entry.target_date ?? ""} onChange={(v) => set({ target_date: v })} />
        </Field>
      ) : (
        <>
          <Field label="روزهای کاری">
            <CheckboxGroup choices={WEEKDAY} value={entry.days ?? []} onChange={(v) => set({ days: v })} />
          </Field>
          {type === "shift" ? (
            <Field label="چه شیفت‌هایی؟">
              <CheckboxGroup choices={SPECIFIC_SHIFTS} value={entry.shifts ?? []} onChange={(v) => set({ shifts: v })} />
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="از ساعت"><Input type="time" dir="ltr" value={entry.from ?? ""} onChange={(e) => set({ from: e.target.value })} /></Field>
              <Field label="تا ساعت"><Input type="time" dir="ltr" value={entry.to ?? ""} onChange={(e) => set({ to: e.target.value })} /></Field>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function CollaborationPicker({
  types, schedule, onChange, error,
}: {
  types: string[]
  schedule: CollaborationSchedule
  onChange: (types: string[], schedule: CollaborationSchedule) => void
  error?: string
}) {
  function setTypes(next: string[]) {
    // زیرگروه‌هایی که دیگر انتخاب نیستند، برنامه‌شان هم پاک می‌شود.
    const nextSchedule: CollaborationSchedule = {}
    for (const k of Object.keys(schedule)) if (next.includes(k)) nextSchedule[k] = schedule[k]
    onChange(next, nextSchedule)
  }

  function changeGroup(group: string[], groupKeys: string[], subKeys: string[]) {
    // با برداشتن یک گروه، زیرگروه‌هایش هم برداشته می‌شوند.
    const removed = ["long_term", "short_term"].filter((g) => types.includes(g) && !group.includes(g))
    let next = group
    for (const g of removed) next = next.filter((t) => !(g === "long_term" ? LONG_KEYS : SHORT_KEYS).includes(t))
    setTypes(next)
  }

  function renderGroup(groupKey: string, subChoices: typeof COLLABORATION_LONG_TERM, subKeys: string[]) {
    if (!types.includes(groupKey)) return null
    const selectedSubs = subKeys.filter((k) => types.includes(k))
    return (
      <div key={groupKey} className="space-y-3 rounded-md border p-3">
        <Field label={`نوع ${labelOf(groupKey)}`}>
          <CheckboxGroup
            choices={subChoices}
            value={selectedSubs}
            onChange={(v) => setTypes([...types.filter((t) => !subKeys.includes(t)), ...v])}
          />
        </Field>
        {selectedSubs.map((k) => (
          <EntryFields
            key={k}
            type={k}
            entry={schedule[k] ?? {}}
            onChange={(e) => onChange(types, { ...schedule, [k]: e })}
          />
        ))}
      </div>
    )
  }

  const groupsSelected = types.filter((t) => t === "long_term" || t === "short_term")
  return (
    <div className="space-y-3">
      <Field label="نوع همکاری" error={error}>
        <CheckboxGroup
          choices={COLLABORATION_GROUP}
          value={groupsSelected}
          onChange={(v) => {
            const others = types.filter((t) => t !== "long_term" && t !== "short_term")
            changeGroup([...others, ...v], v, [])
          }}
        />
      </Field>
      {renderGroup("long_term", COLLABORATION_LONG_TERM, LONG_KEYS)}
      {renderGroup("short_term", COLLABORATION_SHORT_TERM, SHORT_KEYS)}
    </div>
  )
}

const weekdayLabel = (d: string) => WEEKDAY.find((c) => c[0] === d)?.[1] ?? d
const shiftLabel = (d: string) => SHIFT.find((c) => c[0] === d)?.[1] ?? d

/** خلاصه‌ی خوانا برای صفحه‌ی پروفایل/بررسی: [{label: «روزانه», value: «شنبه، یکشنبه — ۰۸:۰۰ تا ۱۶:۰۰»}] */
export function summarizeSchedule(types: string[], schedule: CollaborationSchedule): { label: string; value: string }[] {
  return [...LONG_KEYS, ...SHORT_KEYS]
    .filter((k) => types.includes(k))
    .map((k) => {
      const e = schedule?.[k] ?? {}
      const days = (e.days ?? []).map(weekdayLabel).join("، ")
      let value = ""
      if (k === "monthly") value = e.target_date ?? ""
      else if (k === "live_in") value = "—"
      else if (k === "shift") value = [days, (e.shifts ?? []).map(shiftLabel).join("، ")].filter(Boolean).join(" — ")
      else value = [days, e.from && e.to ? `${e.from} تا ${e.to}` : ""].filter(Boolean).join(" — ")
      return { label: labelOf(k), value: value || "—" }
    })
}
