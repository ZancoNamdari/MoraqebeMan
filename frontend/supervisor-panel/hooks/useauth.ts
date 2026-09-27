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
 *   useAuth(["admin", "superuser"])   // admin-panel
 *   useAuth(["agency", "agency_supervisor"])  // agency-panel
 *   useAuth(["superuser"])            // superuser-panel
 *   useAuth(["family"])               // family-panel
 * supervisor-panel is now ["admin", "superuser", "agency_supervisor"]
 * on its caregiver-wizard/dashboard/review pages (not every page —
 * e.g. matching-weight config stayed admin/superuser-only): an
 * agency's own supervisor progresses that agency's own caregivers'
 * registration here, already scoped server-side
 * (_caregiver_visible_to_actor in apps.caregivers.supervisor_views),
 * deep-linked to from a button on that caregiver's card in
 * agency-panel.
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
    // Preserve where the person was headed (e.g. a caregiver-wizard
    // deep link from agency-panel with its own ?id=...) so login can
    // send them back there instead of always to the dashboard. Read
    // straight from window.location (not next/navigation's
    // useSearchParams) so this shared hook doesn't force every page
    // that calls it to add its own Suspense boundary.
    const next = `${window.location.pathname}${window.location.search}`
    const loginWithNext = next && next !== ROUTES.dashboard
      ? `${ROUTES.login}?next=${encodeURIComponent(next)}`
      : ROUTES.login

    if (!authService.isLoggedIn()) {
      setLoading(false)
      router.replace(loginWithNext)
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
        router.replace(loginWithNext)
      })
      .finally(() => setLoading(false))
  }, [router])

  const logout = () => {
    authService.logout()
    router.replace(ROUTES.login)
  }

  return { user, loading, logout }
}
