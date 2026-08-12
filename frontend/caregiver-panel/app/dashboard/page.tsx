"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { careService } from "@/services/care.service"
import type { CaregiverAssignment } from "@/types/care"
import { ROUTES } from "@/lib/routes"
import { patientAvatar } from "@/lib/constants"

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const [patients, setPatients] = useState<CaregiverAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    careService.myPatients().then(setPatients).finally(() => setLoading(false))
  }, [user])

  if (authLoading) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 via-background to-background">
      <header className="border-b border-pink-100 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">👩‍⚕️</span>
            <h1 className="text-base font-bold text-rose-900">مراقب من</h1>
          </div>
          <div className="flex items-center gap-3">
            {user && <span className="text-sm text-muted-foreground">سلام، {user.username}</span>}
            <Button size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={logout}>
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 p-4">
        <div>
          <h2 className="text-xl font-bold text-rose-900">بیماران تحت مراقبت شما</h2>
          <p className="text-sm text-muted-foreground">برای ثبت گزارش مراقبت روی هر بیمار کلیک کنید</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          </div>
        ) : patients.length === 0 ? (
          <Card className="border-pink-100">
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <span className="text-3xl">🌷</span>
              <p className="text-muted-foreground">در حال حاضر هیچ بیماری به شما تخصیص داده نشده است.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {patients.map((a) => (
              <Card
                key={a.id}
                className="cursor-pointer border-pink-100 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-100"
                onClick={() => router.push(ROUTES.patientDetail(a.patient))}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-rose-300 text-lg">
                    {patientAvatar(a.patient_gender)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-rose-950">{a.patient_name}</p>
                    <p className="truncate text-xs text-muted-foreground">از تاریخ {a.assigned_at.slice(0, 10)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
