"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/services/auth.service"
import type { User } from "@/types/user"
import { ROUTES } from "@/lib/routes"

export function useAuth() {
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
      .then(setUser)
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
