import { cn } from "@/lib/utils"

/**
 * The hexagon brand mark — shared visual signature across the whole
 * platform (landing page, every panel). See /docs/DESIGN_SYSTEM.md.
 */
export function HexMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 46"
      className={className}
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M20 1 38 12v22L20 45 2 34V12Z" />
    </svg>
  )
}

/**
 * The platform logo in a circle — same mark as the other panels.
 */
export function BrandLogo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.jpg" alt="" aria-hidden="true" className={cn("rounded-full", className)} />
}

/**
 * The one consistent app-shell header used across every top-level page.
 * Soft rose gradient with dark plum text (white text on this pink fails
 * contrast at small sizes). Pass `subtitle` for a small line above the
 * title (e.g. a greeting), `children` for actions, and `tall` on a page
 * that overlaps a summary card onto the header (then use `-mt-10` on it).
 */
export function AppHeader({
  title,
  subtitle,
  maxWidth = "max-w-3xl",
  sticky = true,
  tall = false,
  children,
  subheader,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  maxWidth?: string
  sticky?: boolean
  tall?: boolean
  children?: React.ReactNode
  subheader?: React.ReactNode
}) {
  return (
    <header
      className={cn(
        "rounded-b-[1.75rem] bg-gradient-to-br from-[#F2A0A0] to-[#E98A8A] text-[#3B2A2C] shadow-sm",
        sticky && !tall && "sticky top-0 z-10"
      )}
    >
      <div className={cn("mx-auto px-4 pt-5", tall ? "pb-14" : "pb-4", maxWidth)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo className="h-11 w-11 shrink-0 ring-2 ring-white/70" />
            <div className="min-w-0">
              {subtitle && <p className="truncate text-sm text-[#6B3F43]">{subtitle}</p>}
              <h1 className="truncate text-lg font-extrabold">{title}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">{children}</div>
        </div>
        {subheader && <div className="mt-3">{subheader}</div>}
      </div>
    </header>
  )
}
