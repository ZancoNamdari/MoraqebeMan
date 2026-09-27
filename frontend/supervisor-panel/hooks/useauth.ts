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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!authService.isLoggedIn()) {
      setLoading(false)
      router.replace(ROUTES.login)
      return
    }
    authService
      .me()
      .then((fetchedUser) => {
        if (allowedRoles && !allowedRoles.includes(fetchedUser.role)) {
          authService.logout()
          router.replace(`${ROUTES.login}?error=wrong_role`)
          return
        }
        setUser(fetchedUser)
      })
      .catch(() => {
        authService.logout()
        router.replace(ROUTES.login)
      })
      .finally(() => setLoading(false))
  }, [router])

  const logout = () => {
    authService.logout()
    router.replace(ROUTES.login)
  }

  return { user, loading, logout }
}
