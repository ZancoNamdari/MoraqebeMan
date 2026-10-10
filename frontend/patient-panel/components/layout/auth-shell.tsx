import { cn } from "@/lib/utils"

/**
 * Shared frame for the sign-in screen: a coloured header with the logo and
 * panel name, and the form on a white card that overlaps its lower edge.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className={cn("rounded-b-[2.5rem] px-6 pb-24 pt-14 text-center shadow-sm", "bg-[#DCEBDD] text-[#1F3A2C]")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" aria-hidden="true" className="mx-auto h-20 w-20 rounded-full shadow-lg ring-4 ring-white/70" />
        <h1 className="mt-4 text-2xl font-extrabold">{title}</h1>
        {subtitle && <p className={cn("mt-1 text-sm", "text-[#4E6B5B]")}>{subtitle}</p>}
      </div>
      <div className="mx-auto -mt-14 w-full max-w-sm px-4 pb-10">
        <div className="rounded-3xl bg-card p-6 shadow-xl">{children}</div>
      </div>
    </div>
  )
}
