"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { BottomNav } from "@/components/layout/bottom-nav"
import { Building2, KeyRound, MessageSquareWarning, UserPlus, UsersRound, Copy, Check, ChevronLeft, Heart, LogOut } from "lucide-react"
import { ChoiceSelect } from "@/components/forms/fields"
import { RELATION_TYPE } from "@/lib/constants"
import { patientService } from "@/services/patient.service"
import { familyService } from "@/services/family.service"
import { agencyService } from "@/services/agency.service"
import type { PatientListItem } from "@/types/patient"
import type { FamilyProfile } from "@/types/family"
import { serviceLabel, subtypeLabel } from "@/lib/services"
import { jalaliAge } from "@/lib/jalali"
import { ROUTES } from "@/lib/routes"

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth(["family"])
  const router = useRouter()
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [family, setFamily] = useState<FamilyProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [copied, setCopied] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [patientCode, setPatientCode] = useState("")
  const [relation, setRelation] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [connectMessage, setConnectMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null)

  const [showJoinAgency, setShowJoinAgency] = useState(false)
  const [agencyCode, setAgencyCode] = useState("")
  const [joiningAgency, setJoiningAgency] = useState(false)
  const [agencyMessage, setAgencyMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      patientService.list(),
      familyService.me().catch(() => familyService.update({ display_name: user.username })),
    ]).then(([p, f]) => { setPatients(p); setFamily(f) }).finally(() => setLoading(false))
  }, [user])

  if (authLoading) return null

  async function handleConnect() {
    setConnecting(true); setConnectMessage(null)
    try {
      const result = await patientService.connect(patientCode.trim().toUpperCase(), relation)
      setConnectMessage({ kind: "success", text: result.detail })
      setPatientCode(""); setRelation("")
    } catch (err: any) {
      setConnectMessage({ kind: "error", text: err?.response?.data?.detail || "کد بیمار معتبر نیست." })
    } finally {
      setConnecting(false)
    }
  }

  async function handleJoinAgency() {
    setJoiningAgency(true); setAgencyMessage(null)
    try {
      await agencyService.joinAsFamily(agencyCode.trim().toUpperCase())
      setAgencyMessage({ kind: "success", text: "درخواست شما ثبت شد — پس از تأیید آژانس، به لیست عضوهای آن اضافه می‌شوید." })
      setAgencyCode("")
    } catch (err: any) {
      setAgencyMessage({ kind: "error", text: err?.response?.data?.detail || "کد آژانس معتبر نیست." })
    } finally {
      setJoiningAgency(false)
    }
  }

  const tile = "flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
  const tileIcon = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary-strong"
  const todayParts = Object.fromEntries(
    new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      .formatToParts(new Date()).map((x) => [x.type, x.value])
  ) as Record<string, string>
  const today = `${todayParts.weekday}، ${todayParts.day} ${todayParts.month} ${todayParts.year}`
  const withCaregiver = patients.filter((p) => p.assigned_caregivers && p.assigned_caregivers.length > 0).length
  const withoutCaregiver = patients.length - withCaregiver
  const stat = "flex-1 text-center"

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      <AppHeader tall subtitle={today} title={`سلام، ${family?.display_name || user?.username || ""}`}>
        <Button size="sm" variant="ghost" className="bg-white/55 text-[#8A3B3B] hover:bg-white/80" onClick={logout} aria-label="خروج">
          <LogOut className="h-4 w-4" aria-hidden="true" /> خروج
        </Button>
      </AppHeader>

      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-4">
        {/* خلاصه‌ی وضعیت — روی سربرگ می‌نشیند */}
        <section aria-label="خلاصه‌ی وضعیت" className="-mt-10 rounded-3xl border border-border bg-white p-4 shadow-[0_6px_20px_rgba(138,59,59,0.14)]">
          {loading ? (
            <Skeleton className="h-14 w-full rounded-2xl" />
          ) : (
            <div className="flex items-stretch divide-x divide-x-reverse divide-border">
              <div className={stat}><p className="text-2xl font-extrabold">{patients.length.toLocaleString("fa-IR")}</p><p className="text-xs text-muted-foreground">خدمت‌گیرنده</p></div>
              <div className={stat}><p className="text-2xl font-extrabold text-emerald-700">{withCaregiver.toLocaleString("fa-IR")}</p><p className="text-xs text-muted-foreground">دارای مراقب</p></div>
              <div className={stat}><p className={`text-2xl font-extrabold ${withoutCaregiver ? "text-amber-700" : ""}`}>{withoutCaregiver.toLocaleString("fa-IR")}</p><p className="text-xs text-muted-foreground">بدون مراقب</p></div>
            </div>
          )}
        </section>

        {/* خدمت‌گیرندگان — مهم‌ترین بخش، اول صفحه */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">خدمت‌گیرندگان شما</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? "در حال بارگذاری…" : patients.length ? `${patients.length} خدمت‌گیرنده تحت نظر شما` : "برای هر نفر، نوع خدمت مورد نیاز را ثبت کنید"}
              </p>
            </div>
            <Button className="rounded-xl" onClick={() => router.push(ROUTES.newPatient)}>
              <UserPlus className="h-4 w-4" aria-hidden="true" /> افزودن
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">{[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
          ) : patients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary-strong"><Heart className="h-7 w-7" aria-hidden="true" /></span>
                <p className="text-muted-foreground">هنوز خدمت‌گیرنده‌ای ثبت نشده. خدمت‌گیرنده‌ی جدید اضافه کنید یا با کد یک بیمار درخواست دسترسی دهید.</p>
                <Button onClick={() => router.push(ROUTES.newPatient)}>افزودن اولین خدمت‌گیرنده</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(ROUTES.patientDetail(p.id))}
                  className="flex items-center gap-3 rounded-3xl border border-border bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F6C9C4] text-lg font-extrabold text-[#8A3B3B]" aria-hidden="true">
                    {(p.full_name || "؟").trim().charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {p.full_name}
                      {jalaliAge(p.birth_date) !== null && (
                        <span className="mr-1.5 text-xs font-normal text-muted-foreground">{jalaliAge(p.birth_date)!.toLocaleString("fa-IR")} ساله</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[p.province_name, p.city_name].filter(Boolean).join("، ") || "بدون آدرس ثبت‌شده"}
                    </p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${p.service_type ? "bg-accent text-secondary-foreground" : "bg-amber-50 text-amber-800"}`}>
                      {p.service_type ? [serviceLabel(p.service_type), subtypeLabel(p.service_type, p.service_subtype)].filter(Boolean).join(" · ") : "نوع خدمت مشخص نشده"}
                    </span>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {p.assigned_caregivers && p.assigned_caregivers.length > 0
                        ? `مراقب: ${p.assigned_caregivers.map((c) => c.name).join("، ")}`
                        : "هنوز مراقبی تخصیص داده نشده"}
                    </p>
                  </div>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* دسترسی‌های سریع */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="دسترسی‌های سریع">
          <button className={tile} onClick={() => router.push(ROUTES.caregivers)}>
            <span className={tileIcon}><UsersRound className="h-5 w-5" /></span>
            <span><span className="block text-sm font-bold">مراقبان تأییدشده</span><span className="block text-xs text-muted-foreground">پروفایل، مهارت‌ها و نظر خانواده‌ها</span></span>
          </button>
          <button className={tile} onClick={() => router.push(ROUTES.complaints)}>
            <span className={tileIcon}><MessageSquareWarning className="h-5 w-5" /></span>
            <span><span className="block text-sm font-bold">شکایات و بازخورد</span><span className="block text-xs text-muted-foreground">مشاهده یا ثبت شکایت</span></span>
          </button>
          <button className={tile} onClick={() => { setShowConnect((v) => !v); setShowJoinAgency(false) }}>
            <span className={tileIcon}><KeyRound className="h-5 w-5" /></span>
            <span><span className="block text-sm font-bold">دسترسی به بیمار با کد</span><span className="block text-xs text-muted-foreground">وضعیت و مراقبت یک بیمار را ببینید</span></span>
          </button>
          <button className={tile} onClick={() => { setShowJoinAgency((v) => !v); setShowConnect(false) }}>
            <span className={tileIcon}><Building2 className="h-5 w-5" /></span>
            <span><span className="block text-sm font-bold">عضویت در آژانس</span><span className="block text-xs text-muted-foreground">با کد آژانس درخواست عضویت دهید</span></span>
          </button>
        </section>

        {showConnect && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs text-muted-foreground">کد بیماری که می‌خواهید وضعیت و مراقبت او را ببینید وارد کنید — دسترسی شما بلافاصله فعال می‌شود.</p>
              {connectMessage && (
                <div className={`rounded-md p-2 text-xs ${connectMessage.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{connectMessage.text}</div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Input placeholder="کد بیمار (مثلاً ELD-7K4P9X)" className="w-48" value={patientCode} onChange={(e) => setPatientCode(e.target.value)} dir="ltr" />
                <div className="w-32"><ChoiceSelect choices={RELATION_TYPE} value={relation} onChange={setRelation} placeholder="نسبت شما" /></div>
                <Button size="sm" disabled={connecting || !patientCode || !relation} onClick={handleConnect}>اتصال</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showJoinAgency && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs text-muted-foreground">اگر خدمت شما از طریق یک شرکت یا آژانس مراقبتی تأمین می‌شود، با کد آژانس درخواست عضویت دهید.</p>
              {agencyMessage && (
                <div className={`rounded-md p-2 text-xs ${agencyMessage.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{agencyMessage.text}</div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Input placeholder="کد آژانس (مثلاً AGN-92K7XQ)" className="w-48" value={agencyCode} onChange={(e) => setAgencyCode(e.target.value)} dir="ltr" />
                <Button size="sm" disabled={joiningAgency || !agencyCode} onClick={handleJoinAgency}>ارسال درخواست</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {family && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-accent/60 p-4">
            <div>
              <p className="text-xs text-muted-foreground">کد عضویت شما — برای دریافت دعوت از یک بیمار</p>
              <p dir="ltr" className="text-left text-lg font-bold tracking-wider text-primary-strong">{family.access_code}</p>
            </div>
            <Button
              size="sm" variant="outline" className="bg-white"
              onClick={() => { navigator.clipboard?.writeText(family.access_code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            >
              {copied ? <><Check className="ml-1.5 h-4 w-4" /> کپی شد</> : <><Copy className="ml-1.5 h-4 w-4" /> کپی کد</>}
            </Button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
