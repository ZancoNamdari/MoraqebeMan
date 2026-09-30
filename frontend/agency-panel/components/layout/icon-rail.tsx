"use client"

import Image from "next/image"
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
  Receipt,
  LogOut,
  UserPlus,
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

// Each domain-specific dashboard (caregivers/patients/staff/financial)
// now lives as the first child inside its OWN section below, instead
// of being clustered together under one generic top-level "داشبورد"
// group — per the confirmed requirement that every dashboard should
// live where its data lives. Only ROUTES.dashboard itself (the
// agency's own cross-domain landing page — company profile, access
// code, etc.) stays a flat top-level item, since it isn't specific to
// any one section.
export const NAV_ITEMS: NavItem[] = [
  { label: "داشبورد", href: ROUTES.dashboard, icon: LayoutDashboard },
  {
    label: "خدمت‌گیرنده",
    href: ROUTES.patients,
    icon: HeartPulse,
    children: [
      { label: "داشبورد خدمت‌گیرنده‌ها", href: ROUTES.dashboardPatients, icon: LayoutDashboard },
      // Deep-links into the patients list page with ?add=1, which
      // shows ONLY the add-patient form (no columns) — see that
      // page's isAddOnly. Submitting continues straight into the new
      // patient's wizard at patients/[id]/register. Same pattern as
      // خدمت‌دهنده's own "افزودن خدمت‌دهنده" shortcut right below.
      { label: "افزودن خدمت‌گیرنده", href: `${ROUTES.patients}?add=1`, icon: UserPlus },
      { label: "خانواده‌ها", href: ROUTES.families, icon: HeartHandshake },
      { label: "خدمات مقطعی", href: ROUTES.episodicServices, icon: Receipt },
      { label: "بانک اطلاعات خدمت‌گیرندگان", href: ROUTES.patientsBank, icon: ClipboardList },
    ],
  },
  {
    label: "خدمت‌دهنده",
    href: ROUTES.caregivers,
    icon: Users,
    children: [
      { label: "داشبورد خدمت‌دهنده‌ها", href: ROUTES.dashboardCaregivers, icon: LayoutDashboard },
      // Deep-links into the caregivers list page with ?add=1, which
      // shows ONLY the add-caregiver form (no cards/columns) — see
      // that page's isAddOnly. Submitting continues straight into
      // the new caregiver's wizard at caregivers/[id]/register.
      { label: "افزودن خدمت‌دهنده", href: `${ROUTES.caregivers}?add=1`, icon: UserPlus },
      { label: "ارزیابی عملکرد", href: ROUTES.caregiverPerformance, icon: BarChart3 },
      { label: "فعالیت", href: ROUTES.caregiverActivity, icon: Activity },
      { label: "تنظیمات", href: ROUTES.caregiverSettings, icon: Settings },
      { label: "شکایات", href: ROUTES.complaints, icon: AlertTriangle },
      { label: "بانک اطلاعات خدمت‌دهندگان", href: ROUTES.candidates, icon: ClipboardList },
      { label: "درخواست‌های بازبینی مسدودیت", href: ROUTES.blacklistAppeals, icon: ShieldQuestionMark },
    ],
  },
  { label: "فرآیند تطبیق", href: ROUTES.matching, icon: GitMerge },
  // "تحلیل" (AgencyAnalyticsView) hidden from the nav for now — feature
  // stays in the codebase (route + page + backend endpoint untouched),
  // just re-add this line whenever it's ready to ship.
  // { label: "تحلیل", href: ROUTES.analytics, icon: BarChart3 },
  {
    label: "مالی",
    href: ROUTES.financial,
    icon: Wallet,
    children: [
      { label: "داشبورد مالی", href: ROUTES.dashboardFinancial, icon: LayoutDashboard },
    ],
  },
  {
    label: "کارمندان",
    href: ROUTES.employees,
    icon: UserCog,
    ownerOnly: true,
    children: [
      { label: "داشبورد پرسنل", href: ROUTES.dashboardStaff, icon: LayoutDashboard },
      { label: "سوپروایزرها", href: ROUTES.supervisors, icon: UserCog },
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
      {/* The actual مراقب من logo — the dark circular badge artwork the
          user supplied, in public/logo.jpg. It already carries its
          own circular dark background, so this wrapper is just a
          rounded-full crop/frame, no extra bg color — replaces the
          ad-hoc "م" placeholder letter that used to sit here. */}
      <div className="mb-4 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
        <Image src="/logo.jpg" alt="مراقب من" width={40} height={40} className="h-full w-full object-cover" priority />
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
