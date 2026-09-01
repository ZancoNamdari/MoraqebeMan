"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { myProfileStatusService, type MyFullProfileStatus } from "@/services/my_profile_status.service"
import { blacklistAppealService, type BlacklistAppeal } from "@/services/blacklist_appeal.service"
import { ROUTES } from "@/lib/routes"

const STATUS_LABEL: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "پذیرفته‌شده",
  denied: "رد شده",
}

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  denied: "bg-gray-100 text-gray-600",
}

export default function BlacklistAppealPage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()

  const [profileStatus, setProfileStatus] = useState<MyFullProfileStatus | null>(null)
  const [appeals, setAppeals] = useState<BlacklistAppeal[]>([])
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function refresh() {
    return Promise.all([
      myProfileStatusService.get().then(setProfileStatus),
      blacklistAppealService.list().then(setAppeals),
    ])
  }

  useEffect(() => {
    if (!user) return
    refresh().finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  const hasPending = appeals.some((a) => a.status === "pending")
  const isSuspended = profileStatus?.status === "suspended"

  async function handleSubmit() {
    if (!reason.trim()) return
    setSaving(true); setError("")
    try {
      await blacklistAppealService.submit(reason)
      setReason("")
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ثبت درخواست با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">درخواست بازبینی مسدودیت</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <>
            {!isSuspended && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                حساب شما در حال حاضر مسدود نیست — ثبت درخواست جدید امکان‌پذیر نیست.
              </div>
            )}

            {isSuspended && profileStatus?.blacklist_reason && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 text-sm text-red-900">
                  <p className="font-medium">دلیل مسدودسازی:</p>
                  <p className="mt-1">{profileStatus.blacklist_reason}</p>
                </CardContent>
              </Card>
            )}

            {isSuspended && !hasPending && (
              <Card className="border-pink-100">
                <CardHeader><CardTitle className="text-base text-rose-900">ثبت درخواست بازبینی</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}
                  <Textarea
                    maxLength={2000}
                    rows={5}
                    placeholder="توضیح دهید چرا فکر می‌کنید مسدودیت باید بررسی مجدد شود..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button disabled={!reason.trim() || saving} onClick={handleSubmit}>
                    {saving ? "در حال ثبت..." : "ثبت درخواست"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {hasPending && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                درخواست شما در انتظار بررسی است — تا تعیین تکلیف این درخواست، امکان ثبت درخواست جدید وجود ندارد.
              </div>
            )}

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-base text-rose-900">تاریخچه درخواست‌ها</CardTitle></CardHeader>
              <CardContent>
                {appeals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">هنوز درخواستی ثبت نکرده‌اید.</p>
                ) : (
                  <div className="space-y-2">
                    {appeals.map((a) => (
                      <div key={a.id} className="rounded-lg border border-pink-100 bg-pink-50/40 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{a.created_at.slice(0, 16).replace("T", " — ")}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_CLASS[a.status]}`}>
                            {STATUS_LABEL[a.status]}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{a.appeal_reason}</p>
                        {a.review_note && (
                          <p className="mt-1 text-xs text-muted-foreground">پاسخ بررسی: {a.review_note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
