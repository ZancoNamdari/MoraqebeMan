"use client"

import { useEffect, useState } from "react"
import { Field, CheckboxGroup } from "@/components/forms/fields"
import { Combobox } from "@/components/forms/combobox"
import { locationService } from "@/services/location.service"
import type { Province } from "@/types/location"
import { LOCAL_LANGUAGE, parseLanguagePicks, serializeLanguagePicks } from "@/lib/languages"

/**
 * زبان محلی — مرحله ۱: چک‌باکس‌های همان پنل آژانس.
 * مرحله ۲: برای هر زبان انتخاب‌شده می‌پرسد «مالِ کجاست؟» (استان).
 */
export function LanguageDialectField({
  value, onChange, label = "زبان محلی",
}: { value: string; onChange: (v: string) => void; label?: string }) {
  const [provinces, setProvinces] = useState<Province[]>([])
  useEffect(() => { locationService.provinces().then(setProvinces).catch(() => {}) }, [])

  const picks = parseLanguagePicks(value)
  const keys = picks.map((p) => p.key)

  function setKeys(next: string[]) {
    onChange(serializeLanguagePicks(next.map((k) => picks.find((p) => p.key === k) ?? { key: k, province: null })))
  }
  function setProvince(key: string, province: number | null) {
    onChange(serializeLanguagePicks(picks.map((p) => (p.key === key ? { ...p, province } : p))))
  }

  return (
    <>
      <Field label={label}>
        <CheckboxGroup choices={LOCAL_LANGUAGE} value={keys} onChange={setKeys} />
      </Field>
      {picks.filter((p) => p.key !== "other").map((p) => (
        <Field key={p.key} label={`${LOCAL_LANGUAGE.find((l) => l[0] === p.key)![1]} — مالِ کجاست؟ (استان)`}>
          <Combobox
            options={provinces}
            value={p.province}
            onChange={(id) => setProvince(p.key, id)}
            placeholder="جستجوی استان..."
          />
        </Field>
      ))}
    </>
  )
}
