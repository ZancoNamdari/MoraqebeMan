import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

const COLOR_CLASSES = {
  primary: "bg-primary/15 text-primary-strong",
  amber: "bg-amber-100 text-amber-800",
  emerald: "bg-emerald-100 text-emerald-800",
  rose: "bg-rose-100 text-rose-800",
} as const

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "primary",
}: {
  label: string
  value: number | string
  icon: LucideIcon
  color?: keyof typeof COLOR_CLASSES
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", COLOR_CLASSES[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
