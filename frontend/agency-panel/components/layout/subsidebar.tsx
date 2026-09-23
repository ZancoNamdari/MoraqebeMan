"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_ITEMS, type NavItem } from "./icon-rail"
import { ROUTES } from "@/lib/routes"

/**
 * Tier 2 — a persistent secondary panel, shown whenever the current
 * route belongs to a NAV_ITEMS entry that has children, exactly
 * matching the reference: a real, standing part of the layout while
 * inside that section (e.g. "خدمت‌دهنده"), not a hover-triggered
 * flyout that vanishes when the mouse moves away. Returns null for
 * any section with no children (dashboard, تحلیل, مالی, etc.),
 * which is what lets MainLayout decide whether to reserve space for
 * it at all.
 */
export function findActiveParent(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => {
    if (!item.children?.length) return false
    if (pathname === item.href) return true
    if (item.href !== ROUTES.caregivers && pathname.startsWith(`${item.href}/`)) return true
    return item.children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))
  })
}

export function SubSidebar() {
  const pathname = usePathname()
  const activeParent = findActiveParent(pathname)

  if (!activeParent) return null

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const ParentIcon = activeParent.icon

  return (
    <aside className="fixed inset-y-0 z-30 hidden w-56 flex-col bg-slate-900/95 py-4 lg:flex" style={{ right: "4rem" }}>
      <p className="px-4 pb-3 text-sm font-bold text-white">{activeParent.label}</p>

      <nav className="flex-1 space-y-1 px-2">
        <Link
          href={activeParent.href}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
            isActive(activeParent.href) && !activeParent.children!.some((c) => isActive(c.href))
              ? "bg-white text-slate-900"
              : "text-slate-300 hover:bg-slate-800"
          )}
        >
          <ParentIcon className="h-4 w-4 shrink-0" />
          نمای کلی
        </Link>

        {activeParent.children!.map((child) => {
          const ChildIcon = child.icon
          return (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(child.href) ? "bg-white text-slate-900" : "text-slate-300 hover:bg-slate-800"
              )}
            >
              <ChildIcon className="h-4 w-4 shrink-0" />
              {child.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
