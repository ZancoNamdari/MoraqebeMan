"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { agencyService } from "@/services/agency.service"
import { ROUTES } from "@/lib/routes"
import { labelForValue, ALL_SERVICE_TYPE } from "@/lib/wizard-constants"
import type { CaregiverRegistrationReview } from "@/types/agency"

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
const fa = (v: string) => v.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)])

// ثبت‌نام‌های مراقبانی که با کد همین آژانس ثبت‌نام کرده‌اند — تأیید نهایی (فعال شدن حساب) با ماست.
export function RegistrationReviews({ onChanged }: { onChanged?: () => void }) {
  const router = useRouter()
  const [items, setItems] = useState<CaregiverRegistrationReview[]>([])
  const [busy, setBusy] = useState<number | null>(null)
  const [rejecting, setRejecting] = useState<number | null>(null)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  const refresh = () => agencyService.caregiverRegistrations().then(setItems).catch(() => {})
  useEffect(() => { refresh() }, [])

  async function decide(userId: number, decision: "approve" | "reject") {
    setBusy(userId); setError("")
    try {
      await agencyService.decideCaregiverRegistration(userId, decision, reason.trim())
      setRejecting(null); setReason("")
      await refresh()
      onChanged?.()
    } catch (err: any) {
      const d = err?.response?.data
      setError([d?.detail, ...(d?.missing ?? []), ...(d?.reason ?? [])].filter(Boolean).join(" — ") || "ثبت تصمیم با خطا مواجه شد.")
    } finally {
      setBusy(null)
    }
  }

  if (items.length === 0) return null

  return (
    <Card className="border-sky-200 bg-sky-50/60">
      <CardHeader><CardTitle className="text-sm text-sky-900">ثبت‌نام‌های در انتظار تأیید شما ({fa(String(items.length))})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-sky-900">این مراقبان با کد آژانس شما ثبت‌نام کرده‌اند. پس از بررسی پروفایل، با تأیید شما حسابشان فعال می‌شود.</p>
        {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}
        {items.map((r) => (
          <div key={r.user_id} className="space-y-2 rounded-lg border border-sky-200 bg-white p-3">
            <div>
              <p className="text-sm font-medium">{r.full_name}</p>
              <p className="text-xs text-muted-foreground" dir="ltr">{r.phone_number}</p>
              <p className="text-xs text-muted-foreground">
                {r.service_types.map((t) => labelForValue(ALL_SERVICE_TYPE, t)).filter(Boolean).join("، ") || "نوع خدمت ثبت نشده"}
                {r.submitted_at && ` · ارسال: ${fa(r.submitted_at.replace(/-/g, "/"))}`}
              </p>
            </div>
            {rejecting === r.user_id ? (
              <div className="space-y-2">
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل رد (برای مراقب نمایش داده می‌شود)" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button size="sm" variant="destructive" disabled={busy === r.user_id || !reason.trim()} onClick={() => decide(r.user_id, "reject")}>ثبت رد</Button>
                  <Button size="sm" variant="outline" onClick={() => { setRejecting(null); setReason("") }}>انصراف</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="sm" variant="outline" onClick={() => router.push(`${ROUTES.caregivers}/${r.user_id}/profile`)}>مشاهده پروفایل</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy === r.user_id} onClick={() => decide(r.user_id, "approve")}>تأیید و فعال‌سازی</Button>
                <Button size="sm" variant="outline" className="text-rose-700" disabled={busy === r.user_id} onClick={() => setRejecting(r.user_id)}>رد</Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
