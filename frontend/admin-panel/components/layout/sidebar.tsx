"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  MessageSquareWarning,
  StickyNote,
  History,
  ShieldAlert,
  Newspaper,
  BarChart3,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/routes"
import { HexMark } from "./app-header"

const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: "بررسی مراقبان", icon: LayoutDashboard },
  { href: ROUTES.analytics, label: "آمار و ترافیک", icon: BarChart3 },
  { href: ROUTES.complaints, label: "شکایات", icon: MessageSquareWarning },
  { href: ROUTES.patientNotes, label: "یادداشت‌ها", icon: StickyNote },
  { href: ROUTES.auditLogs, label: "تاریخچه", icon: History },
  { href: ROUTES.blacklistAppeals, label: "درخواست‌های بازبینی", icon: ShieldAlert },
  { href: ROUTES.articles, label: "مقالات و اخبار", icon: Newspaper },
] as const

/**
 * Persistent RTL sidebar for admin-panel — replaces the repeated,
 * slightly-drifted inline header nav buttons that used to be
 * copy-pasted into every page (dashboard, complaints, patient-notes,
 * etc.), each with its own subset of links. Visually inspired by
 * gentelella's sidebar layout, but built as real React/Tailwind
 * components matching the rest of the platform's stack — not the
 * template's own Bootstrap/jQuery code.
 *
 * `onLogout` is passed in from the page rendering this, rather than
 * this component calling useAuth itself — every page already calls
 * useAuth for its own auth guard, so calling it again here would
 * duplicate that check and its underlying API call for no reason.
 */
export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 flex-col border-l border-border bg-card sm:flex">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-5">
        <HexMark className="h-7 w-7 shrink-0 text-primary-strong" />
        <span className="text-sm font-bold text-foreground">پنل ادمین — مراقب من</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
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
                  ? "bg-primary/15 text-primary-strong"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          خروج
        </button>
      </div>
    </aside>
  )
}
