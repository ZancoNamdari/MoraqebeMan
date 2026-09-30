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
import { Field, ChoiceSelect } from "@/components/wizard-forms/fields"
import { LocationPicker, type LocationValue } from "@/components/wizard-forms/location-picker"
import { JalaliDatePicker } from "@/components/wizard-forms/jalali-date-picker"
import { GENDER, EDUCATION_LEVEL, labelForValue } from "@/lib/wizard-constants"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { ROUTES } from "@/lib/routes"
import type { AgencySupervisor } from "@/types/agency_management"

const emptyLocation: LocationValue = { province: null, city: null, district: null }

export default function SupervisorsPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const router = useRouter()

  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [supervisors, setSupervisors] = useState<AgencySupervisor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ first_name: "", last_name: "", phone_number: "", position: "", gender: "", education_level: "", birth_date: "" })
  const [location, setLocation] = useState<LocationValue>(emptyLocation)
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
      const created = await agencyManagementService.createSupervisor(agencyId, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone_number: form.phone_number,
        position: form.position,
        gender: form.gender || undefined,
        birth_date: form.birth_date || undefined,
        city_id: location.city ?? undefined,
        education_level: form.education_level || undefined,
      })
      setSupervisors((prev) => [created, ...prev])
      setForm({ first_name: "", last_name: "", phone_number: "", position: "", gender: "", education_level: "", birth_date: "" })
      setLocation(emptyLocation)
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
            <div className="space-y-1.5">
              <Label htmlFor="position">سمت</Label>
              <Input id="position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="مثلاً سرپرست شیفت" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="جنسیت">
                <ChoiceSelect choices={GENDER} value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
              </Field>
              <Field label="مدرک تحصیلی">
                <ChoiceSelect choices={EDUCATION_LEVEL} value={form.education_level} onChange={(v) => setForm({ ...form, education_level: v })} />
              </Field>
            </div>

            <Field label="تاریخ تولد">
              <JalaliDatePicker value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} />
            </Field>

            <LocationPicker
              province={location.province}
              city={location.city}
              district={location.district}
              onChange={setLocation}
            />

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
              {s.position && <p className="text-xs text-slate-500">{s.position}</p>}
              <p className="text-xs text-slate-500" dir="ltr">{s.phone_number}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {[
                  s.gender && labelForValue(GENDER, s.gender),
                  s.education_level && labelForValue(EDUCATION_LEVEL, s.education_level),
                  s.city_name,
                ].filter(Boolean).join(" · ")}
              </p>
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
