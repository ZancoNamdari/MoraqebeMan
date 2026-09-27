"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUpDown, Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Filter/search building blocks shared by the three Kanban list
 * pages (خدمت‌گیرنده، خدمت‌دهنده، خدمات مقطعی) — modeled after the
 * "click a filter title, a dropdown of its options opens" pattern
 * of ordinary e-commerce/listing sites, rather than one big
 * collapsible panel of pills. Each filterable field gets its own
 * small dropdown button sitting inline in a row; a separate
 * SortDropdown covers ordering. Every dropdown closes on an outside
 * click or Escape.
 */
function useOutsideClick(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handler()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [ref, handler])
}

/** Icon-only search — expands into a focused input on click, per the
 * "search should just be an icon" request; closes back down on
 * blur-with-empty-value, its own X button, or Escape. */
export function SearchTrigger({ search, onSearchChange, placeholder }: {
  search: string
  onSearchChange: (v: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(!!search)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="جست‌وجو"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
          search ? "border-primary-strong/40 bg-primary/10 text-primary-strong" : "border-slate-200 text-slate-600 hover:bg-slate-50"
        )}
      >
        <Search className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === "Escape") { onSearchChange(""); setOpen(false) } }}
        className="h-9 w-40 pr-9 sm:w-56"
      />
      <button
        onClick={() => { onSearchChange(""); setOpen(false) }}
        title="بستن جست‌وجو"
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/** A single button, meant to sit right beside the page's "افزودن..."
 * button, that shows/hides the FilterRow of per-field dropdowns below.
 * Highlighted whenever a filter is active, even while the row itself
 * is collapsed, so the state is visible without opening it. */
export function FilterToggleButton({ open, onClick, active }: {
  open: boolean
  onClick: () => void
  active: boolean
}) {
  return (
    <button
      onClick={onClick}
      title="فیلتر"
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
        active ? "border-primary-strong/40 bg-primary/10 text-primary-strong" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      <SlidersHorizontal className="h-4 w-4" />
      فیلتر
      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
    </button>
  )
}

/** One filter category, shown as a clickable title that drops its
 * option list down below it — e.g. "جنسیت ▾" opens مرد/زن. */
export function FilterDropdown({ label, active, onClear, children }: {
  label: string
  active: boolean
  onClear?: () => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          active ? "border-primary-strong/40 bg-primary/10 text-primary-strong" : "border-slate-200 text-slate-600 hover:bg-slate-50"
        )}
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 min-w-[190px] max-w-[260px] space-y-0.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          {children}
          {active && onClear && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={onClear}
                className="w-full rounded-md px-2 py-1.5 text-right text-[11px] text-muted-foreground hover:bg-slate-50"
              >
                پاک کردن
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** One row inside a FilterDropdown's panel — a checkbox-style option
 * (works for both a single boolean toggle and a multi-select list). */
export function DropdownOption({ selected, onClick, children }: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-right text-xs text-slate-700 hover:bg-slate-50"
    >
      <span className="truncate">{children}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary-strong" />}
    </button>
  )
}

export interface SortOption {
  value: string
  label: string
}

/** Dedicated dropdown for ordering — separate from the filter
 * dropdowns since only one value can be picked at a time and it
 * never has an "active count", just a current choice. */
export function SortDropdown({ value, options, onChange }: {
  value: string
  options: SortOption[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))
  const current = options.find((o) => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          value ? "border-primary-strong/40 bg-primary/10 text-primary-strong" : "border-slate-200 text-slate-600 hover:bg-slate-50"
        )}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {current ? current.label : "مرتب‌سازی"}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 min-w-[190px] space-y-0.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(value === o.value ? "" : o.value); setOpen(false) }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-right text-xs text-slate-700 hover:bg-slate-50"
            >
              {o.label}
              {value === o.value && <Check className="h-3.5 w-3.5 text-primary-strong" />}
            </button>
          ))}
          {value && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => { onChange(""); setOpen(false) }}
                className="w-full rounded-md px-2 py-1.5 text-right text-[11px] text-muted-foreground hover:bg-slate-50"
              >
                غیرفعال کردن مرتب‌سازی
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** The always-visible row that holds every FilterDropdown, plus a
 * global "clear all" and the "X از Y مورد" counter once anything
 * narrows the list. Sorting lives in its own SortSection below this
 * row, kept visually separate from filtering. */
export function FilterRow({ children, hasActive, onClearAll, resultCount, totalCount }: {
  children: React.ReactNode
  hasActive: boolean
  onClearAll: () => void
  resultCount: number
  totalCount: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {hasActive && (
        <button onClick={onClearAll} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
          <X className="h-3.5 w-3.5" /> پاک کردن همه
        </button>
      )}
      {resultCount !== totalCount && (
        <span className="text-xs text-muted-foreground">{resultCount} از {totalCount} مورد</span>
      )}
    </div>
  )
}

/** A distinct section for ordering, kept apart from the filter row
 * (its own line, with a light top divider) rather than mixed in
 * among the filter dropdowns. */
export function SortSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
      <span className="text-xs font-medium text-slate-500">مرتب‌سازی:</span>
      {children}
    </div>
  )
}
