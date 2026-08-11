"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { myPatientService } from "@/services/patient.service"
import type { FamilyLink, PatientProfile } from "@/types/patient"
import { ROUTES } from "@/lib/routes"

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [pending, setPending] = useState<FamilyLink[]>([])
  const [links, setLinks] = useState<FamilyLink[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [hasProfile, setHasProfile] = useState(true)

  function refresh() {
    return Promise.all([
      myPatientService.get().then((p) => { setProfile(p); setHasProfile(true) }).catch(() => setHasProfile(false)),
      myPatientService.listAccessRequests().then(setPending).catch(() => {}),
      myPatientService.listFamilyLinks().then(setLinks).catch(() => {}),
    ])
  }

  useEffect(() => {
    if (!user) return
    refresh().finally(() => setLoading(false))
  }, [user])

  if (authLoading) return null

  async function handleDecision(linkId: number, decision: "approve" | "reject") {
    setBusyId(linkId)
    try {
      await myPatientService.decideAccessRequest(linkId, decision)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 via-background to-background">
      <header className="border-b border-pink-100 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧓</span>
            <h1 className="text-base font-bold text-rose-900">مراقب من</h1>
          </div>
          <Button size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={logout}>
            خروج
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 p-4">
        {loading ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : !hasProfile ? (
          <Card className="border-pink-100">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="text-3xl">🌷</span>
              <p className="text-muted-foreground">هنوز پروفایل خود را تکمیل نکرده‌اید. برای دریافت کد اختصاصی و امکان دعوت اعضای خانواده، ابتدا اطلاعات خود را وارد کنید.</p>
              <Button
                className="bg-gradient-to-l from-pink-400 to-rose-400 shadow-md shadow-pink-200/50 hover:from-pink-500 hover:to-rose-500"
                onClick={() => router.push(ROUTES.profile)}
              >
                تکمیل پروفایل
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-pink-100 bg-gradient-to-l from-pink-50 to-rose-50">
              <CardContent className="p-4">
                <p className="text-lg font-bold text-rose-950">{profile?.full_name || "پروفایل شما"}</p>
                <p className="mt-2 text-xs text-muted-foreground">کد شما — برای دعوت اعضای خانواده به آنها بدهید</p>
                <p dir="ltr" className="text-left text-lg font-bold tracking-wider text-rose-700">{profile?.access_code}</p>
              </CardContent>
            </Card>

            {pending.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/60">
                <CardContent className="space-y-2 p-4">
                  <p className="text-sm font-semibold text-amber-900">درخواست‌های دسترسی در انتظار تأیید شما</p>
                  {pending.map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3">
                      <div>
                        <p className="text-sm font-medium">{l.family_display_name || l.family_phone_number}</p>
                        <p className="text-xs text-muted-foreground">درخواست دسترسی به عنوان «{l.relation}»</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busyId === l.id} onClick={() => handleDecision(l.id, "approve")}>تأیید</Button>
                        <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={busyId === l.id} onClick={() => handleDecision(l.id, "reject")}>رد</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3">
              <NavCard icon="📋" label="اطلاعات پروفایل" onClick={() => router.push(ROUTES.profile)} />
              <NavCard icon="💬" label="پرسشنامه سازگاری" onClick={() => router.push(ROUTES.questionnaire)} />
              <NavCard icon="👪" label={`دسترسی خانواده (${links.length})`} onClick={() => router.push(ROUTES.access)} />
              <NavCard icon="👩‍⚕️" label="تیم مراقبت" onClick={() => router.push(ROUTES.care)} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function NavCard({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <Card className="cursor-pointer border-pink-100 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-100" onClick={onClick}>
      <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
        <span className="text-2xl">{icon}</span>
        <p className="text-sm font-medium text-rose-900">{label}</p>
      </CardContent>
    </Card>
  )
}
