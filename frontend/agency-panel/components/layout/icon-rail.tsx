"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  HeartPulse,
  Users,
  GitMerge,
  BarChart3,
  Wallet,
  UserCog,
  Settings,
  AlertTriangle,
  ClipboardList,
  ShieldQuestionMark,
  HeartHandshake,
  ShieldCheck,
  Activity,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/routes"

export type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  ownerOnly?: boolean
  children?: { label: string; href: string; icon: React.ElementType }[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: "داشبورد", href: ROUTES.dashboard, icon: LayoutDashboard },
  {
    label: "خدمت‌گیرنده",
    href: ROUTES.patients,
    icon: HeartPulse,
    children: [
      { label: "خانواده‌ها", href: ROUTES.families, icon: HeartHandshake },
    ],
  },
  {
    label: "خدمت‌دهنده",
    href: ROUTES.caregivers,
    icon: Users,
    children: [
      { label: "ارزیابی عملکرد", href: ROUTES.caregiverPerformance, icon: BarChart3 },
      { label: "فعالیت", href: ROUTES.caregiverActivity, icon: Activity },
      { label: "تنظیمات", href: ROUTES.caregiverSettings, icon: Settings },
      { label: "شکایات", href: ROUTES.complaints, icon: AlertTriangle },
      { label: "بانک اطلاعات مراقبان", href: ROUTES.candidates, icon: ClipboardList },
      { label: "درخواست‌های بازبینی مسدودیت", href: ROUTES.blacklistAppeals, icon: ShieldQuestionMark },
    ],
  },
  { label: "فرآیند تطبیق", href: ROUTES.matching, icon: GitMerge },
  { label: "تحلیل", href: ROUTES.analytics, icon: BarChart3 },
  { label: "مالی", href: ROUTES.financial, icon: Wallet },
  {
    label: "کارمندان",
    href: ROUTES.supervisors,
    icon: UserCog,
    ownerOnly: true,
    children: [
      { label: "ادمین‌ها", href: ROUTES.admins, icon: ShieldCheck },
    ],
  },
  { label: "تنظیمات", href: ROUTES.settings, icon: Settings },
]

/**
 * Tier 1 only — just the narrow icon rail. Whether tier 2 (the
 * secondary panel) shows is now determined by MainLayout comparing
 * the current route against NAV_ITEMS, not by hover state here, so
 * the tier-2 panel is a persistent part of the page while inside
 * that section — exactly like the reference (a full navigation
 * panel, not a hover flyout that disappears when you move the
 * mouse away).
 */
export function IconRail({ isOwner, onLogout, username }: { isOwner: boolean; onLogout: () => void; username: string }) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner)
  const initial = username?.charAt(0).toUpperCase() || "?"

  function isActive(item: NavItem) {
    if (pathname === item.href) return true
    if (item.href !== ROUTES.caregivers && pathname.startsWith(`${item.href}/`)) return true
    return !!item.children?.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-40 hidden w-16 flex-col items-center bg-slate-900 py-4 lg:flex">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <span className="text-lg font-bold">م</span>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item)

          return (
            <div key={item.label} className="group relative">
              <Link
                href={item.href}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>

              <span
                className="
                  pointer-events-none absolute right-full top-1/2 z-50 mr-2 -translate-y-1/2
                  whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white
                  opacity-0 shadow-lg transition-opacity
                  group-hover:opacity-100
                "
              >
                {item.label}
              </span>
            </div>
          )
        })}
      </nav>

      {/* Profile circle, above logout — first-letter avatar until a
          real profile-picture upload feature exists. */}
      <div className="group relative mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
          {initial}
        </div>
        <span
          className="
            pointer-events-none absolute right-full top-1/2 z-50 mr-2 -translate-y-1/2
            whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white
            opacity-0 shadow-lg transition-opacity
            group-hover:opacity-100
          "
        >
          {username}
        </span>
      </div>

      <div className="group relative">
        <button
          onClick={onLogout}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
        </button>
        <span
          className="
            pointer-events-none absolute right-full top-1/2 z-50 mr-2 -translate-y-1/2
            whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white
            opacity-0 shadow-lg transition-opacity
            group-hover:opacity-100
          "
        >
          خروج
        </span>
      </div>
    </aside>
  )
}
