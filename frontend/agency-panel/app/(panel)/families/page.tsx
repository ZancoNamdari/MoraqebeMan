"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import type { AgencyFamilyLink } from "@/types/agency"

export default function FamiliesPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])

  const [roster, setRoster] = useState<AgencyFamilyLink[]>([])
  const [requests, setRequests] = useState<AgencyFamilyLink[]>([])
  const [loading, setLoading] = useState(true)
  const [decidingId, setDecidingId] = useState<number | null>(null)

  function refresh() {
    return Promise.all([agencyService.familyRoster(), agencyService.familyRequests()]).then(([r, req]) => {
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
      await agencyService.decideFamilyRequest(linkId, decision)
      await refresh()
    } finally {
      setDecidingId(null)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-slate-900">خانواده‌های زیرمجموعه</h1>
        <p className="text-xs text-slate-500">{roster.length} خانواده عضو</p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <div className="space-y-4">
          {requests.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardHeader><CardTitle className="text-sm text-amber-900">درخواست‌های در انتظار تأیید</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3">
                    <div>
                      <p className="text-sm font-medium">{r.family_display_name || r.family_phone_number}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{r.family_phone_number}</p>
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
                        size="sm" variant="outline" className="border-slate-200 text-blue-700 hover:bg-slate-50"
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

          <Card className="border-slate-200">
            <CardHeader><CardTitle className="text-slate-900">خانواده‌های عضو ({roster.length})</CardTitle></CardHeader>
            <CardContent>
              {roster.length === 0 ? (
                <p className="text-sm text-muted-foreground">هنوز هیچ خانواده‌ای عضو این آژانس نشده است.</p>
              ) : (
                <div className="space-y-2">
                  {roster.map((r) => (
                    <div key={r.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-medium">{r.family_display_name || r.family_phone_number}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{r.family_phone_number}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
