"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Same outside-click/Escape-to-close behavior as filter-bar.tsx's own
// (unexported) useOutsideClick — duplicated rather than exported from
// there, to keep this a standalone drop-in component.
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

export type DateRangeValue = "today_yesterday" | "last_week" | "last_month" | "all"

const OPTIONS: { value: DateRangeValue; label: string }[] = [
  { value: "today_yesterday", label: "امروز و دیروز" },
  { value: "last_week", label: "هفته‌ی گذشته" },
  { value: "last_month", label: "ماه اخیر" },
  { value: "all", label: "همه" },
]

/**
 * A quick "created_at" range filter — dropdown right next to
 * PinnedOnlyToggle, same visual family as SortDropdown (this module's
 * own filter-bar.tsx) but scoped to just these 4 fixed windows rather
 * than an open-ended sort-option list, per the confirmed requirement.
 * "all" is the default/reset state, so it never renders as "active"
 * styling the way a real filter selection does.
 */
export function DateRangeFilter({ value, onChange }: { value: DateRangeValue; onChange: (v: DateRangeValue) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, () => setOpen(false))
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[OPTIONS.length - 1]
  const isActive = value !== "all"

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
          isActive ? "border-primary-strong/40 bg-primary/10 text-primary-strong" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        )}
      >
        <Calendar className="h-3.5 w-3.5" />
        {current.label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 min-w-[170px] space-y-0.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-right text-xs text-slate-700 hover:bg-slate-50"
            >
              {o.label}
              {value === o.value && <Check className="h-3.5 w-3.5 text-primary-strong" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Applies the selected window to a service's `created_at` — "today
 * and yesterday" is calendar-day based (not a rolling 48h), so a
 * service created at 00:05 yesterday still counts.
 */
export function matchesDateRange(createdAt: string, range: DateRangeValue): boolean {
  if (range === "all") return true
  const created = new Date(createdAt)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (range === "today_yesterday") {
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    return created >= startOfYesterday
  }
  if (range === "last_week") {
    const weekAgo = new Date(startOfToday)
    weekAgo.setDate(weekAgo.getDate() - 7)
    return created >= weekAgo
  }
  // last_month
  const monthAgo = new Date(startOfToday)
  monthAgo.setMonth(monthAgo.getMonth() - 1)
  return created >= monthAgo
}
