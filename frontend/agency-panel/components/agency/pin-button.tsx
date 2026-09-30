"use client"

import { Pin } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Toggle button for usePinned's per-item bookmark. Cards in this app
 * only start a drag from their own grip handle (GripVertical, with
 * dnd-kit's {...attributes}/{...listeners} spread ONLY on that
 * button) rather than the whole card, so this button needs no
 * stopPropagation/pointerDown guarding against accidentally starting
 * a drag — a plain onClick is enough.
 */
export function PinButton({ pinned, onToggle, className }: { pinned: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={pinned ? "برداشتن پین" : "پین کردن"}
      className={cn(
        "shrink-0 rounded p-1 transition-colors",
        pinned ? "text-amber-500 hover:text-amber-600" : "text-slate-300 hover:bg-slate-100 hover:text-slate-500",
        className
      )}
    >
      <Pin className={cn("h-4 w-4", pinned && "fill-current")} />
    </button>
  )
}
