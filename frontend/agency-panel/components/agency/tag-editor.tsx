"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Per-tag color, keyed by the exact tag text — the service-category
// tags each get their own distinct color per the confirmed
// requirement, so they're visually distinguishable at a glance on a
// card. Anything not listed here (free-text tags, the process-
// milestone labels) falls back to the default blue.
const TAG_COLORS: Record<string, string> = {
  "پرستار": "bg-blue-50 text-blue-700",
  "پرستار متخصص": "bg-indigo-50 text-indigo-700",
  "کمک پرستار": "bg-sky-50 text-sky-700",
  "بهیار": "bg-cyan-50 text-cyan-700",
  "پرستار کودک": "bg-pink-50 text-pink-700",
  "بیبی‌سیتر": "bg-rose-50 text-rose-700",
  "بیبی پرستار": "bg-fuchsia-50 text-fuchsia-700",
  "مادریار": "bg-purple-50 text-purple-700",
  "سالمندیار": "bg-amber-50 text-amber-700",
  "نظافتچی": "bg-emerald-50 text-emerald-700",
}
const DEFAULT_TAG_COLOR = "bg-blue-50 text-blue-700"

function tagColorClass(tag: string) {
  return TAG_COLORS[tag] || DEFAULT_TAG_COLOR
}

/**
 * Free-text tag editor for a single card. `suggestions`, when
 * provided, renders as quick-add chips above the input (used for the
 * caregiver service categories — پرستار, بهیار, etc. — so entering
 * one of them doesn't require retyping every time); typing and
 * hitting Enter or the + button adds any arbitrary tag too, since
 * tags are meant to be free-form per the confirmed requirement, not
 * limited to a fixed list.
 */
export function TagEditor({ tags, suggestions, onAdd, onRemove }: {
  tags: string[]
  suggestions?: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}) {
  const [draft, setDraft] = useState("")
  const [open, setOpen] = useState(false)

  function submit() {
    const value = draft.trim()
    if (value && !tags.includes(value)) onAdd(value)
    setDraft("")
  }

  const availableSuggestions = (suggestions || []).filter((s) => !tags.includes(s))

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {tags.map((tag) => (
          <span key={tag} className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", tagColorClass(tag))}>
            #{tag}
            <button onClick={() => onRemove(tag)} className="opacity-60 hover:opacity-100">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-0.5 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[10px] font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600"
        >
          <Plus className="h-2.5 w-2.5" /> برچسب
        </button>
      </div>

      {open && (
        <div className="mt-1.5 rounded-md border border-slate-200 bg-white p-2">
          {availableSuggestions.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {availableSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => onAdd(s)}
                  className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium opacity-80 hover:opacity-100", tagColorClass(s))}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); submit() }
              }}
              placeholder="برچسب دلخواه..."
              className={cn(
                "h-7 flex-1 rounded border border-slate-200 px-2 text-[11px] outline-none focus:border-primary"
              )}
            />
            <button
              onClick={submit}
              className="rounded bg-primary px-2 text-[11px] font-medium text-primary-foreground"
            >
              افزودن
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
