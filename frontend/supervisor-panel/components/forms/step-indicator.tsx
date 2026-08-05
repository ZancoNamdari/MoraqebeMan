"use client"

import { cn } from "@/lib/utils"

/**
 * Numbered step dots with a colored gradient fill for completed steps
 * — makes "which step am I on, how many are left" readable at a
 * glance, which matters more here than usual since each step in this
 * wizard is a genuinely long form.
 */
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => (
        <div key={i} className="flex flex-1 items-center gap-1">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm transition-all",
              i < current && "bg-gradient-to-br from-indigo-500 to-violet-600 text-white",
              i === current && "bg-gradient-to-br from-indigo-500 to-violet-600 text-white ring-4 ring-indigo-200 scale-110",
              i > current && "bg-muted text-muted-foreground"
            )}
            title={label}
          >
            {i < current ? "✓" : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < current ? "bg-gradient-to-l from-indigo-500 to-violet-500" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
