"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Field } from "@/components/forms/fields"
import { myAuditHistoryService, type AuditLogEntry } from "@/services/my_audit_history.service"
import { ROUTES } from "@/lib/routes"

export default function MyHistoryPage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()

  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  function refresh() {
    setLoading(true)
    return myAuditHistoryService
      .list({ start: startDate || undefined, end: endDate || undefined })
      .then(setEntries)
      .catch(() => setError("دریافت تاریخچه با خطا مواجه شد."))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">تاریخچه حساب من</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <p className="text-xs text-muted-foreground">
          هر اتفاق مهم مربوط به حساب شما — تأیید، رد، مسدودسازی، یا اقداماتی که خودتان انجام داده‌اید.
        </p>

        <Card className="border-pink-100">
          <CardContent className="space-y-3 p-4">
            {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}
            <div className="flex flex-wrap items-end gap-2">
              <Field label="از تاریخ">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field label="تا تاریخ">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
              <Button size="sm" variant="outline" onClick={refresh}>اعمال فیلتر</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-pink-100">
          <CardHeader><CardTitle className="text-rose-900">رویدادها ({entries.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">هنوز رویدادی برای این بازه ثبت نشده است.</p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-pink-100 bg-pink-50/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-rose-900">{entry.event_type_label}</span>
                      <span className="text-xs text-muted-foreground">{entry.created_at.slice(0, 16).replace("T", " — ")}</span>
                    </div>
                    {entry.actor_name && entry.actor_user_id !== entry.target_user_id && (
                      <p className="mt-1 text-xs text-muted-foreground">توسط: {entry.actor_name}</p>
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
