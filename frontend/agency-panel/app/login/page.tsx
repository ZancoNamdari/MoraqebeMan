"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth.service"
import { ROUTES } from "@/lib/routes"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(
    searchParams.get("error") === "wrong_role" ? "این حساب دسترسی به این پنل را ندارد." : ""
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await authService.login(username, password)
      router.push(ROUTES.dashboard)
    } catch {
      setError("نام کاربری یا رمز عبور اشتباه است.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/80 to-primary p-4">
      {/* Soft decorative blobs — purely visual, no content */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />

      <Card className="relative w-full max-w-sm border-0 shadow-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary shadow-lg shadow-primary/30">
            <svg viewBox="0 0 40 46" className="h-7 w-7 text-primary-foreground" fill="currentColor" aria-hidden="true">
              <path d="M20 1 38 12v22L20 45 2 34V12Z" />
            </svg>
          </div>
          <CardTitle className="text-xl">ورود آژانس</CardTitle>
          <CardDescription>مدیریت خانواده‌ها و مراقبان زیرمجموعه — مراقب من</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">نام کاربری یا شماره موبایل</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-l from-primary to-primary text-base font-medium shadow-md shadow-primary/30 hover:from-primary hover:to-primary"
              size="lg"
              disabled={loading}
            >
              {loading ? "در حال ورود..." : "ورود"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
