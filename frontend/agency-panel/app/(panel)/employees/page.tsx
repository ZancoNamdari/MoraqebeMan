"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, UserCog, ShieldCheck } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { ROUTES } from "@/lib/routes"
import type { AgencyAdmin, AgencySupervisor } from "@/types/agency_management"

type EmployeeRow = {
  key: string
  kind: "supervisor" | "admin"
  full_name: string
  phone_number: string
  position: string
  supervisor_name?: string
  created_by_username: string | null
  created_at: string
}

export default function EmployeesPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const router = useRouter()

  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    // Read-only overview — creating a supervisor or admin still
    // happens on their own dedicated pages (owner-only), this page
    // just merges both rosters into one list for a quick glance.
    if (user.role !== "agency") {
      router.replace(ROUTES.dashboard)
      return
    }
    agencyService.me().then((profile) => {
      return Promise.all([
        agencyManagementService.listSupervisors(profile.id),
        agencyManagementService.listAdmins(profile.id),
      ])
    }).then(([supervisors, admins]: [AgencySupervisor[], AgencyAdmin[]]) => {
      const combined: EmployeeRow[] = [
        ...supervisors.map((s) => ({
          key: `supervisor-${s.id}`,
          kind: "supervisor" as const,
          full_name: s.full_name,
          phone_number: s.phone_number,
          position: s.position,
          created_by_username: s.created_by_username,
          created_at: s.created_at,
        })),
        ...admins.map((a) => ({
          key: `admin-${a.id}`,
          kind: "admin" as const,
          full_name: a.full_name,
          phone_number: a.phone_number,
          position: a.position,
          supervisor_name: a.supervisor_name,
          created_by_username: a.created_by_username,
          created_at: a.created_at,
        })),
      ].sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())
      setEmployees(combined)
    }).finally(() => setLoading(false))
  }, [user, router])

  if (authLoading || !user) return null

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">کارمندان آژانس</h1>
          <p className="text-xs text-slate-500">فهرست یکجای سوپروایزرها و ادمین‌ها ({employees.length})</p>
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

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : employees.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز هیچ کارمندی ثبت نشده است.</p>
      ) : (
        <div className="space-y-2">
          {employees.map((e) => (
            <div key={e.key} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900">{e.full_name}</p>
                <span
                  className={
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                    (e.kind === "supervisor"
                      ? "bg-primary/15 text-primary-strong"
                      : "bg-slate-100 text-slate-600")
                  }
                >
                  {e.kind === "supervisor" ? <UserCog className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                  {e.kind === "supervisor" ? "سوپروایزر" : "ادمین"}
                </span>
              </div>
              {e.position && <p className="mt-1 text-xs text-slate-500">{e.position}</p>}
              <p className="mt-1 text-xs text-slate-500" dir="ltr">{e.phone_number}</p>
              {e.kind === "admin" && e.supervisor_name && (
                <p className="mt-1 text-[11px] text-slate-500">زیر نظر: {e.supervisor_name}</p>
              )}
              {e.created_by_username && (
                <p className="text-[11px] text-slate-400">ثبت‌شده توسط: {e.created_by_username}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
