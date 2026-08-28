"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { userManagementService } from "@/services/user_management.service"
import { ROLE_LABELS, type ManagedUser, type UserRole } from "@/types/user_management"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

const ROLE_FILTER_OPTIONS: { value: UserRole | ""; label: string }[] = [
  { value: "", label: "همه نقش‌ها" },
  { value: "superuser", label: "سوپریوزر" },
  { value: "admin", label: "ادمین / کارشناس" },
  { value: "agency", label: "آژانس / شرکت" },
  { value: "family", label: "خانواده" },
  { value: "patient", label: "بیمار / سالمند" },
  { value: "caregiver", label: "مراقب" },
]

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth(["superuser"])
  const router = useRouter()

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState<{ id: number; text: string } | null>(null)

  function refresh() {
    return userManagementService.list({ search, role: roleFilter }).then(setUsers)
  }

  useEffect(() => {
    if (!user) return
    setLoading(true)
    refresh().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (authLoading || !user) return null

  async function handleSearch() {
    setLoading(true)
    await refresh()
    setLoading(false)
  }

  async function handleRoleChange(targetId: number, newRole: UserRole) {
    setSavingId(targetId); setError(null)
    try {
      await userManagementService.changeRole(targetId, newRole)
      setEditingId(null)
      await refresh()
    } catch (err: any) {
      setError({ id: targetId, text: err?.response?.data?.detail || "تغییر نقش با خطا مواجه شد." })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background pb-10">
      <AppHeader title="مدیریت کاربران و نقش‌ها">
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.agencies)}>آژانس‌ها</Button>
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.analytics)}>تحلیل پلتفرم</Button>
        <Button variant="ghost" size="sm" className="text-primary-strong" onClick={logout}>خروج</Button>
      </AppHeader>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <Card className="border-border">
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <Input
              placeholder="جست‌وجو با نام، نام کاربری یا شماره موبایل"
              className="min-w-[220px] flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
            >
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button size="sm" onClick={handleSearch} disabled={loading}>جست‌وجو</Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader><CardTitle className="text-foreground">کاربران ({users.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">کاربری با این مشخصات یافت نشد.</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="rounded-lg border border-border bg-secondary/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {u.first_name} {u.last_name}
                          <span className="text-xs text-muted-foreground"> — {u.username}</span>
                        </p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{u.phone_number}</p>
                      </div>

                      {editingId === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                            defaultValue={u.role}
                            id={`role-select-${u.id}`}
                          >
                            {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={savingId === u.id}
                            onClick={() => {
                              const select = document.getElementById(`role-select-${u.id}`) as HTMLSelectElement
                              handleRoleChange(u.id, select.value as UserRole)
                            }}
                          >
                            {savingId === u.id ? "..." : "ذخیره"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>انصراف</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-medium",
                            u.role === "superuser" ? "bg-purple-100 text-purple-800" :
                            u.role === "admin" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-700",
                          )}>
                            {ROLE_LABELS[u.role]}
                          </span>
                          <Button size="sm" variant="outline" className="border-border text-primary-strong hover:bg-secondary" onClick={() => setEditingId(u.id)}>
                            تغییر نقش
                          </Button>
                        </div>
                      )}
                    </div>
                    {error?.id === u.id && (
                      <p className="mt-2 text-xs text-destructive">{error.text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
