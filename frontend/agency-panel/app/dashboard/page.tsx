"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { authService } from "@/services/auth.service"
import { ROUTES } from "@/lib/routes"
import type { AgencyDashboard, AgencyProfile } from "@/types/agency"

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth(["agency", "agency_supervisor"])
  const router = useRouter()

  const [profile, setProfile] = useState<AgencyProfile | null>(null)
  const [dashboard, setDashboard] = useState<AgencyDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [saving, setSaving] = useState(false)

  function refresh() {
    return Promise.all([agencyService.me(), agencyService.dashboard()]).then(([p, d]) => {
      setProfile(p)
      setDashboard(d)
      setCompanyName(p.company_name)
      setLicenseNumber(p.license_number)
    })
  }

  useEffect(() => {
    if (!user) return
    refresh().finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  async function handleSaveProfile() {
    setSaving(true)
    try {
      await agencyService.updateProfile({ company_name: companyName, license_number: licenseNumber })
      await refresh()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">پنل آژانس</h1>
          <Button variant="ghost" size="sm" className="text-rose-600" onClick={logout}>خروج</Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {loading || !profile || !dashboard ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <>
            <Card className="border-pink-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-rose-900">اطلاعات آژانس</CardTitle>
                {!editing && (
                  <Button variant="outline" size="sm" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={() => setEditing(true)}>
                    ویرایش
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {editing ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="company_name">نام شرکت/آژانس</Label>
                      <Input id="company_name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="license_number">شماره مجوز فعالیت</Label>
                      <Input id="license_number" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={saving} onClick={handleSaveProfile}>
                        {saving ? "در حال ذخیره..." : "ذخیره"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>انصراف</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm"><span className="text-muted-foreground">نام شرکت: </span>{profile.company_name || "—"}</p>
                    <p className="text-sm"><span className="text-muted-foreground">شماره مجوز: </span>{profile.license_number || "—"}</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-pink-100 bg-gradient-to-l from-pink-50 to-rose-50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  کد عضویت آژانس — این کد را در اختیار خانواده‌ها و مراقبانی که می‌خواهند به این آژانس بپیوندند قرار دهید
                </p>
                <p dir="ltr" className="text-left text-lg font-bold tracking-wider text-rose-700">{profile.access_code}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => router.push(ROUTES.families)} className="rounded-xl border border-pink-100 bg-white p-4 text-right transition-colors hover:bg-pink-50/60">
                <p className="text-2xl font-bold text-rose-800">{dashboard.approved_family_count}</p>
                <p className="text-xs text-muted-foreground">خانواده عضو</p>
                {dashboard.pending_family_requests > 0 && (
                  <p className="mt-1 text-xs font-medium text-amber-700">{dashboard.pending_family_requests} درخواست در انتظار</p>
                )}
              </button>
              <button onClick={() => router.push(ROUTES.caregivers)} className="rounded-xl border border-pink-100 bg-white p-4 text-right transition-colors hover:bg-pink-50/60">
                <p className="text-2xl font-bold text-rose-800">{dashboard.approved_caregiver_count}</p>
                <p className="text-xs text-muted-foreground">مراقب در استخر</p>
                {dashboard.pending_caregiver_requests > 0 && (
                  <p className="mt-1 text-xs font-medium text-amber-700">{dashboard.pending_caregiver_requests} درخواست در انتظار</p>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => router.push(ROUTES.patients)} className="rounded-xl border border-pink-100 bg-white p-4 text-right transition-colors hover:bg-pink-50/60">
                <p className="text-sm font-medium text-rose-800">سالمندها</p>
                <p className="text-xs text-muted-foreground">افزودن سالمند و یافتن مراقب مناسب</p>
              </button>
              {user.role === "agency" && (
                <button onClick={() => router.push(ROUTES.supervisors)} className="rounded-xl border border-pink-100 bg-white p-4 text-right transition-colors hover:bg-pink-50/60">
                  <p className="text-sm font-medium text-rose-800">سوپروایزرها</p>
                  <p className="text-xs text-muted-foreground">افزودن کارشناس برای ثبت اطلاعات</p>
                </button>
              )}
              <button onClick={() => router.push(ROUTES.complaints)} className="rounded-xl border border-pink-100 bg-white p-4 text-right transition-colors hover:bg-pink-50/60">
                <p className="text-sm font-medium text-rose-800">شکایات</p>
                <p className="text-xs text-muted-foreground">مشاهده شکایات درباره مراقبان شما</p>
              </button>
              <button onClick={() => router.push(ROUTES.blacklistAppeals)} className="rounded-xl border border-pink-100 bg-white p-4 text-right transition-colors hover:bg-pink-50/60">
                <p className="text-sm font-medium text-rose-800">درخواست‌های بازبینی مسدودیت</p>
                <p className="text-xs text-muted-foreground">بررسی درخواست رفع مسدودیت مراقبان شما</p>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
