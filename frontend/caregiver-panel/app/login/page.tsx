"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth.service"
import { ROUTES } from "@/lib/routes"

type Mode = "phone" | "code"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>("phone")

  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")

  const [error, setError] = useState(
    searchParams.get("error") === "wrong_role" ? "این حساب دسترسی به این پنل را ندارد." : ""
  )
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setMessage(""); setLoading(true)
    try {
      await authService.requestOtpLogin(phone)
      setMode("code")
      setMessage("کد ورود برای شماره شما پیامک شد.")
    } catch {
      setError("درخواست با خطا مواجه شد. دوباره تلاش کنید.")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)
    try {
      await authService.verifyOtpLogin(phone, code)
      router.push(ROUTES.dashboard)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "کد نادرست است.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-secondary via-background to-accent/30 p-4">
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-accent/40 blur-3xl" />

      <Card className="relative w-full max-w-sm border-0 shadow-xl shadow-primary/15">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-primary shadow-lg shadow-primary/20">
            <svg viewBox="0 0 40 46" className="h-7 w-7 text-primary-foreground" fill="currentColor" aria-hidden="true">
              <path d="M20 1 38 12v22L20 45 2 34V12Z" />
            </svg>
          </div>
          <CardTitle className="text-xl">مراقب من</CardTitle>
          <CardDescription>
            {mode === "phone" && "ورود با شماره موبایل"}
            {mode === "code" && "کد ورود را وارد کنید"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-800">{message}</div>}
          {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">{error}</div>}

          {mode === "phone" && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">شماره موبایل</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" dir="ltr" required autoFocus />
                <p className="text-xs text-muted-foreground">همان شماره‌ای که ناظر پلتفرم برای حساب شما ثبت کرده است.</p>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-l from-primary to-primary text-base font-medium shadow-md shadow-primary/20 hover:from-primary hover:to-primary" size="lg" disabled={loading}>
                {loading ? "در حال ارسال..." : "ارسال کد ورود"}
              </Button>
            </form>
          )}

          {mode === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">کد ۶ رقمی</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" inputMode="numeric" maxLength={6} required autoFocus />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-l from-primary to-primary text-base font-medium shadow-md shadow-primary/20 hover:from-primary hover:to-primary" size="lg" disabled={loading}>
                {loading ? "در حال ورود..." : "ورود"}
              </Button>
              <button type="button" onClick={() => { setMode("phone"); setError(""); setMessage("") }} className="w-full text-center text-sm text-primary-strong hover:underline">
                تغییر شماره موبایل
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
