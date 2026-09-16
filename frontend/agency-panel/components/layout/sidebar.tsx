"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  HeartHandshake,
  Users,
  UserCog,
  AlertTriangle,
  ShieldQuestionMark,
  ClipboardList,
  Building2,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/routes"

/**
 * Persistent RTL sidebar for agency-panel — professional blue/slate
 * palette, matching the platform-wide shift away from the consumer-
 * facing pastel pink theme, since this panel is sold directly to
 * agency owners evaluating it as a paid business tool.
 *
 * `onLogout` and `isOwner` are passed in from the page rendering
 * this, rather than this component calling useAuth itself — the
 * page already calls useAuth for its own guard, so calling it again
 * here would duplicate that check and its underlying API call.
 */
export function Sidebar({ onLogout, isOwner }: { onLogout: () => void; isOwner: boolean }) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { href: ROUTES.dashboard, label: "داشبورد", icon: LayoutDashboard },
    { href: ROUTES.families, label: "خانواده‌ها", icon: HeartHandshake },
    { href: ROUTES.caregivers, label: "مراقبان", icon: Users },
    { href: ROUTES.patients, label: "سالمندها", icon: HeartHandshake },
    ...(isOwner ? [{ href: ROUTES.supervisors, label: "سوپروایزرها", icon: UserCog }] : []),
    { href: ROUTES.candidates, label: "بانک اطلاعات مراقبان", icon: ClipboardList },
    { href: ROUTES.complaints, label: "شکایات", icon: AlertTriangle },
    { href: ROUTES.blacklistAppeals, label: "درخواست‌های بازبینی", icon: ShieldQuestionMark },
  ]

  return (
    <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 flex-col border-l border-slate-200 bg-white sm:flex">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <Building2 className="h-5 w-5" />
        </span>
        <span className="text-sm font-bold text-slate-900">پنل آژانس — مراقب من</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === ROUTES.dashboard
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          خروج
        </button>
      </div>
    </aside>
  )
}
