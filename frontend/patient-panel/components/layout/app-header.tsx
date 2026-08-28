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
 * The one consistent app-shell header used across every top-level page in
 * every panel — replaces the ad-hoc per-page <header> blocks that used to
 * duplicate slightly different markup (and, in a couple of places, emoji
 * logos) per page. Pass the panel's title (plain text, or JSX for cases
 * like an avatar + name) and put page-specific actions (nav links, logout
 * button, user greeting) in `children`. `subheader` renders a second row
 * still inside the sticky bordered header — e.g. a tab strip.
 */
export function AppHeader({
  title,
  maxWidth = "max-w-3xl",
  sticky = true,
  children,
  subheader,
}: {
  title: React.ReactNode
  maxWidth?: string
  sticky?: boolean
  children?: React.ReactNode
  subheader?: React.ReactNode
}) {
  return (
    <header
      className={cn(
        "border-b border-border bg-background/80 backdrop-blur",
        sticky && "sticky top-0 z-10"
      )}
    >
      <div className={cn("mx-auto px-4 py-4", maxWidth)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <HexMark className="h-6 w-6 shrink-0 text-primary-strong" />
            <h1 className="truncate text-base font-bold text-foreground">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">{children}</div>
        </div>
        {subheader && <div className="mt-3">{subheader}</div>}
      </div>
    </header>
  )
}
