"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { myPatientService } from "@/services/patient.service"
import type { FamilyLink, PatientProfile } from "@/types/patient"
import { ROUTES } from "@/lib/routes"

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth(["patient"])
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
    <div className="min-h-screen bg-gradient-to-b from-secondary/60 via-background to-background">
      <AppHeader title="مراقب من" maxWidth="max-w-2xl">
        <Button size="sm" variant="outline" className="border-border text-primary-strong hover:bg-secondary" onClick={logout}>
          خروج
        </Button>
      </AppHeader>

      <main className="mx-auto max-w-2xl space-y-5 p-4">
        {loading ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : !hasProfile ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="text-3xl">🌷</span>
              <p className="text-muted-foreground">هنوز پروفایل خود را تکمیل نکرده‌اید. برای دریافت کد اختصاصی و امکان دعوت اعضای خانواده، ابتدا اطلاعات خود را وارد کنید.</p>
              <Button
                className="bg-gradient-to-l from-primary to-primary shadow-md shadow-primary/15 hover:from-primary hover:to-primary"
                onClick={() => router.push(ROUTES.profile)}
              >
                تکمیل پروفایل
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-border bg-gradient-to-l from-secondary to-secondary">
              <CardContent className="p-4">
                <p className="text-lg font-bold text-foreground">{profile?.full_name || "پروفایل شما"}</p>
                <p className="mt-2 text-xs text-muted-foreground">کد شما — برای دعوت اعضای خانواده به آنها بدهید</p>
                <p dir="ltr" className="text-left text-lg font-bold tracking-wider text-primary-strong">{profile?.access_code}</p>
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
                        <Button size="sm" variant="outline" className="border-border text-primary-strong hover:bg-secondary" disabled={busyId === l.id} onClick={() => handleDecision(l.id, "reject")}>رد</Button>
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
    <Card className="cursor-pointer border-border transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10" onClick={onClick}>
      <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
        <span className="text-2xl">{icon}</span>
        <p className="text-sm font-medium text-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
