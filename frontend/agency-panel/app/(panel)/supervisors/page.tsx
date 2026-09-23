"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { ROUTES } from "@/lib/routes"
import type { AgencySupervisor } from "@/types/agency_management"

export default function SupervisorsPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
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
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">سوپروایزرهای آژانس</h1>
          <p className="text-xs text-slate-500">فهرست سوپروایزرها ({supervisors.length})</p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> افزودن سوپروایزر
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-4 border-slate-200">
          <CardContent className="space-y-3 pt-4">
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
        </Card>
      )}

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : supervisors.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز هیچ سوپروایزری ثبت نشده است.</p>
      ) : (
        <div className="space-y-2">
          {supervisors.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-medium text-slate-900">{s.full_name}</p>
              <p className="text-xs text-slate-500" dir="ltr">{s.phone_number}</p>
              {s.created_by_username && (
                <p className="mt-1 text-[11px] text-slate-400">ثبت‌شده توسط: {s.created_by_username}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
