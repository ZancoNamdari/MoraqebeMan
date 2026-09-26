"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, UserCog, ShieldCheck, Search, X } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { ROUTES } from "@/lib/routes"
import type { AgencyAdmin, AgencySupervisor } from "@/types/agency_management"
import { cn } from "@/lib/utils"

type EmployeeRow = {
  key: string
  id: number
  kind: "supervisor" | "admin"
  full_name: string
  phone_number: string
  position: string
  supervisor_id?: number
  supervisor_name?: string
  created_by_username: string | null
  created_at: string
}

type RoleFilter = "all" | "supervisor" | "admin"

// full_name only ever comes back from the list endpoints as one
// combined string ("first last"), so editing splits it back into two
// fields at the first space — a reasonable heuristic for Persian
// names, not a guarantee for compound family names.
function splitName(fullName: string) {
  const trimmed = fullName.trim()
  const spaceIndex = trimmed.indexOf(" ")
  if (spaceIndex === -1) return { first_name: trimmed, last_name: "" }
  return { first_name: trimmed.slice(0, spaceIndex), last_name: trimmed.slice(spaceIndex + 1) }
}

export default function EmployeesPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const router = useRouter()

  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [supervisors, setSupervisors] = useState<AgencySupervisor[]>([])
  const [admins, setAdmins] = useState<AgencyAdmin[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone_number: "", position: "", supervisor_id: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function refresh(id: number) {
    return Promise.all([
      agencyManagementService.listSupervisors(id),
      agencyManagementService.listAdmins(id),
    ]).then(([s, a]) => {
      setSupervisors(s)
      setAdmins(a)
    })
  }

  useEffect(() => {
    if (!user) return
    if (user.role !== "agency") {
      router.replace(ROUTES.dashboard)
      return
    }
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return refresh(profile.id)
    }).finally(() => setLoading(false))
  }, [user, router])

  const employees: EmployeeRow[] = useMemo(() => {
    const combined: EmployeeRow[] = [
      ...supervisors.map((s) => ({
        key: `supervisor-${s.id}`,
        id: s.id,
        kind: "supervisor" as const,
        full_name: s.full_name,
        phone_number: s.phone_number,
        position: s.position,
        created_by_username: s.created_by_username,
        created_at: s.created_at,
      })),
      ...admins.map((a) => ({
        key: `admin-${a.id}`,
        id: a.id,
        kind: "admin" as const,
        full_name: a.full_name,
        phone_number: a.phone_number,
        position: a.position,
        supervisor_id: a.supervisor_id,
        supervisor_name: a.supervisor_name,
        created_by_username: a.created_by_username,
        created_at: a.created_at,
      })),
    ]
    return combined.sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())
  }, [supervisors, admins])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees.filter((e) => {
      if (roleFilter !== "all" && e.kind !== roleFilter) return false
      if (!q) return true
      return (
        e.full_name.toLowerCase().includes(q) ||
        e.phone_number.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        (e.supervisor_name?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [employees, search, roleFilter])

  if (authLoading || !user) return null

  function startEdit(e: EmployeeRow) {
    const { first_name, last_name } = splitName(e.full_name)
    setEditForm({
      first_name, last_name,
      phone_number: e.phone_number,
      position: e.position,
      supervisor_id: e.supervisor_id ? String(e.supervisor_id) : "",
    })
    setError("")
    setEditingKey(e.key)
  }

  function cancelEdit() {
    setEditingKey(null)
    setError("")
  }

  async function saveEdit(e: EmployeeRow) {
    if (agencyId === null) return
    setSaving(true); setError("")
    try {
      if (e.kind === "supervisor") {
        const updated = await agencyManagementService.updateSupervisor(agencyId, e.id, {
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone_number: editForm.phone_number,
          position: editForm.position,
        })
        setSupervisors((prev) => prev.map((s) => (s.id === e.id ? updated : s)))
      } else {
        const updated = await agencyManagementService.updateAdmin(agencyId, e.id, {
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone_number: editForm.phone_number,
          position: editForm.position,
          supervisor_id: editForm.supervisor_id ? Number(editForm.supervisor_id) : undefined,
        })
        setAdmins((prev) => prev.map((a) => (a.id === e.id ? updated : a)))
      }
      setEditingKey(null)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ویرایش با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900">کارمندان آژانس</h1>
          <p className="text-xs text-slate-500">فهرست یکجای سوپروایزرها و ادمین‌ها ({filtered.length} از {employees.length})</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push(ROUTES.supervisors)} className="gap-1.5">
            <Plus className="h-4 w-4" /> سوپروایزر
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push(ROUTES.admins)} className="gap-1.5">
            <Plus className="h-4 w-4" /> ادمین
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام، تلفن یا سمت..."
            className="pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {([
            { key: "all", label: "همه" },
            { key: "supervisor", label: "سوپروایزر" },
            { key: "admin", label: "ادمین" },
          ] as { key: RoleFilter; label: string }[]).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRoleFilter(opt.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                roleFilter === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {employees.length === 0 ? "هنوز هیچ کارمندی ثبت نشده است." : "موردی با این فیلتر پیدا نشد."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const isEditing = editingKey === e.key
            return (
              <div key={e.key} className="rounded-lg border border-slate-200 bg-white p-3">
                <button
                  type="button"
                  onClick={() => (isEditing ? cancelEdit() : startEdit(e))}
                  className="flex w-full items-center justify-between text-right"
                >
                  <p className="text-sm font-medium text-slate-900">{e.full_name}</p>
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      e.kind === "supervisor" ? "bg-primary/15 text-primary-strong" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {e.kind === "supervisor" ? <UserCog className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                    {e.kind === "supervisor" ? "سوپروایزر" : "ادمین"}
                  </span>
                </button>
                {e.position && <p className="mt-1 text-xs text-slate-500">{e.position}</p>}
                <p className="mt-1 text-xs text-slate-500" dir="ltr">{e.phone_number}</p>
                {e.kind === "admin" && e.supervisor_name && (
                  <p className="mt-1 text-[11px] text-slate-500">زیر نظر: {e.supervisor_name}</p>
                )}
                {e.created_by_username && (
                  <p className="text-[11px] text-slate-400">ثبت‌شده توسط: {e.created_by_username}</p>
                )}

                {isEditing && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`fn-${e.key}`}>نام</Label>
                        <Input id={`fn-${e.key}`} value={editForm.first_name} onChange={(ev) => setEditForm({ ...editForm, first_name: ev.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`ln-${e.key}`}>نام خانوادگی</Label>
                        <Input id={`ln-${e.key}`} value={editForm.last_name} onChange={(ev) => setEditForm({ ...editForm, last_name: ev.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`ph-${e.key}`}>شماره موبایل</Label>
                      <Input id={`ph-${e.key}`} dir="ltr" value={editForm.phone_number} onChange={(ev) => setEditForm({ ...editForm, phone_number: ev.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`pos-${e.key}`}>سمت</Label>
                      <Input id={`pos-${e.key}`} value={editForm.position} onChange={(ev) => setEditForm({ ...editForm, position: ev.target.value })} />
                    </div>
                    {e.kind === "admin" && (
                      <div className="space-y-1.5">
                        <Label htmlFor={`sup-${e.key}`}>سوپروایزر مسئول</Label>
                        <select
                          id={`sup-${e.key}`}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={editForm.supervisor_id}
                          onChange={(ev) => setEditForm({ ...editForm, supervisor_id: ev.target.value })}
                        >
                          {supervisors.map((s) => (
                            <option key={s.id} value={s.id}>{s.full_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={saving} onClick={() => saveEdit(e)}>
                        {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>انصراف</Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
