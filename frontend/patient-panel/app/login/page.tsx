"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth.service"
import { api } from "@/services/api"
import { ROUTES } from "@/lib/routes"

type Mode = "register" | "login-phone" | "login-code"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>("login-phone")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
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
      setMode("login-code")
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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)
    try {
      const { data } = await api.post("/api/auth/register/", {
        first_name: firstName, last_name: lastName, phone_number: phone, role: "patient",
      })
      window.localStorage.setItem("access_token", data.tokens.access)
      window.localStorage.setItem("refresh_token", data.tokens.refresh)
      router.push(ROUTES.dashboard)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === "string" ? detail : "ثبت‌نام با خطا مواجه شد. اطلاعات را بررسی کنید.")
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
            {mode === "login-phone" && "ورود با شماره موبایل"}
            {mode === "login-code" && "کد ورود را وارد کنید"}
            {mode === "register" && "ثبت‌نام به عنوان بیمار/سالمند"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-800">{message}</div>}
          {error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">{error}</div>}

          {mode === "login-phone" && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">شماره موبایل</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" dir="ltr" required autoFocus />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-l from-primary to-primary text-base font-medium shadow-md shadow-primary/20 hover:from-primary hover:to-primary" size="lg" disabled={loading}>
                {loading ? "در حال ارسال..." : "ارسال کد ورود"}
              </Button>
              <button type="button" onClick={() => { setMode("register"); setError(""); setMessage("") }} className="w-full text-center text-sm text-primary-strong hover:underline">
                حساب ندارید؟ ثبت‌نام کنید
              </button>
            </form>
          )}

          {mode === "login-code" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">کد ۶ رقمی</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" inputMode="numeric" maxLength={6} required autoFocus />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-l from-primary to-primary text-base font-medium shadow-md shadow-primary/20 hover:from-primary hover:to-primary" size="lg" disabled={loading}>
                {loading ? "در حال ورود..." : "ورود"}
              </Button>
              <button type="button" onClick={() => { setMode("login-phone"); setError(""); setMessage("") }} className="w-full text-center text-sm text-primary-strong hover:underline">
                تغییر شماره موبایل
              </button>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fn">نام</Label>
                  <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ln">نام خانوادگی</Label>
                  <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rphone">شماره موبایل</Label>
                <Input id="rphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" dir="ltr" required />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-l from-primary to-primary text-base font-medium shadow-md shadow-primary/20 hover:from-primary hover:to-primary" size="lg" disabled={loading}>
                {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
              </Button>
              <button type="button" onClick={() => { setMode("login-phone"); setError(""); setMessage("") }} className="w-full text-center text-sm text-primary-strong hover:underline">
                قبلاً ثبت‌نام کرده‌اید؟ وارد شوید
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
