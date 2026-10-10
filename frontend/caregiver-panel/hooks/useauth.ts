"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/services/auth.service"
import type { User } from "@/types/user"
import { ROUTES } from "@/lib/routes"

/**
 * allowedRoles — the real fix here. Before this, every panel's login
 * only checked "is there a valid JWT", never "does this account's
 * role actually belong on this panel". A JWT is valid regardless of
 * role, so any authenticated account — supervisor, caregiver,
 * whoever — could "log in" successfully to any panel and see its
 * dashboard shell, only getting blocked later (inconsistently, and
 * often only partially) when a specific API call happened to check
 * role server-side. This is why an AGENCY_SUPERVISOR account could
 * apparently "log into admin-panel" — the frontend never asked
 * whether it should be allowed to.
 *
 * Each panel now passes its own allowed role(s) into useAuth(), e.g.:
 *   useAuth(["admin", "superuser"])   // admin-panel, supervisor-panel
 *   useAuth(["agency", "agency_supervisor"])  // agency-panel
 *   useAuth(["superuser"])            // superuser-panel
 *   useAuth(["family"])               // family-panel
 * A mismatch logs the account out immediately (not just blocks one
 * screen) and redirects to login with an explanatory query param,
 * rather than silently rendering a dashboard shell for a role that
 * was never supposed to see it.
 */
export function useAuth(allowedRoles?: string[]) {
  // اگر قبلاً (در همین نشست) کاربر را گرفته‌ایم، صفحه همان لحظه رندر می‌شود —
  // بدون صفحه‌ی خالی و بدون رفت‌وبرگشت اضافه؛ فقط در پس‌زمینه تازه می‌شود.
  const cached = typeof window !== "undefined" ? authService.peekMe() : null
  const [user, setUser] = useState<User | null>(cached?.user ?? null)
  const [loading, setLoading] = useState(!cached)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    if (!authService.isLoggedIn()) {
      authService.clearMeCache()
      setLoading(false)
      router.replace(ROUTES.login)
      return
    }

    const reject = () => {
      authService.logout()
      router.replace(`${ROUTES.login}?error=wrong_role`)
    }

    const peek = authService.peekMe()
    if (peek) {
      if (allowedRoles && !allowedRoles.includes(peek.user.role)) return reject()
      setUser(peek.user)
      setLoading(false)
      if (peek.fresh) return
    }

    authService
      .meCached()
      .then((fetchedUser) => {
        if (cancelled) return
        if (allowedRoles && !allowedRoles.includes(fetchedUser.role)) return reject()
        setUser(fetchedUser)
      })
      .catch(() => {
        if (cancelled) return
        authService.logout()
        router.replace(ROUTES.login)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [router])

  const logout = () => {
    authService.logout()
    router.replace(ROUTES.login)
  }

  return { user, loading, logout }
}
