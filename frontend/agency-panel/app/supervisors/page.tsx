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
import { agencyManagementService } from "@/services/agency_management.service"
import { ROUTES } from "@/lib/routes"
import type { AgencySupervisor } from "@/types/agency_management"

export default function SupervisorsPage() {
  const { user, loading: authLoading } = useAuth()
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
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">سوپروایزرهای آژانس</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <Card className="border-pink-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-rose-900">فهرست سوپروایزرها</CardTitle>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>افزودن سوپروایزر</Button>
            )}
          </CardHeader>
          {showForm && (
            <CardContent className="space-y-3 border-t border-pink-100 pt-4">
              <p className="text-xs text-muted-foreground">
                رمز عبور توسط خود سیستم ساخته می‌شود — سوپروایزر بعداً با شماره تلفن خودش رمز را بازیابی می‌کند.
              </p>
              {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}
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
              <div key={s.id} className="rounded-lg border border-pink-100 bg-pink-50/40 p-3">
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
  )
}
