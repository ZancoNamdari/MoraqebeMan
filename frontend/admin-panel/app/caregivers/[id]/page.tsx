"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { caregiverReviewService } from "@/services/caregiver_review.service"
import { complaintReviewService, type ComplaintListItem } from "@/services/complaint_review.service"
import { caregiverReviewsService, type CaregiverReview } from "@/services/caregiver_reviews.service"
import { COMPLAINT_STATUS_LABEL } from "@/lib/constants"
import { STATUS_LABEL, type CaregiverFullProfile } from "@/types/caregiver_review"
import { ROUTES } from "@/lib/routes"

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
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
  const [complaints, setComplaints] = useState<ComplaintListItem[]>([])
  const [reviews, setReviews] = useState<CaregiverReview[]>([])

  function refresh() {
    return caregiverReviewService.fullProfile(userId).then(setProfile)
  }

  useEffect(() => {
    if (!user || !userId) return
    refresh().catch(() => setError("دریافت پروفایل با خطا مواجه شد.")).finally(() => setLoading(false))
    // Connects the complaint system to the review workflow — before
    // this, an admin deciding whether to approve or blacklist a
    // caregiver had no visibility into complaints filed about them
    // at all, despite both features existing independently.
    complaintReviewService.listAboutCaregiver(userId).then(setComplaints).catch(() => {})
    caregiverReviewsService.list(userId).then(setReviews).catch(() => {})
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
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">بررسی پروفایل مراقب</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : !profile ? (
          <p className="text-sm text-rose-700">پروفایل یافت نشد.</p>
        ) : (
          <>
            {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

            <Card className="border-pink-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-rose-900">
                  {(profile.identity?.full_name as string) || `کاربر #${userId}`}
                </CardTitle>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", STATUS_CLASS[profile.status])}>
                  {STATUS_LABEL[profile.status]}
                </span>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {profile.rejection_reason && (
                  <p className="text-rose-700">دلیل رد شدن: {profile.rejection_reason}</p>
                )}
                {profile.blacklist_reason && (
                  <p className="text-red-800">دلیل مسدودسازی: {profile.blacklist_reason}</p>
                )}
              </CardContent>
            </Card>

            {complaints.length > 0 && (
              <Card className={complaints.some((c) => c.status === "open" || c.status === "under_review") ? "border-amber-300" : "border-pink-100"}>
                <CardHeader>
                  <CardTitle className="text-sm text-rose-900">شکایات ثبت‌شده درباره این مراقب ({complaints.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {complaints.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-pink-100 bg-pink-50/40 p-2.5 text-sm">
                      <span>{c.patient_name || "—"}</span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        c.status === "resolved" ? "bg-emerald-100 text-emerald-800"
                          : c.status === "dismissed" ? "bg-gray-100 text-gray-600"
                          : "bg-amber-100 text-amber-800",
                      )}>
                        {COMPLAINT_STATUS_LABEL[c.status]}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {reviews.length > 0 && (
              <Card className="border-pink-100">
                <CardHeader>
                  <CardTitle className="text-sm text-rose-900">
                    نظرات ثبت‌شده ({reviews.length}) — میانگین امتیاز: {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} از ۵
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-lg border border-pink-100 bg-pink-50/40 p-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                        <span className="text-xs text-muted-foreground">{r.reviewer_name || "—"}</span>
                      </div>
                      {r.comment && <p className="mt-1 text-xs text-muted-foreground">{r.comment}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-sm text-rose-900">اطلاعات کامل ثبت‌شده</CardTitle></CardHeader>
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

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-sm text-rose-900">اقدامات</CardTitle></CardHeader>
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
                      <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setReasonBox("reject")}>
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
