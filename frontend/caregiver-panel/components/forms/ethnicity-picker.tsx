"use client"

import { ETHNICITY, ETHNICITY_SUBGROUPS } from "@/lib/constants"
import { CheckboxGroup } from "@/components/forms/fields"

/**
 * قومیت دو سطحی: اول قومیت اصلی (مثلاً «آذری/ترک») انتخاب می‌شود؛ با انتخاب
 * هر قومیت، گزینه‌های «اهل کجا» همان قومیت زیرش باز می‌شود. هر دو سطح ذخیره
 * می‌شوند (ethnicities + ethnicity_details) تا بعداً در matching استفاده شوند.
 */
export function EthnicityPicker({
  ethnicities, details, onChange,
}: {
  ethnicities: string[]
  details: Record<string, string[]>
  onChange: (next: { ethnicities: string[]; ethnicity_details: Record<string, string[]> }) => void
}) {
  function setMains(mains: string[]) {
    // زیرگروهِ قومیتی که برداشته شد هم پاک می‌شود.
    const nextDetails: Record<string, string[]> = {}
    for (const m of mains) if (details[m]?.length) nextDetails[m] = details[m]
    onChange({ ethnicities: mains, ethnicity_details: nextDetails })
  }

  function setSubs(main: string, subs: string[]) {
    const nextDetails = { ...details }
    if (subs.length) nextDetails[main] = subs
    else delete nextDetails[main]
    onChange({ ethnicities, ethnicity_details: nextDetails })
  }

  return (
    <div className="space-y-3">
      <CheckboxGroup choices={ETHNICITY} value={ethnicities} onChange={setMains} />
      {ethnicities.map((main) => {
        const subs = ETHNICITY_SUBGROUPS[main]
        if (!subs) return null
        const label = ETHNICITY.find((c) => c[0] === main)?.[1] ?? main
        return (
          <div key={main} className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
            <p className="mb-2 text-sm font-medium text-foreground">اهل کجا؟ — {label}</p>
            <CheckboxGroup choices={subs} value={details[main] ?? []} onChange={(v) => setSubs(main, v)} />
          </div>
        )
      })}
    </div>
  )
}
