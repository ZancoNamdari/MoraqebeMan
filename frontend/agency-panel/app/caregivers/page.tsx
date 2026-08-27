"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import type { AgencyCaregiverLink } from "@/types/agency"

const CAREGIVER_STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس", pending: "در انتظار بررسی پلتفرم", approved: "تأییدشده در پلتفرم",
  rejected: "رد شده در پلتفرم", suspended: "معلق",
}

export default function CaregiversPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor"])
  const router = useRouter()

  const [roster, setRoster] = useState<AgencyCaregiverLink[]>([])
  const [requests, setRequests] = useState<AgencyCaregiverLink[]>([])
  const [loading, setLoading] = useState(true)
  const [decidingId, setDecidingId] = useState<number | null>(null)

  function refresh() {
    return Promise.all([agencyService.caregiverRoster(), agencyService.caregiverRequests()]).then(([r, req]) => {
      setRoster(r)
      setRequests(req)
    })
  }

  useEffect(() => {
    if (!user) return
    refresh().finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  async function handleDecision(linkId: number, decision: "approve" | "reject") {
    setDecidingId(linkId)
    try {
      await agencyService.decideCaregiverRequest(linkId, decision)
      await refresh()
    } finally {
      setDecidingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">استخر مراقبان</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <>
            {requests.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/60">
                <CardHeader><CardTitle className="text-sm text-amber-900">درخواست‌های در انتظار تأیید</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {requests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3">
                      <div>
                        <p className="text-sm font-medium">{r.caregiver_display_name}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{r.caregiver_phone_number}</p>
                        <p className="text-xs text-muted-foreground">وضعیت در پلتفرم: {CAREGIVER_STATUS_LABEL[r.caregiver_status] || r.caregiver_status}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={decidingId === r.id}
                          onClick={() => handleDecision(r.id, "approve")}
                        >
                          تأیید
                        </Button>
                        <Button
                          size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          disabled={decidingId === r.id}
                          onClick={() => handleDecision(r.id, "reject")}
                        >
                          رد
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-rose-900">مراقبان استخر آژانس ({roster.length})</CardTitle></CardHeader>
              <CardContent>
                {roster.length === 0 ? (
                  <p className="text-sm text-muted-foreground">هنوز هیچ مراقبی در استخر این آژانس نیست.</p>
                ) : (
                  <div className="space-y-2">
                    {roster.map((r) => (
                      <div key={r.id} className="rounded-lg border border-pink-100 bg-pink-50/50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{r.caregiver_display_name}</p>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            r.caregiver_status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600",
                          )}>
                            {CAREGIVER_STATUS_LABEL[r.caregiver_status] || r.caregiver_status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground" dir="ltr">{r.caregiver_phone_number}</p>
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
