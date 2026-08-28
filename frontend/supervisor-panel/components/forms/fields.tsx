"use client"

import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { Choice } from "@/lib/constants"

export function Field({
  label, required, error, children,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5 rounded-lg", error && "ring-1 ring-destructive/50 bg-destructive/5 p-2.5")}>
      <Label className="flex items-center gap-1.5">
        <span className={cn(required && "font-bold text-foreground")}>{label}</span>
        {" "}
        {required && (
          <span className="mr-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary-strong">
            الزامی
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
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
    <div className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
      {choices.map(([val, label]) => {
        const checked = value.includes(val)
        return (
          <label
            key={val}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
              checked
                ? "border-primary/30 bg-secondary text-foreground"
                : "border-transparent hover:bg-accent"
            )}
          >
            <Checkbox checked={checked} onChange={() => toggle(val)} />
            {label}
          </label>
        )
      })}
    </div>
  )
}

export function YesNo({
  value, onChange,
}: {
  value: boolean | null; onChange: (v: boolean | null) => void
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
          value === true
            ? "border-emerald-400 bg-emerald-50 text-emerald-800"
            : "border-input text-muted-foreground hover:bg-accent"
        )}
      >
        ✓ بله
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
          value === false
            ? "border-primary/40 bg-secondary text-foreground"
            : "border-input text-muted-foreground hover:bg-accent"
        )}
      >
        ✕ خیر
      </button>
    </div>
  )
}
