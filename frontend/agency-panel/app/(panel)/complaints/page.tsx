"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/useauth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { agencyComplaintsService, type ComplaintListItem } from "@/services/agency_complaints.service"
import { COMPLAINT_CATEGORY_LABEL, COMPLAINT_STATUS_LABEL } from "@/lib/constants"
import { cn } from "@/lib/utils"

const STATUS_CLASS: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
  dismissed: "bg-gray-100 text-gray-600",
}

export default function AgencyComplaintsPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])

  const [complaints, setComplaints] = useState<ComplaintListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    agencyService.me()
      .then((profile) => agencyComplaintsService.list(profile.id))
      .then(setComplaints)
      .catch(() => setError("دریافت شکایات با خطا مواجه شد."))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  const openCount = complaints.filter((c) => c.status === "open" || c.status === "under_review").length

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-slate-900">شکایات درباره مراقبان شما</h1>
        <p className="text-xs text-slate-500">
          این فهرست فقط جهت اطلاع است — رسیدگی و تصمیم‌گیری درباره شکایات توسط تیم مراقب من انجام می‌شود.
        </p>
      </div>

      {!loading && openCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {openCount} شکایت درباره مراقبان شما هنوز در حال بررسی است.
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-slate-900">فهرست شکایات ({complaints.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : complaints.length === 0 ? (
            <p className="text-sm text-muted-foreground">هیچ شکایتی درباره مراقبان شما ثبت نشده است.</p>
          ) : (
            <div className="space-y-2">
              {complaints.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-medium">{c.caregiver_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {COMPLAINT_CATEGORY_LABEL[c.category] || c.category} — سالمند: {c.patient_name || "—"}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", STATUS_CLASS[c.status])}>
                    {COMPLAINT_STATUS_LABEL[c.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
