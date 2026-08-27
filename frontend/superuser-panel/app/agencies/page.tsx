"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { platformAgencyService } from "@/services/platform_agency.service"
import { ROUTES } from "@/lib/routes"
import type { PlatformAgencyListItem } from "@/types/platform_agency"

const emptyForm = { company_name: "", license_number: "", first_name: "", last_name: "", phone_number: "" }

export default function AgenciesPage() {
  const { user, loading: authLoading, logout } = useAuth(["superuser"])
  const router = useRouter()

  const [agencies, setAgencies] = useState<PlatformAgencyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successNote, setSuccessNote] = useState<{ company: string; accessCode: string; phone: string } | null>(null)

  function refresh() {
    return platformAgencyService.list().then(setAgencies)
  }

  useEffect(() => {
    if (!user) return
    refresh().finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  async function handleCreate() {
    setSaving(true); setError(""); setSuccessNote(null)
    try {
      const created = await platformAgencyService.create(form)
      setSuccessNote({ company: created.company_name, accessCode: created.access_code, phone: form.phone_number })
      setForm(emptyForm)
      setShowForm(false)
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ایجاد آژانس با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = form.company_name && form.first_name && form.last_name && form.phone_number

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">مدیریت آژانس‌ها</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>کاربران</Button>
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.analytics)}>تحلیل پلتفرم</Button>
            <Button variant="ghost" size="sm" className="text-rose-600" onClick={logout}>خروج</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {successNote && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <p>آژانس «{successNote.company}» ساخته شد.</p>
            <p className="mt-1">
              کد عضویت: <span dir="ltr" className="font-mono">{successNote.accessCode}</span> —
              این کد و شماره <span dir="ltr">{successNote.phone}</span> را در اختیار آژانس بگذارید تا با
              بازیابی رمز عبور وارد شود.
            </p>
          </div>
        )}

        <Card className="border-pink-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-rose-900">فهرست آژانس‌ها ({agencies.length})</CardTitle>
            {!showForm && <Button size="sm" onClick={() => setShowForm(true)}>ایجاد آژانس جدید</Button>}
          </CardHeader>

          {showForm && (
            <CardContent className="space-y-3 border-t border-pink-100 pt-4">
              <p className="text-xs text-muted-foreground">
                رمز عبور توسط خود سیستم ساخته می‌شود — آژانس بعداً با شماره تلفن خودش رمز را بازیابی می‌کند.
              </p>
              {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}

              <div className="space-y-1.5">
                <Label htmlFor="company_name">نام شرکت/آژانس</Label>
                <Input id="company_name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="license_number">شماره مجوز فعالیت (اختیاری)</Label>
                <Input id="license_number" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
              </div>

              <div className="rounded-lg border border-pink-100 bg-pink-50/40 p-3">
                <p className="mb-2 text-xs font-medium text-rose-800">اطلاعات تماس مالک حساب آژانس</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name">نام</Label>
                    <Input id="first_name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name">نام خانوادگی</Label>
                    <Input id="last_name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="phone_number">شماره موبایل</Label>
                  <Input id="phone_number" dir="ltr" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" disabled={saving || !canSubmit} onClick={handleCreate}>
                  {saving ? "در حال ایجاد..." : "ایجاد آژانس"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>انصراف</Button>
              </div>
            </CardContent>
          )}
        </Card>

        {loading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : agencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز هیچ آژانسی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {agencies.map((a) => (
              <div key={a.id} className="rounded-lg border border-pink-100 bg-pink-50/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{a.company_name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{a.access_code}</p>
                </div>
                <p className="text-xs text-muted-foreground" dir="ltr">{a.owner_phone_number}</p>
                {a.license_number && <p className="text-[11px] text-muted-foreground">مجوز: {a.license_number}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
