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

/** Platform logo in a circle — same mark as the other panels. */
export function BrandLogo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.jpg" alt="" aria-hidden="true" className={cn("rounded-full", className)} />
}

/**
 * The one consistent app-shell header: soft sage green with dark green
 * text. `subtitle` is a small line above the title (greeting/date),
 * `children` hold the page actions.
 */
export function AppHeader({
  title,
  subtitle,
  maxWidth = "max-w-3xl",
  sticky = true,
  children,
  subheader,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  maxWidth?: string
  sticky?: boolean
  children?: React.ReactNode
  subheader?: React.ReactNode
}) {
  return (
    <header
      className={cn(
        "rounded-b-[1.75rem] bg-[#DCEBDD] text-[#1F3A2E] shadow-sm",
        sticky && "sticky top-0 z-10"
      )}
    >
      <div className={cn("mx-auto px-4 pb-4 pt-5", maxWidth)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo className="h-11 w-11 shrink-0 ring-2 ring-white/80" />
            <div className="min-w-0">
              {subtitle && <p className="truncate text-sm text-[#3F6350]">{subtitle}</p>}
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
