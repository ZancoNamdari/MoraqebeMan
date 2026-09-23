"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { ROUTES } from "@/lib/routes"
import type { AgencyAdmin, AgencySupervisor } from "@/types/agency_management"

const emptyForm = { first_name: "", last_name: "", phone_number: "", supervisor_id: "" }

export default function AdminsPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const router = useRouter()

  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [admins, setAdmins] = useState<AgencyAdmin[]>([])
  const [supervisors, setSupervisors] = useState<AgencySupervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    // Creating an admin — and assigning which supervisor they report
    // to — is owner-only per the confirmed requirement, same
    // reasoning as the existing supervisors page.
    if (user.role !== "agency") {
      router.replace(ROUTES.dashboard)
      return
    }
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return Promise.all([
        agencyManagementService.listAdmins(profile.id),
        agencyManagementService.listSupervisors(profile.id),
      ])
    }).then(([adminList, supervisorList]) => {
      setAdmins(adminList)
      setSupervisors(supervisorList)
    }).finally(() => setLoading(false))
  }, [user, router])

  if (authLoading || !user) return null

  async function handleCreate() {
    if (agencyId === null) return
    setSaving(true); setError("")
    try {
      const created = await agencyManagementService.createAdmin(agencyId, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone_number: form.phone_number,
        supervisor_id: Number(form.supervisor_id),
      })
      setAdmins((prev) => [created, ...prev])
      setForm(emptyForm)
      setShowForm(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ثبت ادمین با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">ادمین‌های آژانس</h1>
          <p className="text-xs text-slate-500">هر ادمین مستقیماً زیر نظر یک سوپروایزر مشخص کار می‌کند</p>
        </div>
        {!showForm && supervisors.length > 0 && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> افزودن ادمین
          </Button>
        )}
      </div>

      {supervisors.length === 0 && !loading && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          پیش از افزودن ادمین، ابتدا باید حداقل یک سوپروایزر ثبت کنید — هر ادمین باید زیر نظر یک سوپروایزر باشد.
        </div>
      )}

      {showForm && (
        <Card className="mb-4 border-slate-200">
          <CardContent className="space-y-3 pt-4">
            <p className="text-xs text-muted-foreground">
              رمز عبور توسط خود سیستم ساخته می‌شود — ادمین بعداً با شماره تلفن خودش رمز را بازیابی می‌کند.
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
            <div className="space-y-1.5">
              <Label htmlFor="supervisor_id">سوپروایزر مسئول</Label>
              <select
                id="supervisor_id"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.supervisor_id}
                onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })}
              >
                <option value="">انتخاب کنید...</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={saving || !form.first_name || !form.last_name || !form.phone_number || !form.supervisor_id}
                onClick={handleCreate}
              >
                {saving ? "در حال ثبت..." : "ثبت ادمین"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>انصراف</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : admins.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز هیچ ادمینی ثبت نشده است.</p>
      ) : (
        <div className="space-y-2">
          {admins.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-medium text-slate-900">{a.full_name}</p>
              <p className="text-xs text-slate-500" dir="ltr">{a.phone_number}</p>
              <p className="mt-1 text-[11px] text-slate-500">زیر نظر: {a.supervisor_name}</p>
              {a.created_by_username && (
                <p className="text-[11px] text-slate-400">ثبت‌شده توسط: {a.created_by_username}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
