"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import type { AgencySuggestionsResponse } from "@/types/agency_management"

const CONFIDENCE_LABEL: Record<string, string> = { high: "اطمینان بالا", medium: "اطمینان متوسط", low: "اطمینان پایین" }
const CONFIDENCE_CLASS: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-gray-100 text-gray-600",
}

export default function AgencyPatientMatchPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor"])
  const router = useRouter()
  const params = useParams()
  const patientId = Number(params.id)

  const [data, setData] = useState<AgencySuggestionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user || !patientId) return
    agencyService.me()
      .then((profile) => agencyManagementService.suggestCaregivers(profile.id, patientId))
      .then(setData)
      .catch((err) => setError(err?.response?.data?.detail || "دریافت پیشنهادها با خطا مواجه شد."))
      .finally(() => setLoading(false))
  }, [user, patientId])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background pb-10">
      <AppHeader title="پیشنهاد مراقب" maxWidth="max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.patients)}>بازگشت</Button>
      </AppHeader>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        ) : !data ? null : (
          <>
            <Card className="border-border bg-gradient-to-l from-secondary to-secondary">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">پیشنهاد مراقب برای</p>
                <p className="text-lg font-bold text-foreground">{data.patient_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  این فهرست فقط از میان مراقبان استخر همین آژانس ساخته شده — نه کل پلتفرم.
                </p>
              </CardContent>
            </Card>

            {data.suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                هیچ مراقب مناسبی در استخر این آژانس یافت نشد — ابتدا مراقب به آژانس اضافه کنید.
              </p>
            ) : (
              <div className="space-y-3">
                {data.suggestions.map((s) => (
                  <Card key={s.caregiver_user_id} className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm">{s.caregiver_name}</CardTitle>
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", CONFIDENCE_CLASS[s.match_confidence])}>
                        {CONFIDENCE_LABEL[s.match_confidence]}
                      </span>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm font-medium text-foreground">{s.explanation.summary}</p>
                      {s.explanation.strengths.length > 0 && (
                        <ul className="space-y-1 text-xs text-emerald-700">
                          {s.explanation.strengths.map((point, i) => <li key={i}>+ {point}</li>)}
                        </ul>
                      )}
                      {s.explanation.weaknesses.length > 0 && (
                        <ul className="space-y-1 text-xs text-amber-700">
                          {s.explanation.weaknesses.map((point, i) => <li key={i}>- {point}</li>)}
                        </ul>
                      )}
                      {s.mcdm_score !== null && (
                        <p className="text-[11px] text-muted-foreground" dir="ltr">score: {s.mcdm_score}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
