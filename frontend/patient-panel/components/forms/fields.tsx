"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { Choice } from "@/lib/constants"

export function Field({
  label, required, error, children,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5 rounded-lg", error && "ring-1 ring-rose-400/60 bg-rose-50/60 p-2.5")}>
      <Label className="flex items-center gap-1.5">
        <span className={cn(required && "font-bold text-rose-950")}>{label}</span>
        {" "}
        {required && (
          <span className="mr-1.5 rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
            الزامی
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
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

const OTHER_SENTINEL = "__other__"

/**
 * A select with a built-in "سایر" (other) option — choosing it reveals
 * a text box for whatever isn't in the predefined list, instead of
 * either forcing free typing for everyone or forcing everyone into a
 * fixed list with no way to say something else. Tick a choice; only
 * type if you actually need to.
 *
 * Stores the chosen option's own text directly (not an internal code)
 * since the fields this is used for — language/dialect, etc. — are
 * free-text on the backend already; no separate "other" flag needed
 * in the stored value itself, just in this component's own state.
 */
export function SelectWithOther({
  choices, value, onChange, placeholder = "انتخاب کنید...", otherPlaceholder = "توضیح دهید...",
}: {
  choices: Choice[]; value: string; onChange: (v: string) => void; placeholder?: string; otherPlaceholder?: string
}) {
  const isKnownChoice = choices.some(([, label]) => label === value)
  const [showOther, setShowOther] = useState(!isKnownChoice && value !== "")

  function handleSelectChange(selected: string) {
    if (selected === OTHER_SENTINEL) {
      setShowOther(true)
      onChange("")
    } else {
      setShowOther(false)
      onChange(selected)
    }
  }

  return (
    <div className="space-y-2">
      <Select value={showOther ? OTHER_SENTINEL : value} onChange={(e) => handleSelectChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {choices.map(([, label]) => (
          <option key={label} value={label}>{label}</option>
        ))}
        <option value={OTHER_SENTINEL}>سایر</option>
      </Select>
      {showOther && (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={otherPlaceholder} autoFocus />
      )}
    </div>
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
                ? "border-pink-300 bg-pink-50 text-rose-900"
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
            ? "border-rose-400 bg-rose-50 text-rose-800"
            : "border-input text-muted-foreground hover:bg-accent"
        )}
      >
        ✕ خیر
      </button>
    </div>
  )
}
