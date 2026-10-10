"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Check, ChevronLeft, ClipboardList, Copy, Heart, LogOut, MessageCircle, Search } from "lucide-react"
import { careService } from "@/services/care.service"
import type { CaregiverAssignment } from "@/types/care"
import { myPatientService } from "@/services/patient.service"
import type { FamilyLink, PatientProfile } from "@/types/patient"
import { serviceLabel, subtypeLabel } from "@/lib/services"
import { ROUTES } from "@/lib/routes"

const faDigits = (v: string) => v.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth(["patient"])
  const router = useRouter()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [pending, setPending] = useState<FamilyLink[]>([])
  const [links, setLinks] = useState<FamilyLink[]>([])
  const [team, setTeam] = useState<CaregiverAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const [hasProfile, setHasProfile] = useState(true)

  function refresh() {
    return Promise.all([
      myPatientService.get()
        .then((p) => {
          setProfile(p); setHasProfile(true)
          return careService.team(p.id).then(setTeam).catch(() => {})
        })
        .catch(() => setHasProfile(false)),
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

  const todayParts = Object.fromEntries(
    new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long" })
      .formatToParts(new Date()).map((x) => [x.type, x.value])
  ) as Record<string, string>
  const today = `${todayParts.weekday}، ${todayParts.day} ${todayParts.month}`
  const activeCaregiver = team.find((a) => a.status === "active") ?? null

  const row = "flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-white p-4 text-right shadow-sm transition hover:shadow-md"
  const rowIcon = "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary-strong"

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      <AppHeader title={`سلام، ${profile?.full_name?.trim().split(/\s+/)[0] || user?.username || ""}`} subtitle={today} maxWidth="max-w-2xl">
        <Button size="sm" variant="ghost" className="bg-white/70 text-[#1F5C42] hover:bg-white" onClick={logout} aria-label="خروج">
          <LogOut className="h-4 w-4" aria-hidden="true" /> خروج
        </Button>
      </AppHeader>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-40 w-full rounded-3xl" />
        ) : !hasProfile ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary-strong"><Heart className="h-7 w-7" aria-hidden="true" /></span>
              <p className="text-muted-foreground">هنوز پروفایل خود را تکمیل نکرده‌اید. برای دریافت کد اختصاصی و امکان دعوت اعضای خانواده، ابتدا اطلاعات خود را وارد کنید.</p>
              <Button size="lg" onClick={() => router.push(ROUTES.profile)}>تکمیل پروفایل</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* مراقب امروز */}
            <section aria-label="مراقب شما" className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">مراقب شما</p>
              {activeCaregiver ? (
                <>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-white" aria-hidden="true">
                      {activeCaregiver.caregiver_name.trim().charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-xl font-extrabold">{activeCaregiver.caregiver_name}</p>
                      <p className="text-sm text-muted-foreground">از {faDigits(activeCaregiver.assigned_at.slice(0, 10).replace(/-/g, "/"))}</p>
                    </div>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#DCEFE4] px-3 py-1 text-sm font-semibold text-[#1F6B4D]">
                    <span className="h-2 w-2 rounded-full bg-[#2F7D5B]" aria-hidden="true" /> در خدمت
                  </span>
                  <Button size="lg" className="mt-4 w-full rounded-2xl text-lg font-extrabold" onClick={() => router.push(ROUTES.care)}>
                    <MessageCircle className="h-5 w-5" aria-hidden="true" /> تیم مراقبت و گزارش‌ها
                  </Button>
                </>
              ) : (
                <p className="mt-2 text-lg">هنوز مراقبی برای شما تخصیص داده نشده است.</p>
              )}
            </section>

            {pending.length > 0 && (
              <section aria-label="درخواست‌های دسترسی" className="rounded-3xl border-2 border-[#E8BE62] bg-[#FFF4DC] p-4">
                <p className="text-lg font-extrabold text-[#6B4A00]">
                  {pending.length === 1 ? "یک درخواست منتظر شماست" : `${pending.length.toLocaleString("fa-IR")} درخواست منتظر شماست`}
                </p>
                <div className="mt-2 space-y-3">
                  {pending.map((l) => (
                    <div key={l.id} className="rounded-2xl bg-white p-3">
                      <p className="font-semibold">{l.family_display_name || l.family_phone_number}</p>
                      <p className="text-sm text-muted-foreground">می‌خواهد به عنوان «{l.relation}» به اطلاعات شما دسترسی داشته باشد.</p>
                      <div className="mt-3 flex gap-2">
                        <Button size="lg" className="flex-1 rounded-2xl text-lg font-extrabold" disabled={busyId === l.id} onClick={() => handleDecision(l.id, "approve")}>تأیید</Button>
                        <Button size="lg" variant="outline" className="flex-1 rounded-2xl border-2 border-[#7A5A1E] text-lg font-extrabold text-[#6B4A00] hover:bg-[#FFF4DC]" disabled={busyId === l.id} onClick={() => handleDecision(l.id, "reject")}>رد</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* کد اختصاصی */}
            <section aria-label="کد شما" className="flex items-center gap-3 rounded-3xl border border-border bg-white p-4 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">کد شما برای دعوت خانواده</p>
                <p dir="ltr" className="whitespace-nowrap text-right text-xl font-extrabold tracking-wide text-primary">{profile?.access_code}</p>
              </div>
              <Button
                variant="outline" className="shrink-0 rounded-2xl border-2 border-primary text-primary-strong"
                onClick={() => { navigator.clipboard?.writeText(profile?.access_code || ""); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
              >
                {copied ? <><Check className="h-4 w-4" aria-hidden="true" /> کپی شد</> : <><Copy className="h-4 w-4" aria-hidden="true" /> کپی</>}
              </Button>
            </section>

            {/* دسترسی‌ها */}
            <section aria-label="دسترسی‌ها" className="space-y-2">
              <button className={row} onClick={() => router.push(ROUTES.profile)}>
                <span className={rowIcon}><ClipboardList className="h-5 w-5" aria-hidden="true" /></span>
                <span className="flex-1 font-semibold">اطلاعات پروفایل</span>
                <ChevronLeft className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </button>
              <button className={row} onClick={() => router.push(ROUTES.questionnaire)}>
                <span className={rowIcon}><MessageCircle className="h-5 w-5" aria-hidden="true" /></span>
                <span className="flex-1 font-semibold">پرسشنامه سازگاری</span>
                <ChevronLeft className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </button>
              <button className={row} onClick={() => router.push(ROUTES.access)}>
                <span className={rowIcon}><Heart className="h-5 w-5" aria-hidden="true" /></span>
                <span className="flex-1 font-semibold">دسترسی خانواده ({links.length.toLocaleString("fa-IR")})</span>
                <ChevronLeft className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </button>
              <button className={row} onClick={() => router.push(ROUTES.caregivers)}>
                <span className={rowIcon}><Search className="h-5 w-5" aria-hidden="true" /></span>
                <span className="flex-1 font-semibold">مشاهده‌ی مراقبان</span>
                <ChevronLeft className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </button>
            </section>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
