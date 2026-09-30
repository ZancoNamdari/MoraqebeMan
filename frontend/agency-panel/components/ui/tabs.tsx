"use client"

// A small, dependency-free horizontal tab bar. This codebase doesn't have
// @radix-ui/react-tabs installed, so this is a plain controlled component
// (value/onValueChange, like a controlled input) rather than a Radix
// wrapper. Visual weight matches IconRail's active-item styling
// (bg-white text-slate-900 shadow-sm on a muted track).

import { cn } from "@/lib/utils"

export interface TabItem {
  value: string
  label: string
}

export interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  tabs: TabItem[]
  className?: string
}

export function Tabs({ value, onValueChange, tabs, className }: TabsProps) {
  return (
    <div
      dir="rtl"
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
