"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/auth.service"
import { api } from "@/services/api"
import { ROUTES } from "@/lib/routes"

type Mode = "login" | "forgot" | "confirm"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("login")

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const [phone, setPhone] = useState("")
  const [token, setToken] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)
    try {
      await authService.login(username, password)
      router.push(ROUTES.dashboard)
    } catch {
      setError("نام کاربری یا رمز عبور اشتباه است.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setMessage(""); setLoading(true)
    try {
      const { data } = await api.post("/api/auth/password-reset/", { phone_number: phone })
      setMessage(data.detail || "در صورت معتبر بودن شماره، کد بازیابی ارسال شد.")
      setMode("confirm")
    } catch {
      setError("درخواست با خطا مواجه شد.")
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setMessage(""); setLoading(true)
    try {
      await api.post("/api/auth/password-reset/confirm/", { phone_number: phone, token, new_password: newPassword })
      setMessage("رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.")
      setMode("login")
    } catch (err: any) {
      setError(err?.response?.data?.detail || "کد بازیابی نامعتبر یا منقضی شده است.")
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
            {mode === "login" && "ورود به پنل مراقب"}
            {mode === "forgot" && "بازیابی رمز عبور"}
            {mode === "confirm" && "تعیین رمز عبور جدید"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-sm text-emerald-800">{message}</div>}
          {error && <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">{error}</div>}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">نام کاربری</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus dir="ltr" />
                <p className="text-xs text-muted-foreground">نام کاربری شما توسط ناظر پلتفرم به شما اعلام شده است.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">رمز عبور</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-l from-pink-400 to-rose-400 text-base font-medium shadow-md shadow-pink-300/40 hover:from-pink-500 hover:to-rose-500" size="lg" disabled={loading}>
                {loading ? "در حال ورود..." : "ورود"}
              </Button>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage("") }} className="w-full text-center text-sm text-rose-600 hover:underline">
                اولین بار است وارد می‌شوید یا رمز خود را فراموش کرده‌اید؟
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">شماره موبایل ثبت‌شده</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxxx" dir="ltr" required autoFocus />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-l from-pink-400 to-rose-400 shadow-md shadow-pink-300/40 hover:from-pink-500 hover:to-rose-500" size="lg" disabled={loading}>
                {loading ? "در حال ارسال..." : "ارسال کد بازیابی"}
              </Button>
              <button type="button" onClick={() => { setMode("login"); setError(""); setMessage("") }} className="w-full text-center text-sm text-rose-600 hover:underline">
                بازگشت به ورود
              </button>
            </form>
          )}

          {mode === "confirm" && (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">کد بازیابی (پیامک‌شده)</Label>
                <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} dir="ltr" required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newpw">رمز عبور جدید (حداقل ۸ کاراکتر)</Label>
                <Input id="newpw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-l from-pink-400 to-rose-400 shadow-md shadow-pink-300/40 hover:from-pink-500 hover:to-rose-500" size="lg" disabled={loading}>
                {loading ? "در حال ثبت..." : "تغییر رمز عبور"}
              </Button>
              <button type="button" onClick={() => { setMode("login"); setError(""); setMessage("") }} className="w-full text-center text-sm text-rose-600 hover:underline">
                بازگشت به ورود
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
