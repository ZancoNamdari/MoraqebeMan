"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { ROUTES } from "@/lib/routes"
import type { AgencySupervisor } from "@/types/agency_management"
import { Sidebar } from "@/components/layout/sidebar"

export default function SupervisorsPage() {
  const { user, loading: authLoading, logout } = useAuth(["agency", "agency_supervisor"])
  const router = useRouter()

  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [supervisors, setSupervisors] = useState<AgencySupervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ first_name: "", last_name: "", phone_number: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    // Creating a supervisor is owner-only (confirmed requirement — a
    // supervisor can't create a peer supervisor), so this whole page
    // is owner-only too, not just the create action within it.
    if (user.role !== "agency") {
      router.replace(ROUTES.dashboard)
      return
    }
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return agencyManagementService.listSupervisors(profile.id)
    }).then(setSupervisors).finally(() => setLoading(false))
  }, [user, router])

  if (authLoading || !user) return null

  async function handleCreate() {
    if (agencyId === null) return
    setSaving(true); setError("")
    try {
      const created = await agencyManagementService.createSupervisor(agencyId, form)
      setSupervisors((prev) => [created, ...prev])
      setForm({ first_name: "", last_name: "", phone_number: "" })
      setShowForm(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ثبت سوپروایزر با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background pb-10">
      <AppHeader title="سوپروایزرهای آژانس" maxWidth="max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
      </AppHeader>

      <div className="min-h-screen bg-slate-50">
      <Sidebar onLogout={logout} isOwner={user.role === "agency"} />

      <div className="sm:mr-64">
        <main className="mx-auto max-w-2xl space-y-4 p-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">فهرست سوپروایزرها</CardTitle>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>افزودن سوپروایزر</Button>
            )}
          </CardHeader>
          {showForm && (
            <CardContent className="space-y-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                رمز عبور توسط خود سیستم ساخته می‌شود — سوپروایزر بعداً با شماره تلفن خودش رمز را بازیابی می‌کند.
              </p>
              {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
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
              <div className="space-y-1.5">
                <Label htmlFor="phone_number">شماره موبایل</Label>
                <Input id="phone_number" dir="ltr" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={saving || !form.first_name || !form.last_name || !form.phone_number}
                  onClick={handleCreate}
                >
                  {saving ? "در حال ثبت..." : "ثبت سوپروایزر"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>انصراف</Button>
              </div>
            </CardContent>
          )}
        </Card>

        {loading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : supervisors.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز هیچ سوپروایزری ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {supervisors.map((s) => (
              <div key={s.id} className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-sm font-medium">{s.full_name}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{s.phone_number}</p>
                {s.created_by_username && (
                  <p className="mt-1 text-[11px] text-muted-foreground">ثبت‌شده توسط: {s.created_by_username}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      </div>
    </div>
    </div>
  )
}
