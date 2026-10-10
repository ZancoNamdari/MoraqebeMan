"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageSquareWarning, UserPlus, UsersRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/routes"

const TABS = [
  { href: ROUTES.dashboard, label: "خانه", Icon: Home },
  { href: ROUTES.caregivers, label: "مراقبان", Icon: UsersRound },
  { href: ROUTES.complaints, label: "شکایات", Icon: MessageSquareWarning },
  { href: ROUTES.newPatient, label: "افزودن", Icon: UserPlus },
]

/**
 * Floating bottom tab bar for phones (hidden from md up, where the page
 * itself carries the navigation). Pages that show it add `pb-28`.
 */
export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed inset-x-3 bottom-3 z-20 mx-auto max-w-md rounded-[1.75rem] border border-border bg-white p-2 shadow-[0_8px_24px_rgba(138,59,59,0.16)] md:hidden"
    >
      <ul className="grid grid-cols-4 gap-1">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs transition-colors",
                  active ? "bg-accent font-semibold text-primary-strong" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
