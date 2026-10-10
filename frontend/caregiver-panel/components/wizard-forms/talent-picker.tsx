"use client"

import { Input } from "@/components/ui/input"
import { Field, CheckboxGroup } from "@/components/wizard-forms/fields"
import { TALENT_GROUPS } from "@/lib/wizard-constants"

// انتخاب استعدادها و مهارت‌های ویژه (ساز، هنر، علمی، ورزش و ...) — یک فهرست
// مسطح ذخیره می‌شود؛ هر گروه فقط زیرمجموعه‌ی خودش را ویرایش می‌کند.
export function TalentPicker({ value, other, onChange }: {
  value: string[]
  other: string
  onChange: (talents: string[], other: string) => void
}) {
  const current = value ?? []
  function setGroup(groupValues: string[], picked: string[]) {
    const rest = current.filter((v) => !groupValues.includes(v))
    const next = [...rest, ...picked]
    onChange(next, next.includes("other") ? other : "")
  }
  return (
    <>
      {TALENT_GROUPS.map((g) => {
        const groupValues = g.choices.map((c) => c[0])
        return (
          <Field key={g.title} label={`استعداد و مهارت ویژه — ${g.title}`}>
            <CheckboxGroup
              choices={g.choices}
              value={current.filter((v) => groupValues.includes(v))}
              onChange={(picked) => setGroup(groupValues, picked)}
            />
          </Field>
        )
      })}
      {current.includes("other") && (
        <Field label="استعداد یا مهارت دیگر را بنویسید">
          <Input value={other ?? ""} maxLength={200} onChange={(e) => onChange(current, e.target.value)} />
        </Field>
      )}
    </>
  )
}
