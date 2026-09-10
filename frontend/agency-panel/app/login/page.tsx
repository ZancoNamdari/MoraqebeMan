"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth.service"
import { ROUTES } from "@/lib/routes"
import { extractErrorMessage } from "@/lib/errors"

type Mode = "login" | "forgot-request" | "forgot-confirm"

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [resetPhone, setResetPhone] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [error, setError] = useState(
    searchParams.get("error") === "wrong_role" ? "این حساب دسترسی به این پنل را ندارد." : ""
  )
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await authService.login(username, password)
      router.push(ROUTES.dashboard)
    } catch (err: any) {
      setError(extractErrorMessage(err, "نام کاربری یا رمز عبور اشتباه است."))
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setMessage(""); setLoading(true)
    try {
      await authService.requestPasswordReset(resetPhone)
      setMode("forgot-confirm")
      setMessage("کد بازیابی برای شماره شما پیامک شد. کد را همراه رمز عبور جدید وارد کنید.")
    } catch (err: any) {
      setError(extractErrorMessage(err, "درخواست با خطا مواجه شد. دوباره تلاش کنید."))
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setMessage(""); setLoading(true)
    try {
      await authService.confirmPasswordReset(resetPhone, resetToken, newPassword)
      setMode("login")
      setUsername(resetPhone)
      setPassword("")
      setResetToken(""); setNewPassword("")
      setMessage("رمز عبور با موفقیت تغییر کرد. اکنون وارد شوید.")
    } catch (err: any) {
      setError(extractErrorMessage(err, "کد نادرست یا منقضی شده است."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-pink via-brand-pink to-brand-mint-strong p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <Card className="relative w-full max-w-sm border-0 shadow-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-pink to-brand-mint-strong text-2xl shadow-lg shadow-brand-pink/30">
            🏢
          </div>
          <CardTitle className="text-xl">ورود آژانس</CardTitle>
          <CardDescription>
            {mode === "login" && "مدیریت خانواده‌ها و مراقبان زیرمجموعه — مراقب من"}
            {mode === "forgot-request" && "بازیابی رمز عبور"}
            {mode === "forgot-confirm" && "تعیین رمز عبور جدید"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-800">{message}</div>}
          {error && <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">{error}</div>}

          {mode === "login" && (
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-l from-brand-pink to-brand-mint-strong text-base font-medium shadow-md shadow-brand-pink/30 hover:from-brand-pink-strong hover:to-brand-mint-strong"
                size="lg"
                disabled={loading}
              >
                {loading ? "در حال ورود..." : "ورود"}
              </Button>
              <button
                type="button"
                onClick={() => { setMode("forgot-request"); setError(""); setMessage("") }}
                className="w-full text-center text-sm text-muted-foreground hover:underline"
              >
                رمز عبور خود را فراموش کرده‌اید؟
              </button>
            </form>
          )}

          {mode === "forgot-request" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-phone">شماره موبایل ثبت‌شده</Label>
                <Input
                  id="reset-phone"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  placeholder="09xxxxxxxxx"
                  dir="ltr"
                  required
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-l from-brand-pink to-brand-mint-strong text-base font-medium shadow-md shadow-brand-pink/30 hover:from-brand-pink-strong hover:to-brand-mint-strong"
                size="lg"
                disabled={loading}
              >
                {loading ? "در حال ارسال..." : "ارسال کد بازیابی"}
              </Button>
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setMessage("") }}
                className="w-full text-center text-sm text-muted-foreground hover:underline"
              >
                بازگشت به ورود
              </button>
            </form>
          )}

          {mode === "forgot-confirm" && (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-token">کد بازیابی</Label>
                {/* Not a 6-digit OTP — this is a real 32-character
                    alphanumeric token sent as plain SMS text, so a
                    regular text field (not numeric-only) with a
                    monospace font for easier reading/pasting. */}
                <Input
                  id="reset-token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  dir="ltr"
                  className="font-mono text-sm"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">رمز عبور جدید</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showNewPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">حداقل ۸ کاراکتر</p>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-l from-brand-pink to-brand-mint-strong text-base font-medium shadow-md shadow-brand-pink/30 hover:from-brand-pink-strong hover:to-brand-mint-strong"
                size="lg"
                disabled={loading}
              >
                {loading ? "در حال ثبت..." : "تغییر رمز عبور"}
              </Button>
              <button
                type="button"
                onClick={() => { setMode("forgot-request"); setError(""); setMessage("") }}
                className="w-full text-center text-sm text-muted-foreground hover:underline"
              >
                کد جدید درخواست کنید
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
