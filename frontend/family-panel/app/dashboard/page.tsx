"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ChoiceSelect } from "@/components/forms/fields"
import { RELATION_TYPE, patientAvatar } from "@/lib/constants"
import { patientService } from "@/services/patient.service"
import { familyService } from "@/services/family.service"
import { agencyService } from "@/services/agency.service"
import type { PatientListItem } from "@/types/patient"
import type { FamilyProfile } from "@/types/family"
import { ROUTES } from "@/lib/routes"

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth(["family"])
  const router = useRouter()
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [family, setFamily] = useState<FamilyProfile | null>(null)
  const [loading, setLoading] = useState(true)

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
        {family && (
          <Card className="border-pink-100 bg-gradient-to-l from-pink-50 to-rose-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-xs text-muted-foreground">کد عضویت شما — برای دریافت دعوت از یک بیمار</p>
                <p dir="ltr" className="text-left text-lg font-bold tracking-wider text-rose-700">{family.access_code}</p>
              </div>
              <Button
                size="sm" variant="outline"
                className="border-pink-200 text-rose-700 hover:bg-pink-50"
                onClick={() => setShowConnect((v) => !v)}
              >
                {showConnect ? "بستن" : "دسترسی به بیمار با کد"}
              </Button>
            </CardContent>
            {showConnect && (
              <CardContent className="border-t border-pink-100 pt-4">
                <p className="mb-2 text-xs text-muted-foreground">کد بیماری که می‌خواهید وضعیت و مراقبت او را ببینید وارد کنید — دسترسی شما بلافاصله فعال می‌شود.</p>
                {connectMessage && (
                  <div className={`mb-2 rounded-md p-2 text-xs ${connectMessage.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
                    {connectMessage.text}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Input placeholder="کد بیمار (مثلاً ELD-7K4P9X)" className="w-48" value={patientCode} onChange={(e) => setPatientCode(e.target.value)} dir="ltr" />
                  <div className="w-32"><ChoiceSelect choices={RELATION_TYPE} value={relation} onChange={setRelation} placeholder="نسبت شما" /></div>
                  <Button size="sm" disabled={connecting || !patientCode || !relation} onClick={handleConnect}>
                    اتصال
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-rose-900">عضویت در آژانس</p>
              <p className="text-xs text-muted-foreground">اگر خدمت شما از طریق یک شرکت یا آژانس مراقبتی تأمین می‌شود، با کد آژانس درخواست عضویت دهید.</p>
            </div>
            <Button
              size="sm" variant="outline"
              className="border-pink-200 text-rose-700 hover:bg-pink-50"
              onClick={() => setShowJoinAgency((v) => !v)}
            >
              {showJoinAgency ? "بستن" : "پیوستن با کد آژانس"}
            </Button>
          </CardContent>
          {showJoinAgency && (
            <CardContent className="border-t border-pink-100 pt-4">
              {agencyMessage && (
                <div className={`mb-2 rounded-md p-2 text-xs ${agencyMessage.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
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

        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-rose-900">شکایات و بازخورد</p>
            <Button size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={() => router.push(ROUTES.complaints)}>
              مشاهده / ثبت شکایت
            </Button>
          </CardContent>
        </Card>

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
              <p className="text-muted-foreground">هنوز سالمندی ثبت نشده. با دکمه بالا شروع کنید یا با کد یک بیمار درخواست دسترسی دهید.</p>
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
                    {patientAvatar(p.gender)}
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
