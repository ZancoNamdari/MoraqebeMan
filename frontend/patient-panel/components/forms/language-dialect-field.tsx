"use client"

import { Input } from "@/components/ui/input"
import { Field, ChoiceSelect } from "@/components/forms/fields"
import { LANGUAGES, parseLanguage, serializeLanguage } from "@/lib/languages"

/** انتخاب دو مرحله‌ای: زبان ← (در صورت نیاز) گویش/منطقه. مقدار را به‌صورت یک رشته برمی‌گرداند. */
export function LanguageDialectField({
  value, onChange, label = "زبان و گویش",
}: { value: string; onChange: (v: string) => void; label?: string }) {
  const { lang, dialect, other } = parseLanguage(value)
  const opt = LANGUAGES.find((l) => l.key === lang)
  return (
    <>
      <Field label={label}>
        <ChoiceSelect
          choices={LANGUAGES.map((l) => [l.key, l.label] as [string, string])}
          value={lang}
          onChange={(v) => onChange(serializeLanguage(v, "", ""))}
        />
      </Field>
      {opt?.dialects && (
        <Field label={opt.dialectQuestion ?? "کدام گویش؟"}>
          <ChoiceSelect
            choices={opt.dialects}
            value={dialect}
            onChange={(v) => onChange(serializeLanguage(lang, v, ""))}
            placeholder="مشخص نیست / فرقی ندارد"
          />
        </Field>
      )}
      {lang === "other" && (
        <Field label="کدام زبان یا گویش؟">
          <Input value={other} onChange={(e) => onChange(serializeLanguage("other", "", e.target.value))} />
        </Field>
      )}
    </>
  )
}
