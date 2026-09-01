"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { agencyComplaintsService, type ComplaintListItem } from "@/services/agency_complaints.service"
import { COMPLAINT_CATEGORY_LABEL, COMPLAINT_STATUS_LABEL } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

const STATUS_CLASS: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
  dismissed: "bg-gray-100 text-gray-600",
}

export default function AgencyComplaintsPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor"])
  const router = useRouter()

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
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">شکایات درباره مراقبان شما</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <p className="text-xs text-muted-foreground">
          این فهرست فقط جهت اطلاع است — رسیدگی و تصمیم‌گیری درباره شکایات توسط تیم مراقب من انجام می‌شود.
        </p>

        {!loading && openCount > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {openCount} شکایت درباره مراقبان شما هنوز در حال بررسی است.
          </div>
        )}

        <Card className="border-pink-100">
          <CardHeader><CardTitle className="text-rose-900">فهرست شکایات ({complaints.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full rounded-2xl" />
            ) : error ? (
              <p className="text-sm text-rose-700">{error}</p>
            ) : complaints.length === 0 ? (
              <p className="text-sm text-muted-foreground">هیچ شکایتی درباره مراقبان شما ثبت نشده است.</p>
            ) : (
              <div className="space-y-2">
                {complaints.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-pink-100 bg-pink-50/40 p-3">
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
      </main>
    </div>
  )
}
