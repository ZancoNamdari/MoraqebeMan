"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Building2, Users, HeartHandshake, UserCog, AlertTriangle,
  ShieldQuestionMark, ClipboardList, Copy, Pencil, Check,
} from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { ROUTES } from "@/lib/routes"
import { toPersianDigits } from "@/lib/persian_digits"
import type { AgencyDashboard, AgencyProfile } from "@/types/agency"
import { Sidebar } from "@/components/layout/sidebar"

function StatCard({ icon: Icon, count, label, pendingCount, colorClass, onClick }: {
  icon: React.ElementType; count: number; label: string; pendingCount?: number; colorClass: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-2xl border border-pink-100 bg-white p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-2xl font-bold text-rose-950">{toPersianDigits(count)}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {pendingCount !== undefined && pendingCount > 0 && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          {toPersianDigits(pendingCount)} درخواست در انتظار
        </span>
      )}
    </button>
  )
}

function ActionCard({ icon: Icon, title, description, badge, onClick }: {
  icon: React.ElementType; title: string; description: string; badge?: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-start gap-3 rounded-2xl border border-pink-100 bg-white p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-rose-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-rose-900">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-2 -left-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">
          {toPersianDigits(badge)}
        </span>
      )}
    </button>
  )
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth(["agency", "agency_supervisor"])
  const router = useRouter()

  const [profile, setProfile] = useState<AgencyProfile | null>(null)
  const [dashboard, setDashboard] = useState<AgencyDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  function refresh() {
    return Promise.all([agencyService.me(), agencyService.dashboard()]).then(([p, d]) => {
      setProfile(p)
      setDashboard(d)
      setCompanyName(p.company_name)
      setLicenseNumber(p.license_number)
    })
  }

  useEffect(() => {
    if (!user) return
    refresh().finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  async function handleSaveProfile() {
    setSaving(true)
    try {
      await agencyService.updateProfile({ company_name: companyName, license_number: licenseNumber })
      await refresh()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCopyCode() {
    if (!profile) return
    navigator.clipboard.writeText(profile.access_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const needsAttentionCount = dashboard
    ? dashboard.open_complaints_count + dashboard.pending_appeals_count + dashboard.candidates_needing_docs_count
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background">
      <Sidebar onLogout={logout} isOwner={user.role === "agency"} />

      <div className="sm:mr-64">
        <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
          <div className="flex items-center justify-between p-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-sm font-bold text-rose-900">{profile?.company_name || "پنل آژانس"}</h1>
                <p className="text-[11px] text-muted-foreground">مراقب من — پنل آژانس</p>
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-5 p-4 sm:p-6">
          {loading || !profile || !dashboard ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              {needsAttentionCount > 0 && (
                <Card className="border-amber-300 bg-amber-50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" />
                    <p className="text-sm text-amber-900">
                      <span className="font-bold">{toPersianDigits(needsAttentionCount)} مورد</span> نیاز به رسیدگی دارد —
                      شامل شکایات باز، درخواست‌های بازبینی، و کاندیداهای در انتظار مدارک.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={HeartHandshake} count={dashboard.approved_family_count} label="خانواده عضو"
                  pendingCount={dashboard.pending_family_requests}
                  colorClass="bg-rose-50 text-rose-700"
                  onClick={() => router.push(ROUTES.families)}
                />
                <StatCard
                  icon={Users} count={dashboard.approved_caregiver_count} label="مراقب عضو"
                  pendingCount={dashboard.pending_caregiver_requests}
                  colorClass="bg-pink-50 text-pink-700"
                  onClick={() => router.push(ROUTES.caregivers)}
                />
              </div>

              <Card className="border-pink-100">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base text-rose-900">اطلاعات آژانس</CardTitle>
                  {!editing && (
                    <Button variant="outline" size="sm" className="gap-1.5 border-pink-200 text-rose-700 hover:bg-pink-50" onClick={() => setEditing(true)}>
                      <Pencil className="h-3.5 w-3.5" /> ویرایش
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {editing ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="company_name">نام شرکت/آژانس</Label>
                        <Input id="company_name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="license_number">شماره مجوز فعالیت</Label>
                        <Input id="license_number" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={saving} onClick={handleSaveProfile}>
                          {saving ? "در حال ذخیره..." : "ذخیره"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>انصراف</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm"><span className="text-muted-foreground">نام شرکت: </span>{profile.company_name || "—"}</p>
                      <p className="text-sm"><span className="text-muted-foreground">شماره مجوز: </span>{profile.license_number ? toPersianDigits(profile.license_number) : "—"}</p>
                    </>
                  )}

                  <div className="flex items-center justify-between rounded-xl bg-gradient-to-l from-pink-50 to-rose-50 p-3">
                    <div>
                      <p className="text-xs text-muted-foreground">کد عضویت آژانس</p>
                      <p dir="ltr" className="text-left text-lg font-bold tracking-wider text-rose-700">{profile.access_code}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 border-pink-200 bg-white text-rose-700 hover:bg-pink-50" onClick={handleCopyCode}>
                      {copied ? <><Check className="h-3.5 w-3.5" /> کپی شد</> : <><Copy className="h-3.5 w-3.5" /> کپی</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h2 className="mb-2 px-1 text-sm font-semibold text-rose-900">افراد</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ActionCard
                    icon={HeartHandshake} title="سالمندها" description="افزودن سالمند و یافتن مراقب مناسب"
                    onClick={() => router.push(ROUTES.patients)}
                  />
                  {user.role === "agency" && (
                    <ActionCard
                      icon={UserCog} title="سوپروایزرها" description="افزودن کارشناس برای ثبت اطلاعات"
                      onClick={() => router.push(ROUTES.supervisors)}
                    />
                  )}
                </div>
              </div>

              <div>
                <h2 className="mb-2 px-1 text-sm font-semibold text-rose-900">رسیدگی و بررسی</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ActionCard
                    icon={AlertTriangle} title="شکایات" description="مشاهده شکایات درباره مراقبان شما"
                    badge={dashboard.open_complaints_count}
                    onClick={() => router.push(ROUTES.complaints)}
                  />
                  <ActionCard
                    icon={ShieldQuestionMark} title="درخواست‌های بازبینی مسدودیت" description="بررسی درخواست رفع مسدودیت مراقبان شما"
                    badge={dashboard.pending_appeals_count}
                    onClick={() => router.push(ROUTES.blacklistAppeals)}
                  />
                  <ActionCard
                    icon={ClipboardList} title="بانک اطلاعات مراقبان" description="پیگیری مصاحبه و وضعیت کاندیداها"
                    badge={dashboard.candidates_needing_docs_count}
                    onClick={() => router.push(ROUTES.candidates)}
                  />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
