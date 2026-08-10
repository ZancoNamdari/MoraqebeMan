"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { patientService } from "@/services/patient.service"
import type { PatientListItem } from "@/types/patient"
import { ROUTES } from "@/lib/routes"

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    patientService.list().then(setPatients).finally(() => setLoading(false))
  }, [user])

  if (authLoading) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 via-background to-background">
      <header className="border-b border-pink-100 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌸</span>
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-rose-900">سالمندان شما</h2>
            <p className="text-sm text-muted-foreground">مدیریت اطلاعات و مراقبت سالمندان تحت نظر شما</p>
          </div>
          <Button
            className="bg-gradient-to-l from-pink-400 to-rose-400 shadow-md shadow-pink-200/50 hover:from-pink-500 hover:to-rose-500"
            onClick={() => router.push(ROUTES.newPatient)}
          >
            + افزودن سالمند
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
        ) : patients.length === 0 ? (
          <Card className="border-pink-100">
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <span className="text-3xl">🌷</span>
              <p className="text-muted-foreground">هنوز سالمندی ثبت نشده. با دکمه بالا شروع کنید.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {patients.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer border-pink-100 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-100"
                onClick={() => router.push(ROUTES.patientDetail(p.id))}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-rose-300 text-lg">
                    👤
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-rose-950">{p.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[p.province_name, p.city_name].filter(Boolean).join("، ") || "بدون آدرس ثبت‌شده"}
                    </p>
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
