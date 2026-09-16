"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { Field, ChoiceSelect, CheckboxGroup } from "@/components/forms/fields"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { PHYSICAL_CONDITION, NEEDED_SHIFT, RELATION_TYPE, GENDER } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import type { AgencyPatient } from "@/types/agency_management"
import { Sidebar } from "@/components/layout/sidebar"

const emptyForm = {
  mode: "standalone" as "standalone" | "with_family",
  full_name: "", gender: "", physical_condition: "", needed_shifts: [] as string[],
  family_first_name: "", family_last_name: "", family_phone_number: "", relation: "",
}

export default function PatientsPage() {
  const { user, loading: authLoading, logout } = useAuth(["agency", "agency_supervisor"])
  const router = useRouter()

  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [patients, setPatients] = useState<AgencyPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successNote, setSuccessNote] = useState<{ accessCode: string; family?: { phone: string; code: string } } | null>(null)

  function refresh(id: number) {
    return agencyManagementService.listPatients(id).then(setPatients)
  }

  useEffect(() => {
    if (!user) return
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return refresh(profile.id)
    }).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  async function handleCreate() {
    if (agencyId === null) return
    setSaving(true); setError(""); setSuccessNote(null)
    try {
      const payload = form.mode === "standalone"
        ? {
            mode: "standalone" as const,
            patient: { full_name: form.full_name, gender: form.gender || undefined, physical_condition: form.physical_condition || undefined, needed_shifts: form.needed_shifts },
          }
        : {
            mode: "with_family" as const,
            patient: { full_name: form.full_name, gender: form.gender || undefined, physical_condition: form.physical_condition || undefined, needed_shifts: form.needed_shifts },
            family: { first_name: form.family_first_name, last_name: form.family_last_name, phone_number: form.family_phone_number, relation: form.relation },
          }
      const created = await agencyManagementService.createPatient(agencyId, payload)
      setPatients((prev) => [created, ...prev])
      setSuccessNote({
        accessCode: created.access_code,
        family: created.family ? { phone: created.family.phone_number, code: created.family.access_code } : undefined,
      })
      setForm(emptyForm)
      setShowForm(false)
      await refresh(agencyId)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ثبت سالمند با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background pb-10">
      <AppHeader title="سالمندهای آژانس" maxWidth="max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
      </AppHeader>

      <div className="min-h-screen bg-slate-50">
      <Sidebar onLogout={logout} isOwner={user.role === "agency"} />

      <div className="sm:mr-64">
        <main className="mx-auto max-w-2xl space-y-4 p-4">
        {successNote && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <p>سالمند ثبت شد — کد سالمند: <span dir="ltr" className="font-mono">{successNote.accessCode}</span></p>
            {successNote.family && (
              <p className="mt-1">
                حساب خانواده ساخته شد (<span dir="ltr">{successNote.family.phone}</span>) —
                کد پیوستن: <span dir="ltr" className="font-mono">{successNote.family.code}</span>
              </p>
            )}
          </div>
        )}

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">فهرست سالمندها ({patients.length})</CardTitle>
            {!showForm && <Button size="sm" onClick={() => setShowForm(true)}>افزودن سالمند</Button>}
          </CardHeader>

          {showForm && (
            <CardContent className="space-y-4 border-t border-border pt-4">
              {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

              <Field label="نحوه ثبت">
                <div className="flex gap-2">
                  <Button
                    type="button" size="sm"
                    variant={form.mode === "standalone" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, mode: "standalone" })}
                  >
                    فقط سالمند (خانواده بعداً با کد وصل می‌شود)
                  </Button>
                  <Button
                    type="button" size="sm"
                    variant={form.mode === "with_family" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, mode: "with_family" })}
                  >
                    سالمند + ساخت حساب خانواده
                  </Button>
                </div>
              </Field>

              <Field label="نام و نام خانوادگی سالمند" required>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label="جنسیت">
                <ChoiceSelect choices={GENDER} value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
              </Field>
              <Field label="شرایط جسمانی فعلی">
                <ChoiceSelect choices={PHYSICAL_CONDITION} value={form.physical_condition} onChange={(v) => setForm({ ...form, physical_condition: v })} />
              </Field>
              <Field label="شیفت‌های زمانی مورد نیاز">
                <CheckboxGroup choices={NEEDED_SHIFT} value={form.needed_shifts} onChange={(v) => setForm({ ...form, needed_shifts: v })} />
              </Field>

              {form.mode === "with_family" && (
                <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-3">
                  <p className="text-xs font-medium text-foreground">اطلاعات خانواده</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="نام" required>
                      <Input value={form.family_first_name} onChange={(e) => setForm({ ...form, family_first_name: e.target.value })} />
                    </Field>
                    <Field label="نام خانوادگی" required>
                      <Input value={form.family_last_name} onChange={(e) => setForm({ ...form, family_last_name: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="شماره موبایل خانواده" required>
                    <Input dir="ltr" value={form.family_phone_number} onChange={(e) => setForm({ ...form, family_phone_number: e.target.value })} />
                  </Field>
                  <Field label="نسبت با سالمند" required>
                    <ChoiceSelect choices={RELATION_TYPE} value={form.relation} onChange={(v) => setForm({ ...form, relation: v })} />
                  </Field>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={saving || !form.full_name || (form.mode === "with_family" && (!form.family_first_name || !form.family_last_name || !form.family_phone_number || !form.relation))}
                  onClick={handleCreate}
                >
                  {saving ? "در حال ثبت..." : "ثبت سالمند"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>انصراف</Button>
              </div>
            </CardContent>
          )}
        </Card>

        {loading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : patients.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز هیچ سالمندی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {patients.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
                <div>
                  <p className="text-sm font-medium">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{p.access_code}</p>
                </div>
                <Button size="sm" variant="outline" className="border-border text-primary-strong hover:bg-secondary" onClick={() => router.push(ROUTES.patientMatch(p.id))}>
                  یافتن مراقب مناسب
                </Button>
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
