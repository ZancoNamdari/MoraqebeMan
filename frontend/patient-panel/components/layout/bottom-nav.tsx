"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, Home, User, UsersRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/routes"

const TABS = [
  { href: ROUTES.dashboard, label: "خانه", Icon: Home },
  { href: ROUTES.care, label: "تیم مراقبت", Icon: UsersRound },
  { href: ROUTES.access, label: "خانواده", Icon: Heart },
  { href: ROUTES.profile, label: "پروفایل", Icon: User },
]

/**
 * Bottom tab bar for phones (hidden from md up). Big icons and labels
 * for older users. Pages that show it add `pb-28`.
 */
export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white px-2 pb-3 pt-2 md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs transition-colors",
                  active ? "bg-accent font-bold text-primary-strong" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
