"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { auditLogService, type AuditLogEntry } from "@/services/audit_log.service"
import { Sidebar } from "@/components/layout/sidebar"

export default function AuditLogsPage() {
  const { user, loading: authLoading, logout } = useAuth(["admin", "superuser"])

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // "target" is deliberately the primary search field here — per the
  // explicit request, this page needs to answer "show me everything
  // that happened to this specific user", which maps to
  // target_user_id on the backend (actor is who did it, target is
  // who it happened to — usually the same person, but not always,
  // e.g. an admin approving a caregiver).
  const [targetUserId, setTargetUserId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  async function runSearch() {
    setLoading(true); setError("")
    try {
      const data = await auditLogService.list({
        target_user_id: targetUserId ? Number(targetUserId) : undefined,
        start: startDate || undefined,
        end: endDate || undefined,
      })
      setLogs(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "دریافت تاریخچه با خطا مواجه شد.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (authLoading || !user) return null

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background">
      <Sidebar onLogout={logout} />

      <div className="sm:mr-64">
        <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
          <div className="p-4 sm:px-6">
            <h1 className="font-bold text-rose-900">تاریخچه فعالیت‌ها</h1>
          </div>
        </header>

        <main className="space-y-4 p-4 sm:p-6">
          <Card className="border-pink-100">
            <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="target">شناسه کاربر</Label>
                <Input
                  id="target"
                  dir="ltr"
                  placeholder="مثلاً 12"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="start">از تاریخ</Label>
                <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">تا تاریخ</Label>
                <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={runSearch} disabled={loading}>
                  {loading ? "در حال جست‌وجو..." : "جست‌وجو"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <Card className="border-pink-100">
            <CardHeader><CardTitle className="text-rose-900">رویدادها ({logs.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full rounded-2xl" />
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">موردی یافت نشد.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-pink-100 bg-pink-50/40">
                      <button
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        className="flex w-full items-center justify-between p-3 text-right"
                      >
                        <div>
                          <p className="text-sm font-medium">{log.event_type_label}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.actor_name ?? "ناشناس"}
                            {log.target_name && log.target_name !== log.actor_name && ` ← ${log.target_name}`}
                          </p>
                        </div>
                        <p className="shrink-0 text-[11px] text-muted-foreground" dir="ltr">
                          {formatDateTime(log.created_at)}
                        </p>
                      </button>
                      {expandedId === log.id && Object.keys(log.metadata).length > 0 && (
                        <div className="border-t border-pink-100 p-3">
                          <pre dir="ltr" className="overflow-x-auto rounded-md bg-background p-2 text-[11px] text-muted-foreground">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
