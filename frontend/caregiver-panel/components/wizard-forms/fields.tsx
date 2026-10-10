"use client"

import { useRef } from "react"
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
      <Label className="flex items-center gap-1.5 text-base">
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

/**
 * Full keyboard-first navigation for this checkbox grid, requested
 * explicitly: arrow keys move focus between options (respecting the
 * grid's actual row/column layout, not just a flat list — right/left
 * move within a row, up/down jump a full row), Space or Enter toggles
 * the focused option, and only one option is ever a real tab stop at
 * a time (the "roving tabindex" pattern) so Tab moves straight past
 * the whole group to the next field, exactly like a native radio
 * group already does — this is what makes real keyboard use through
 * the whole wizard actually fast rather than tabbing through every
 * single checkbox one at a time.
 */
export function CheckboxGroup({
  choices, value, onChange,
}: {
  choices: Choice[]; value: string[]; onChange: (v: string[]) => void
}) {
  const itemRefs = useRef<(HTMLLabelElement | null)[]>([])
  // Matches the grid's actual CSS (grid-cols-1 on mobile, sm:grid-cols-2
  // above the sm breakpoint) — used only for up/down arrow math below,
  // not for rendering. Getting this wrong wouldn't break anything
  // visually, just make up/down jump the wrong number of items on
  // wider screens, which is why it's called out explicitly here.
  const COLUMNS = 2

  function toggle(val: string) {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val])
  }

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(choices.length - 1, index))
    itemRefs.current[clamped]?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number, val: string) {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault()
        focusIndex(index - 1) // RTL layout — visually-right is the previous DOM item
        break
      case "ArrowLeft":
        e.preventDefault()
        focusIndex(index + 1)
        break
      case "ArrowDown":
        e.preventDefault()
        focusIndex(index + COLUMNS)
        break
      case "ArrowUp":
        e.preventDefault()
        focusIndex(index - COLUMNS)
        break
      case " ":
      case "Enter":
        e.preventDefault()
        toggle(val)
        break
    }
  }

  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2" role="group">
      {choices.map(([val, label], index) => {
        const checked = value.includes(val)
        return (
          <label
            key={val}
            ref={(el) => { itemRefs.current[index] = el }}
            tabIndex={index === 0 ? 0 : -1}
            onKeyDown={(e) => handleKeyDown(e, index, val)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50",
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
          "flex-1 rounded-lg border px-4 py-2.5 text-base font-medium transition-colors",
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
          "flex-1 rounded-lg border px-4 py-2.5 text-base font-medium transition-colors",
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
