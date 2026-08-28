"use client"

import { cn } from "@/lib/utils"

/**
 * Numbered step dots with a colored gradient fill for completed
 * steps. Clickable when `canNavigate` is true — once the caregiver's
 * account exists (either just created, or already existed and is
 * being edited), every step's data can be reached directly instead of
 * forcing linear next/next/next, which matters most when correcting
 * something specific in an existing caregiver rather than filling in
 * a blank one from scratch.
 */
export function StepIndicator({
  steps, current, onNavigate, canNavigate,
}: {
  steps: string[]; current: number; onNavigate?: (i: number) => void; canNavigate?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => {
        const clickable = canNavigate && onNavigate && i !== current
        return (
          <div key={i} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onNavigate(i)}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm transition-all",
                i < current && "bg-gradient-to-br from-primary to-primary text-white",
                i === current && "bg-gradient-to-br from-primary to-primary text-white ring-4 ring-primary/60 scale-110",
                i > current && "bg-muted text-muted-foreground",
                clickable && "cursor-pointer hover:ring-2 hover:ring-primary",
                !clickable && "cursor-default"
              )}
              title={label}
            >
              {i < current ? "✓" : i + 1}
            </button>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < current ? "bg-gradient-to-l from-primary to-primary/80" : "bg-muted"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
