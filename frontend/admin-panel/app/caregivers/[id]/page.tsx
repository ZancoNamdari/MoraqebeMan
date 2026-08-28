"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { cn } from "@/lib/utils"
import { caregiverReviewService } from "@/services/caregiver_review.service"
import { STATUS_LABEL, type CaregiverFullProfile } from "@/types/caregiver_review"
import { ROUTES } from "@/lib/routes"

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-destructive/10 text-destructive",
  suspended: "bg-red-200 text-red-900",
}

export default function CaregiverDetailPage() {
  const { user, loading: authLoading } = useAuth(["admin", "superuser"])
  const router = useRouter()
  const params = useParams()
  const userId = Number(params.id)

  const [profile, setProfile] = useState<CaregiverFullProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [acting, setActing] = useState(false)
  const [reasonBox, setReasonBox] = useState<"reject" | "blacklist" | null>(null)
  const [reason, setReason] = useState("")

  function refresh() {
    return caregiverReviewService.fullProfile(userId).then(setProfile)
  }

  useEffect(() => {
    if (!user || !userId) return
    refresh().catch(() => setError("دریافت پروفایل با خطا مواجه شد.")).finally(() => setLoading(false))
  }, [user, userId])

  if (authLoading || !user) return null

  async function handleApprove() {
    setActing(true); setError(""); setMessage("")
    try {
      const result = await caregiverReviewService.approve(userId)
      if (result.missing) {
        setError(`فرم‌های ناقص: ${result.missing.join("، ")}`)
      } else {
        setMessage("پروفایل تأیید شد.")
        await refresh()
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "عملیات با خطا مواجه شد.")
      if (err?.response?.data?.missing) {
        setError(`فرم‌های ناقص: ${err.response.data.missing.join("، ")}`)
      }
    } finally {
      setActing(false)
    }
  }

  async function handleReasonAction(kind: "reject" | "blacklist") {
    setActing(true); setError(""); setMessage("")
    try {
      if (kind === "reject") {
        await caregiverReviewService.reject(userId, reason)
        setMessage("پروفایل رد شد.")
      } else {
        await caregiverReviewService.blacklist(userId, reason)
        setMessage("مراقب مسدود شد.")
      }
      setReason(""); setReasonBox(null)
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.detail || "عملیات با خطا مواجه شد.")
    } finally {
      setActing(false)
    }
  }

  async function handleUnblacklist() {
    setActing(true); setError(""); setMessage("")
    try {
      await caregiverReviewService.unblacklist(userId)
      setMessage("مسدودیت رفع شد.")
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.detail || "عملیات با خطا مواجه شد.")
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background pb-10">
      <AppHeader title="بررسی پروفایل مراقب" maxWidth="max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
      </AppHeader>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : !profile ? (
          <p className="text-sm text-primary-strong">پروفایل یافت نشد.</p>
        ) : (
          <>
            {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
            {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">
                  {(profile.identity?.full_name as string) || `کاربر #${userId}`}
                </CardTitle>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", STATUS_CLASS[profile.status])}>
                  {STATUS_LABEL[profile.status]}
                </span>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {profile.rejection_reason && (
                  <p className="text-primary-strong">دلیل رد شدن: {profile.rejection_reason}</p>
                )}
                {profile.blacklist_reason && (
                  <p className="text-red-800">دلیل مسدودسازی: {profile.blacklist_reason}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader><CardTitle className="text-sm text-foreground">اطلاعات کامل ثبت‌شده</CardTitle></CardHeader>
              <CardContent>
                <pre dir="ltr" className="max-h-96 overflow-auto rounded-lg bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-700">
                  {JSON.stringify({
                    identity: profile.identity,
                    work_preferences: profile.work_preferences,
                    service_areas: profile.service_areas,
                    experience: profile.experience,
                    skills: profile.skills,
                    references: profile.references,
                  }, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader><CardTitle className="text-sm text-foreground">اقدامات</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {reasonBox && (
                  <div className="space-y-2">
                    <Label htmlFor="reason">دلیل</Label>
                    <textarea
                      id="reason"
                      className="w-full rounded-md border border-input bg-background p-2 text-sm"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={acting} onClick={() => handleReasonAction(reasonBox)}>
                        {acting ? "..." : "ثبت"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setReasonBox(null); setReason("") }}>انصراف</Button>
                    </div>
                  </div>
                )}

                {!reasonBox && (
                  <div className="flex flex-wrap gap-2">
                    {profile.status !== "approved" && profile.status !== "suspended" && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={acting} onClick={handleApprove}>
                        تأیید پروفایل
                      </Button>
                    )}
                    {profile.status !== "rejected" && profile.status !== "suspended" && (
                      <Button size="sm" variant="outline" className="border-border text-primary-strong hover:bg-secondary" onClick={() => setReasonBox("reject")}>
                        رد کردن
                      </Button>
                    )}
                    {profile.status === "approved" && (
                      <Button size="sm" variant="outline" className="border-red-300 text-red-800 hover:bg-red-50" onClick={() => setReasonBox("blacklist")}>
                        مسدود کردن (بلک‌لیست)
                      </Button>
                    )}
                    {profile.status === "suspended" && (
                      <Button size="sm" disabled={acting} onClick={handleUnblacklist}>
                        رفع مسدودیت
                      </Button>
                    )}
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
