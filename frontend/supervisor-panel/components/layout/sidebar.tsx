"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/routes"

const items = [
  { label: "داشبورد", href: ROUTES.dashboard },
  { label: "پروفایل من", href: ROUTES.profile },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="
        fixed inset-y-0 right-0 z-40
        hidden w-64
        border-l border-border
        bg-background
        lg:flex lg:flex-col
      "
    >
      <div className="border-b border-border px-5 py-5">
        <div className="text-lg font-bold text-primary-strong">
          مراقب من
        </div>

        <div className="mt-1 text-xs text-muted-foreground">
          پنل ناظر
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-primary-strong"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

