"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { complaintReviewService, type ComplaintDetail } from "@/services/complaint_review.service"
import { COMPLAINT_CATEGORY_LABEL, COMPLAINT_STATUS_LABEL } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

const STATUS_CLASS: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
  dismissed: "bg-gray-100 text-gray-600",
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function ComplaintDetailPage() {
  const { user, loading: authLoading } = useAuth(["admin", "superuser"])
  const router = useRouter()
  const params = useParams()
  const complaintId = Number(params.id)

  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [acting, setActing] = useState(false)
  const [actionType, setActionType] = useState<"resolve" | "dismiss" | null>(null)
  const [note, setNote] = useState("")

  function refresh() {
    return complaintReviewService.detail(complaintId).then(setComplaint)
  }

  useEffect(() => {
    if (!user || !complaintId) return
    refresh().catch(() => setError("دریافت شکایت با خطا مواجه شد.")).finally(() => setLoading(false))
  }, [user, complaintId])

  if (authLoading || !user) return null

  async function handleMarkUnderReview() {
    setActing(true); setError("")
    try {
      const updated = await complaintReviewService.markUnderReview(complaintId)
      setComplaint(updated)
    } catch {
      setError("این عملیات با خطا مواجه شد.")
    } finally {
      setActing(false)
    }
  }

  async function handleAction(kind: "resolve" | "dismiss") {
    setActing(true); setError("")
    try {
      const updated = kind === "resolve"
        ? await complaintReviewService.resolve(complaintId, note)
        : await complaintReviewService.dismiss(complaintId, note)
      setComplaint(updated)
      setActionType(null); setNote("")
    } catch {
      setError("این عملیات با خطا مواجه شد.")
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">جزئیات شکایت</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.complaints)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : !complaint ? (
          <p className="text-sm text-rose-700">شکایت یافت نشد.</p>
        ) : (
          <>
            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

            <Card className="border-pink-100">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-rose-900">{complaint.patient_name || "—"}</CardTitle>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", STATUS_CLASS[complaint.status])}>
                  {COMPLAINT_STATUS_LABEL[complaint.status]}
                </span>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">دسته‌بندی: </span>{COMPLAINT_CATEGORY_LABEL[complaint.category] || complaint.category}</p>
                {complaint.caregiver_name && <p><span className="text-muted-foreground">درباره مراقب: </span>{complaint.caregiver_name}</p>}
                <p><span className="text-muted-foreground">ثبت‌کننده: </span><span dir="ltr">{complaint.filed_by_phone}</span></p>
                <p className="pt-2 leading-relaxed">{complaint.description}</p>
                {complaint.voice_note && (
                  <audio controls className="w-full" src={`${API_BASE_URL}${complaint.voice_note}`}>
                    مرورگر شما از پخش فایل صوتی پشتیبانی نمی‌کند.
                  </audio>
                )}
                {complaint.resolution_note && (
                  <div className="mt-2 rounded-lg bg-pink-50/60 p-3">
                    <p className="text-xs font-medium text-rose-800">یادداشت رسیدگی:</p>
                    <p className="text-sm">{complaint.resolution_note}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {(complaint.status === "open" || complaint.status === "under_review") && (
              <Card className="border-pink-100">
                <CardHeader><CardTitle className="text-sm text-rose-900">اقدامات</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {actionType && (
                    <div className="space-y-2">
                      <Label htmlFor="note">یادداشت (اختیاری)</Label>
                      <textarea
                        id="note"
                        className="w-full rounded-md border border-input bg-background p-2 text-sm"
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" disabled={acting} onClick={() => handleAction(actionType)}>
                          {acting ? "..." : actionType === "resolve" ? "ثبت به‌عنوان حل‌شده" : "ثبت به‌عنوان رد‌شده"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setActionType(null); setNote("") }}>انصراف</Button>
                      </div>
                    </div>
                  )}

                  {!actionType && (
                    <div className="flex flex-wrap gap-2">
                      {complaint.status === "open" && (
                        <Button size="sm" variant="outline" disabled={acting} onClick={handleMarkUnderReview}>
                          شروع بررسی
                        </Button>
                      )}
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setActionType("resolve")}>
                        حل‌شده
                      </Button>
                      <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setActionType("dismiss")}>
                        رد شکایت
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
