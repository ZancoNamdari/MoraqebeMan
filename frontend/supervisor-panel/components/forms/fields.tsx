"use client"

import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { Choice } from "@/lib/constants"

export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}

export function ChoiceSelect({
  choices, value, onChange, placeholder = "انتخاب کنید...",
}: {
  choices: Choice[]; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {choices.map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </Select>
  )
}

export function CheckboxGroup({
  choices, value, onChange,
}: {
  choices: Choice[]; value: string[]; onChange: (v: string[]) => void
}) {
  function toggle(val: string) {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val])
  }
  return (
    <div className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
      {choices.map(([val, label]) => (
        <label key={val} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={value.includes(val)} onChange={() => toggle(val)} />
          {label}
        </label>
      ))}
    </div>
  )
}

export function YesNo({
  value, onChange,
}: {
  value: boolean | null; onChange: (v: boolean | null) => void
}) {
  return (
    <div className="flex gap-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" checked={value === true} onChange={() => onChange(true)} className="accent-primary" />
        بله
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" checked={value === false} onChange={() => onChange(false)} className="accent-primary" />
        خیر
      </label>
    </div>
  )
}
