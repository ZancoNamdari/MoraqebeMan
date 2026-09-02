"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { careService } from "@/services/care.service"
import { workPreferencesService } from "@/services/work_preferences.service"
import { myProfileStatusService, type MyFullProfileStatus } from "@/services/my_profile_status.service"
import type { CaregiverAssignment } from "@/types/care"
import { ROUTES } from "@/lib/routes"
import { patientAvatar } from "@/lib/constants"

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth(["caregiver"])
  const [patients, setPatients] = useState<CaregiverAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null)
  const router = useRouter()

  const [showJoinAgency, setShowJoinAgency] = useState(false)
  const [agencyCode, setAgencyCode] = useState("")
  const [joiningAgency, setJoiningAgency] = useState(false)
  const [agencyMessage, setAgencyMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null)
  const [profileStatus, setProfileStatus] = useState<MyFullProfileStatus | null>(null)

  useEffect(() => {
    if (!user) return
    careService.myPatients().then(setPatients).finally(() => setLoading(false))
    workPreferencesService.me().then((data) => setTermsAccepted(data?.terms_accepted === true))
    myProfileStatusService.get().then(setProfileStatus).catch(() => {})
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
        {profileStatus?.status === "pending" && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-sm text-blue-900">
              پروفایل شما در انتظار بررسی تیم مراقب من است. تا زمان تأیید، امکان تخصیص سالمند وجود ندارد.
            </CardContent>
          </Card>
        )}
        {profileStatus?.status === "needs_more_docs" && (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4 text-sm text-purple-900">
              <p className="font-medium">برای ادامه بررسی، مدارک تکمیلی لازم است.</p>
              {profileStatus.needs_more_docs_note && <p className="mt-1">{profileStatus.needs_more_docs_note}</p>}
              <p className="mt-1 text-xs">پس از ارسال مدارک، با تیم مراقب من تماس بگیرید تا بررسی ادامه یابد.</p>
            </CardContent>
          </Card>
        )}
        {profileStatus?.status === "rejected" && (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4 text-sm text-rose-900">
              <p className="font-medium">پروفایل شما تأیید نشد.</p>
              {profileStatus.rejection_reason && <p className="mt-1">دلیل: {profileStatus.rejection_reason}</p>}
            </CardContent>
          </Card>
        )}
        {profileStatus?.status === "suspended" && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-4 text-sm text-red-900">
              <p className="font-medium">حساب شما مسدود شده است.</p>
              {profileStatus.blacklist_reason && <p className="mt-1">دلیل: {profileStatus.blacklist_reason}</p>}
              <Button size="sm" className="mt-2 bg-red-600 hover:bg-red-700" onClick={() => router.push(ROUTES.blacklistAppeal)}>
                ثبت درخواست بازبینی
              </Button>
            </CardContent>
          </Card>
        )}
        {termsAccepted === false && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-amber-900">
                برای تکمیل و تأیید پروفایل، باید شرایط و تعهدات عضویت را شخصاً بپذیرید.
              </p>
              <Button size="sm" onClick={() => router.push(ROUTES.terms)}>
                مشاهده و تأیید شرایط
              </Button>
            </CardContent>
          </Card>
        )}
        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-rose-900">تکمیل اطلاعات هویتی</p>
            <Button size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={() => router.push(ROUTES.identity)}>
              مشاهده / ویرایش
            </Button>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-rose-900">مناطق خدماتی</p>
            <Button size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={() => router.push(ROUTES.serviceAreas)}>
              مشاهده / ویرایش
            </Button>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-rose-900">سوابق کاری</p>
            <Button size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={() => router.push(ROUTES.experience)}>
              مشاهده / ویرایش
            </Button>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-rose-900">مهارت‌ها</p>
            <Button size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={() => router.push(ROUTES.skills)}>
              مشاهده / ویرایش
            </Button>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-rose-900">یادداشت درباره سالمند</p>
            <Button size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={() => router.push(ROUTES.patientNotes)}>
              مشاهده / ثبت یادداشت
            </Button>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-rose-900">معرف‌ها (اختیاری)</p>
            <Button size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={() => router.push(ROUTES.references)}>
              مشاهده / ویرایش
            </Button>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-rose-900">پروفایل کامل من</p>
            <Button size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={() => router.push(ROUTES.myProfile)}>
              مشاهده پروفایل
            </Button>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-rose-900">تاریخچه حساب من</p>
            <Button size="sm" variant="outline" className="border-pink-200 text-rose-700 hover:bg-pink-50" onClick={() => router.push(ROUTES.history)}>
              مشاهده تاریخچه
            </Button>
          </CardContent>
        </Card>
        <Card className="border-pink-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-rose-900">عضویت در آژانس</p>
              <p className="text-xs text-muted-foreground">اگر از طریق یک شرکت یا آژانس مراقبتی فعالیت می‌کنید، با کد آژانس درخواست عضویت دهید.</p>
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
