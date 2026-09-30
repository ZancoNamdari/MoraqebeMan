"use client"

import { Pin } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * "فقط پین‌شده‌ها" filter toggle, shared by the caregivers/patients
 * kanban pages and the candidates ("بانک اطلاعات") page. Just the pin
 * filter — unlike an earlier version of this component, there's no
 * Kanban/List view switcher here: the standalone "بانک اطلاعات" pages
 * (candidates for caregivers, patients-bank for patients) are the
 * list view now, so a redundant inline list toggle on the kanban
 * pages was removed per the confirmed requirement.
 */
export function PinnedOnlyToggle({
  pinnedOnly, onChange, pinnedCount,
}: {
  pinnedOnly: boolean
  onChange: (v: boolean) => void
  pinnedCount: number
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!pinnedOnly)}
      disabled={pinnedCount === 0 && !pinnedOnly}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        pinnedOnly
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      )}
    >
      <Pin className={cn("h-3.5 w-3.5", pinnedOnly && "fill-current")} />
      فقط پین‌شده‌ها{pinnedCount > 0 && ` (${pinnedCount})`}
    </button>
  )
}
