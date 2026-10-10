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
import { STATUS_LABEL, type CaregiverDocumentField, type CaregiverFullProfile } from "@/types/caregiver_review"
import { ROUTES } from "@/lib/routes"

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  suspended: "bg-red-200 text-red-900",
}

const DOC_CHECKLIST: { docType: CaregiverDocumentField; label: string }[] = [
  { docType: "no_criminal_record", label: "عدم سوءپیشینه" },
  { docType: "no_addiction_test", label: "آزمایش عدم اعتیاد" },
  { docType: "identity_verified", label: "تأیید مدارک هویتی" },
  { docType: "personal_photo", label: "عکس پرسنلی" },
  { docType: "mental_health_test", label: "آزمون سلامت روان" },
  { docType: "promissory_note", label: "دریافت سفته/ضمانت" },
  { docType: "id_card_received", label: "دریافت مدرک شناسایی" },
  { docType: "residency_documents", label: "مدارک اقامت اتباع (پاسپورت/اقامت)" },
]

const DOC_STATUS_LABEL: Record<string, string> = { pending: "در انتظار بررسی", approved: "تأیید شده", rejected: "رد شده" }
const DOC_STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800", rejected: "bg-rose-100 text-rose-800",
}

function DocumentReviewRow({ userId, docType, label, upload, onReviewed }: {
  userId: number
  docType: CaregiverDocumentField
  label: string
  upload: CaregiverFullProfile["documents"][CaregiverDocumentField] | undefined
  onReviewed: () => Promise<unknown>
}) {
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")

  async function handleApprove() {
    setBusy(true)
    try {
      await caregiverReviewService.approveDocument(userId, docType)
      await onReviewed()
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!reason.trim()) return
    setBusy(true)
    try {
      await caregiverReviewService.rejectDocument(userId, docType, reason.trim())
      await onReviewed()
      setRejecting(false); setReason("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-2.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {upload ? (
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", DOC_STATUS_CLASS[upload.status])}>
            {DOC_STATUS_LABEL[upload.status]}
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">آپلود نشده</span>
        )}
      </div>

      {upload?.status === "rejected" && upload.rejection_reason && (
        <p className="mt-1 text-xs text-rose-700">دلیل رد: {upload.rejection_reason}</p>
      )}

      {upload && (
        <div className="mt-1.5 flex items-center gap-2">
          <a href={upload.file} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-700 underline">مشاهده فایل</a>
        </div>
      )}

      {upload && upload.status === "pending" && !rejecting && (
        <div className="mt-1.5 flex gap-2">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={handleApprove}>تأیید</Button>
          <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={busy} onClick={() => setRejecting(true)}>رد</Button>
        </div>
      )}

      {rejecting && (
        <div className="mt-1.5 space-y-2">
          <textarea
            className="w-full rounded-md border border-input bg-background p-2 text-xs"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="دلیل رد شدن"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={busy || !reason.trim()} onClick={handleReject}>ثبت رد</Button>
            <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setReason("") }}>انصراف</Button>
          </div>
        </div>
      )}
    </div>
  )
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
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-foreground">بررسی پروفایل مراقب</h1>
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
                  <p className="text-rose-700">دلیل رد شدن: {profile.rejection_reason}</p>
                )}
                {profile.blacklist_reason && (
                  <p className="text-red-800">دلیل مسدودسازی: {profile.blacklist_reason}</p>
                )}
              </CardContent>
            </Card>

            {complaints.length > 0 && (
              <Card className={complaints.some((c) => c.status === "open" || c.status === "under_review") ? "border-amber-300" : "border-border"}>
                <CardHeader>
                  <CardTitle className="text-sm text-foreground">شکایات ثبت‌شده درباره این مراقب ({complaints.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {complaints.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-2.5 text-sm">
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
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm text-foreground">
                    نظرات ثبت‌شده ({reviews.length}) — میانگین امتیاز: {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} از ۵
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border bg-muted/50 p-2.5 text-sm">
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

            <Card className="border-border">
              {(() => {
                // مدارک اقامت اتباع فقط برای کسانی که در فرم هویتی
                // تابعیت غیرایرانی را تأیید کرده‌اند نشان داده می‌شود.
                const isNonIranian = Boolean(profile.identity?.is_non_iranian_national)
                const checklist = isNonIranian ? DOC_CHECKLIST : DOC_CHECKLIST.filter((d) => d.docType !== "residency_documents")
                return (
                  <>
                    <CardHeader><CardTitle className="text-sm text-foreground">تکمیل مدارک ({checklist.filter((d) => profile.documents?.[d.docType]?.status === "approved").length} از {checklist.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {checklist.map((d) => (
                        <DocumentReviewRow
                          key={d.docType}
                          userId={userId}
                          docType={d.docType}
                          label={d.label}
                          upload={profile.documents?.[d.docType]}
                          onReviewed={refresh}
                        />
                      ))}
                    </CardContent>
                  </>
                )
              })()}
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
                      <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setReasonBox("reject")}>
                        رد کردن
                      </Button>
                    )}
                    {profile.status === "approved" && (
                      <Button size="sm" variant="outline" className="border-red-300 text-red-800 hover:bg-red-50" onClick={() => setReasonBox("blacklist")}>
                        مسدود کردن
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
