"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth.service"
import { ROUTES } from "@/lib/routes"
import { extractErrorMessage } from "@/lib/errors"

type Mode = "phone" | "code"

// Matches backend/apps/authentication/models.py's PhoneOTP.VALID_MINUTES
// exactly — confirmed directly rather than guessed, since a countdown
// showing the wrong duration would be actively misleading.
const OTP_VALID_SECONDS = 5 * 60

export default function LoginPage() {
  // useSearchParams() requires a Suspense boundary for Next.js to
  // statically prerender this page during a production build — a
  // real build failure caught during deployment, not a style choice.
  // The fallback below is what briefly shows during that prerender
  // step; the actual form renders the instant client JS takes over.
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50" />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
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
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (mode !== "code" || secondsLeft <= 0) return
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [mode, secondsLeft])

  function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setMessage(""); setLoading(true)
    try {
      await authService.requestOtpLogin(phone)
      setMode("code")
      setSecondsLeft(OTP_VALID_SECONDS)
      setMessage("کد ورود برای شماره شما پیامک شد.")
    } catch (err: any) {
      setError(extractErrorMessage(err, "درخواست با خطا مواجه شد. دوباره تلاش کنید."))
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
      setError(extractErrorMessage(err, "کد نادرست است."))
    } finally {
      setLoading(false)
    }
  }

  async function handleResendCode() {
    setError(""); setMessage(""); setLoading(true)
    try {
      await authService.requestOtpLogin(phone)
      setSecondsLeft(OTP_VALID_SECONDS)
      setMessage("کد جدید برای شماره شما پیامک شد.")
    } catch (err: any) {
      setError(extractErrorMessage(err, "درخواست با خطا مواجه شد. دوباره تلاش کنید."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 p-4">
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-pink-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />

      <Card className="relative w-full max-w-sm border-0 shadow-xl shadow-pink-200/50">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-300 to-rose-400 text-2xl shadow-lg shadow-pink-300/40">
            👩‍⚕️
          </div>
          <CardTitle className="text-xl">مراقب من</CardTitle>
          <CardDescription>
            {mode === "phone" && "ورود با شماره موبایل"}
            {mode === "code" && "کد ورود را وارد کنید"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-800">{message}</div>}
          {error && <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">{error}</div>}

          {mode === "phone" && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">شماره موبایل</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" dir="ltr" required autoFocus />
                <p className="text-xs text-muted-foreground">همان شماره‌ای که ناظر پلتفرم برای حساب شما ثبت کرده است.</p>
              </div>
              <Button type="submit" className="w-full bg-gradient-to-l from-pink-400 to-rose-400 text-base font-medium shadow-md shadow-pink-300/40 hover:from-pink-500 hover:to-rose-500" size="lg" disabled={loading}>
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

              {secondsLeft > 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  اعتبار کد تا <span dir="ltr" className="font-medium tabular-nums">{formatTime(secondsLeft)}</span> دیگر
                </p>
              ) : (
                <p className="text-center text-sm text-rose-600">کد منقضی شده — یک کد جدید درخواست کنید.</p>
              )}

              <Button type="submit" className="w-full bg-gradient-to-l from-pink-400 to-rose-400 text-base font-medium shadow-md shadow-pink-300/40 hover:from-pink-500 hover:to-rose-500" size="lg" disabled={loading || secondsLeft <= 0}>
                {loading ? "در حال ورود..." : "ورود"}
              </Button>

              {secondsLeft <= 0 && (
                <Button type="button" variant="outline" className="w-full" onClick={handleResendCode} disabled={loading}>
                  ارسال دوباره کد
                </Button>
              )}

              <button type="button" onClick={() => { setMode("phone"); setError(""); setMessage(""); setSecondsLeft(0) }} className="w-full text-center text-sm text-rose-600 hover:underline">
                تغییر شماره موبایل
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
