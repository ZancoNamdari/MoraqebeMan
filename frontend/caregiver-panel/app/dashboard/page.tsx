"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { agencyService } from "@/services/agency.service"
import { careService } from "@/services/care.service"
import type { CaregiverAssignment } from "@/types/care"
import { ROUTES } from "@/lib/routes"
import { patientAvatar } from "@/lib/constants"

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth(["caregiver"])
  const [patients, setPatients] = useState<CaregiverAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [showJoinAgency, setShowJoinAgency] = useState(false)
  const [agencyCode, setAgencyCode] = useState("")
  const [joiningAgency, setJoiningAgency] = useState(false)
  const [agencyMessage, setAgencyMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    careService.myPatients().then(setPatients).finally(() => setLoading(false))
  }, [user])

  if (authLoading) return null

  async function handleJoinAgency() {
    setJoiningAgency(true); setAgencyMessage(null)
    try {
      await agencyService.joinAsCaregiver(agencyCode.trim().toUpperCase())
      setAgencyMessage({ kind: "success", text: "درخواست شما ثبت شد — پس از تأیید آژانس، به استخر مراقبان آن اضافه می‌شوید." })
      setAgencyCode("")
    } catch (err: any) {
      setAgencyMessage({ kind: "error", text: err?.response?.data?.detail || "کد آژانس معتبر نیست." })
    } finally {
      setJoiningAgency(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/60 via-background to-background">
      <AppHeader title="مراقب من">
        {user && <span className="text-sm text-muted-foreground">سلام، {user.username}</span>}
        <Button size="sm" variant="outline" className="border-border text-primary-strong hover:bg-secondary" onClick={logout}>
          خروج
        </Button>
      </AppHeader>

      <main className="mx-auto max-w-3xl space-y-5 p-4">
        <Card className="border-border">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">عضویت در آژانس</p>
              <p className="text-xs text-muted-foreground">اگر از طریق یک شرکت یا آژانس مراقبتی فعالیت می‌کنید، با کد آژانس درخواست عضویت دهید.</p>
            </div>
            <Button
              size="sm" variant="outline"
              className="border-border text-primary-strong hover:bg-secondary"
              onClick={() => setShowJoinAgency((v) => !v)}
            >
              {showJoinAgency ? "بستن" : "پیوستن با کد آژانس"}
            </Button>
          </CardContent>
          {showJoinAgency && (
            <CardContent className="border-t border-border pt-4">
              {agencyMessage && (
                <div className={`mb-2 rounded-md p-2 text-xs ${agencyMessage.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-destructive/10 text-destructive"}`}>
                  {agencyMessage.text}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Input placeholder="کد آژانس (مثلاً AGN-92K7XQ)" className="w-48" value={agencyCode} onChange={(e) => setAgencyCode(e.target.value)} dir="ltr" />
                <Button size="sm" disabled={joiningAgency || !agencyCode} onClick={handleJoinAgency}>
                  ارسال درخواست
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        <div>
          <h2 className="text-xl font-bold text-foreground">بیماران تحت مراقبت شما</h2>
          <p className="text-sm text-muted-foreground">برای ثبت گزارش مراقبت روی هر بیمار کلیک کنید</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          </div>
        ) : patients.length === 0 ? (
          <Card className="border-border">
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
                className="cursor-pointer border-border transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
                onClick={() => router.push(ROUTES.patientDetail(a.patient))}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary/70 text-lg">
                    {patientAvatar(a.patient_gender)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{a.patient_name}</p>
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
