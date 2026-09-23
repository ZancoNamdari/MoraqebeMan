"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { IconRail } from "./icon-rail"
import { SubSidebar, findActiveParent } from "./subsidebar"
import { TopBar } from "./topbar"
import { cn } from "@/lib/utils"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const pathname = usePathname()
  const hasSubSidebar = !!findActiveParent(pathname)

  if (loading || !user) return null

  return (
    <div dir="rtl" className="h-screen overflow-hidden bg-slate-50">
      <IconRail isOwner={user.role === "agency"} onLogout={logout} username={user.username} />
      <SubSidebar />
      <TopBar role={user.role} hasSubSidebar={hasSubSidebar} />

      {/* Margin shifts from mr-16 to mr-[280px] (16 rail + 56 sub-
          panel, in rem: 4rem + 14rem) whenever the current route
          sits inside a section that has its own sub-navigation —
          computed here from the same route-matching logic SubSidebar
          itself uses, so the two never disagree about whether tier 2
          is actually showing. */}
      <main
        className={cn(
          "h-screen overflow-y-auto pt-14 transition-[margin]",
          hasSubSidebar ? "lg:mr-[18rem]" : "lg:mr-16"
        )}
      >
        {children}
      </main>
    </div>
  )
}
