// Reusable KPI number tile, consolidating the pattern duplicated across
// StatCard (app/(panel)/dashboard/page.tsx), StatTile
// (app/(panel)/analytics/page.tsx), and the caregivers page header count.
// Kept visually identical to those: rounded-xl bordered card, icon in a
// soft colored circle, big bold number, small muted label below.

import { cn } from "@/lib/utils"

export interface KpiTileProps {
  label: string
  value: string | number
  icon: React.ElementType
  /** Hex color used to tint the icon's background circle + icon color. */
  accentColor?: string
  /** Small secondary text/number shown under the value, e.g. "۱۲ در انتظار". */
  badge?: string
  onClick?: () => void
  className?: string
}

const DEFAULT_ACCENT = "#2a78d6"

export function KpiTile({
  label,
  value,
  icon: Icon,
  accentColor = DEFAULT_ACCENT,
  badge,
  onClick,
  className,
}: KpiTileProps) {
  const content = (
    <>
      <span
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
      {badge && (
        <span className="mt-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          {badge}
        </span>
      )}
    </>
  )

  const baseClassName = cn(
    "flex flex-col items-start gap-0 rounded-xl border border-slate-200 bg-white p-4 text-right",
    className
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          baseClassName,
          "shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        )}
      >
        {content}
      </button>
    )
  }

  return <div className={baseClassName}>{content}</div>
}
