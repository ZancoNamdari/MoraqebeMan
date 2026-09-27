"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  HeartHandshake,
  Settings2,
  UserCircle,
  LogOut,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/routes"
import { useAuth } from "@/hooks/useauth"

const items = [
  { label: "داشبورد", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "مراقبان", href: ROUTES.caregivers, icon: Users },
  { label: "صف بررسی", href: ROUTES.review, icon: ClipboardCheck },
  { label: "تطبیق", href: ROUTES.match, icon: HeartHandshake },
  { label: "وزن‌های تطبیق", href: ROUTES.matchWeights, icon: Settings2 },
  { label: "پروفایل من", href: ROUTES.profile, icon: UserCircle },
]

/**
 * Icon-based sidebar, matching the visual pattern already established
 * in agency-panel and admin-panel — structural consistency across
 * panels, independent of any single panel's color theme. Calls
 * useAuth itself (rather than accepting onLogout as a prop) since
 * this is a layout-level component rendered once per route-group
 * navigation, not remounted per page — unlike the page-level
 * components in agency/admin-panel where a duplicate useAuth call
 * per page would have been wasteful.
 */
export function Sidebar() {
  const pathname = usePathname()
  const { logout } = useAuth(["admin", "superuser"])

  return (
    <aside
      className="
        fixed inset-y-0 right-0 z-40
        hidden w-64 flex-col
        border-l border-border
        bg-background
        lg:flex
      "
    >
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary-strong">
          <Shield className="h-5 w-5" />
        </span>
        <div>
          <div className="text-sm font-bold text-primary-strong">مراقب من</div>
          <div className="text-xs text-muted-foreground">پنل ناظر</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon
          // "/caregivers" would otherwise also match as a startsWith
          // prefix for "/caregivers/new" and "/caregivers/review" —
          // those have their own separate nav entries, so the plain
          // caregivers-list link needs an exact match, not a prefix
          // match, to avoid staying highlighted on unrelated pages.
          const active =
            pathname === item.href ||
            (item.href !== ROUTES.caregivers && pathname.startsWith(`${item.href}/`))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-primary-strong"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          خروج
        </button>
      </div>
    </aside>
  )
}
