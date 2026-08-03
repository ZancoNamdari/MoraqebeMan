"use client"

import { cn } from "@/lib/utils"

/**
 * Numbered step dots instead of a plain progress bar — makes "which
 * step am I on, how many are left" immediately readable at a glance,
 * which matters more here than usual since each step in this wizard
 * is a genuinely long form.
 */
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => (
        <div key={i} className="flex flex-1 items-center gap-1">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
              i < current && "bg-primary text-primary-foreground",
              i === current && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2",
              i > current && "bg-muted text-muted-foreground"
            )}
            title={label}
          >
            {i < current ? "✓" : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={cn("h-0.5 flex-1 rounded transition-colors", i < current ? "bg-primary" : "bg-muted")} />
          )}
        </div>
      ))}
    </div>
  )
}
