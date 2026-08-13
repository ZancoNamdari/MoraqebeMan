"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { myPatientService } from "@/services/patient.service"
import { careService } from "@/services/care.service"
import { CARE_LOG_CATEGORY_LABEL, CARE_LOG_CATEGORY_ICON, caregiverAvatar } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import type { CaregiverAssignment, CareLogEntry } from "@/types/care"

export default function CarePage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [team, setTeam] = useState<CaregiverAssignment[]>([])
  const [timeline, setTimeline] = useState<CareLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    myPatientService.get()
      .then((profile) => Promise.all([careService.team(profile.id), careService.timeline(profile.id)]))
      .then(([t, tl]) => { setTeam(t); setTimeline(tl) })
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b border-pink-100 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">تیم مراقبت</h1>
          <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
              <Button variant="ghost" size="sm" className="text-rose-600" onClick={logout}>خروج</Button>
            </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <>
            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-rose-900">مراقبان فعلی</CardTitle></CardHeader>
              <CardContent>
                {team.length === 0 ? (
                  <p className="text-sm text-muted-foreground">در حال حاضر مراقبی برای شما تخصیص داده نشده است.</p>
                ) : (
                  <div className="space-y-2">
                    {team.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 rounded-lg border border-pink-100 bg-pink-50/50 p-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-rose-300 text-sm">{caregiverAvatar(a.caregiver_gender)}</div>
                        <div>
                          <p className="text-sm font-medium">{a.caregiver_name}</p>
                          <p className="text-xs text-muted-foreground">از تاریخ {a.assigned_at.slice(0, 10)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-rose-900">جدول زمانی مراقبت</CardTitle></CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">هنوز گزارشی ثبت نشده است.</p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((entry) => (
                      <div key={entry.id} className="flex gap-3 border-r-2 border-pink-200 pr-3">
                        <span className="text-lg leading-none">{CARE_LOG_CATEGORY_ICON[entry.category] || "📝"}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-rose-700">{CARE_LOG_CATEGORY_LABEL[entry.category] || entry.category}</p>
                            <p className="text-xs text-muted-foreground">{entry.created_at.slice(0, 16).replace("T", " — ")}</p>
                          </div>
                          <p className="text-sm">{entry.note}</p>
                          <p className="text-xs text-muted-foreground">توسط {entry.caregiver_name}</p>
                        </div>
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
