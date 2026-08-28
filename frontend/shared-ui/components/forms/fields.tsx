"use client"

import { Label } from "@/components/ui/label"
import type { Choice } from "@/lib/constants"

export function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <span className={required ? "font-bold text-foreground" : ""}>{label}</span>
        {required && (
          <span className="mr-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary-strong">
            الزامی
          </span>
        )}
      </Label>
      {children}
    </div>
  )
}

export function ChoiceSelect({
  choices, value, onChange, placeholder = "انتخاب کنید...",
}: { choices: Choice[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <select
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {choices.map(([val, label]) => (
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  )
}

export function CheckboxGroup({
  choices, value, onChange,
}: { choices: Choice[]; value: string[]; onChange: (v: string[]) => void }) {
  function toggle(val: string) {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {choices.map(([val, label]) => (
        <label
          key={val}
          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${
            value.includes(val) ? "border-primary/40 bg-secondary text-foreground" : "border-input text-muted-foreground"
          }`}
        >
          <input type="checkbox" className="ml-1.5 align-middle" checked={value.includes(val)} onChange={() => toggle(val)} />
          {label}
        </label>
      ))}
    </div>
  )
}
