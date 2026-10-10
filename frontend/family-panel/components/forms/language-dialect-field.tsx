"use client"

import { Field, CheckboxGroup } from "@/components/forms/fields"
import { LOCAL_LANGUAGE, parseLanguages, serializeLanguages } from "@/lib/languages"

/** زبان محلی — همان چک‌باکس‌های پنل آژانس؛ چند مورد قابل انتخاب است. */
export function LanguageDialectField({
  value, onChange, label = "زبان محلی",
}: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <Field label={label}>
      <CheckboxGroup choices={LOCAL_LANGUAGE} value={parseLanguages(value)} onChange={(v) => onChange(serializeLanguages(v))} />
    </Field>
  )
}
