"use client"

import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

const ROLE_TITLE: Record<string, string> = {
  agency: "مدیر آژانس",
  agency_supervisor: "سوپروایزر",
  agency_admin: "ادمین",
}

/**
 * Dark top bar, modeled on the reference CRM's header — agency name
 * on the right (RTL start), a role-based title on the left instead
 * of the raw username (e.g. "مدیر آژانس" rather than a login
 * username string, which isn't meaningful to look at on every page).
 *
 * `hasSubSidebar` shifts this bar's margin the same way MainLayout
 * shifts <main>'s, so the two always stay aligned regardless of
 * whether tier 2 (SubSidebar) is currently showing.
 */
export function TopBar({ role, hasSubSidebar }: { role?: string; hasSubSidebar: boolean }) {
  const title = role ? ROLE_TITLE[role] ?? role : ""

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between bg-slate-900 px-5 transition-[margin]",
        hasSubSidebar ? "lg:mr-[18rem]" : "lg:mr-16"
      )}
    >
      <div className="flex items-center gap-2.5">
        <Building2 className="h-5 w-5 text-primary" />
        <span className="text-sm font-bold text-white">مراقب من — پنل آژانس</span>
      </div>

      {title && (
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span>{title}</span>
        </div>
      )}
    </header>
  )
}
