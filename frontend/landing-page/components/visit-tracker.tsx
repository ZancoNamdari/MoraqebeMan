"use client"

import { useEffect } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Fires once per page load to record a visit for the admin-panel
 * analytics dashboard. Deliberately fire-and-forget: failures are
 * swallowed silently since a broken analytics beacon should never
 * be visible to a real visitor or block anything on the page.
 */
export function VisitTracker() {
  useEffect(() => {
    if (!API_URL) return
    fetch(`${API_URL}/api/analytics/pageview/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer || "",
      }),
    }).catch(() => {
      // Silently ignored — see docstring above.
    })
  }, [])

  return null
}
