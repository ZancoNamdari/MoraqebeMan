"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/services/auth.service"
import { ROUTES } from "@/lib/routes"

export default function RootPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace(authService.isLoggedIn() ? ROUTES.dashboard : ROUTES.login)
  }, [router])
  return null
}
