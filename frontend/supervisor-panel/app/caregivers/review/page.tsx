"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { caregiverService } from "@/services/caregiver.service"
import { ROUTES } from "@/lib/routes"
import * as C from "@/lib/constants"
import { labelForValue, labelsForValues, yesNoLabel } from "@/lib/constants"
import type { FullCaregiverProfile } from "@/types/caregiver"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس", pending: "در انتظار بررسی", approved: "تأیید شده",
  rejected: "رد شده", suspended: "تعلیق شده",
}
const STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700", pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800", rejected: "bg-rose-100 text-rose-800",
  suspended: "bg-orange-100 text-orange-800",
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-left font-medium text-slate-800" dir="auto">{value || "—"}</span>
    </div>
  )
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-rose-900">
          <span className="text-lg">{icon}</span> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewPageInner />
    </Suspense>
  )
}

function ReviewPageInner() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = Number(searchParams.get("id"))

  const [profile, setProfile] = useState<FullCaregiverProfile | null>(null)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      caregiverService.fullProfile(id),
      caregiverService.getBasicInfo(id),
    ]).then(([full, basic]) => {
      setProfile(full)
      setName(`${basic.first_name} ${basic.last_name}`.trim())
    }).finally(() => setLoading(false))
  }, [id])

  if (authLoading || !user) return null

  async function handleApprove() {
    setBusy(true); setMessage(null)
    try {
      await caregiverService.approve(id)
      const full = await caregiverService.fullProfile(id)
      setProfile(full)
      setMessage({ kind: "success", text: "پروفایل با موفقیت تأیید شد." })
    } catch (err: any) {
      const missing = err?.response?.data?.missing as string[] | undefined
      setMessage({
        kind: "error",
        text: missing?.length
          ? `پروفایل ناقص است: ${missing.join("، ")}`
          : "تأیید با خطا مواجه شد.",
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    setBusy(true); setMessage(null)
    try {
      await caregiverService.reject(id, rejectReason)
      const full = await caregiverService.fullProfile(id)
      setProfile(full)
      setShowRejectBox(false)
      setMessage({ kind: "success", text: "پروفایل رد شد." })
    } catch {
      setMessage({ kind: "error", text: "رد کردن با خطا مواجه شد." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <div>
            <h1 className="font-bold">بررسی پروفایل — {name || "..."}</h1>
            {profile && (
              <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLASS[profile.status])}>
                {STATUS_LABEL[profile.status] || profile.status}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`${ROUTES.newCaregiver}?id=${id}`)}>ویرایش</Button>
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت به لیست</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {message && (
          <div className={cn(
            "rounded-lg border p-3 text-sm font-medium",
            message.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
          )}>
            {message.text}
          </div>
        )}

        {loading || !profile ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : (
          <>
            {profile.status === "rejected" && profile.rejection_reason && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <strong>دلیل رد شدن:</strong> {profile.rejection_reason}
              </div>
            )}

            <Section icon="🪪" title="اطلاعات هویتی">
              {profile.identity ? (
                <div>
                  <InfoRow label="نام پدر" value={profile.identity.father_name} />
                  <InfoRow label="جنسیت" value={labelForValue(C.GENDER, profile.identity.gender)} />
                  <InfoRow label="وضعیت تأهل" value={labelForValue(C.MARITAL_STATUS, profile.identity.marital_status)} />
                  <InfoRow label="تاریخ تولد" value={profile.identity.birth_date} />
                  <InfoRow label="بیماری زمینه‌ای" value={yesNoLabel(profile.identity.has_chronic_disease)} />
                  <InfoRow label="شماره تماس اضطراری" value={profile.identity.emergency_contact_phone} />
                  <InfoRow label="نشانی" value={profile.identity.full_address} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">این فرم هنوز تکمیل نشده.</p>
              )}
            </Section>

            <Section icon="💼" title="شرایط همکاری">
              {profile.work_preferences ? (
                <div>
                  <InfoRow label="نوع همکاری" value={labelsForValues(C.COLLABORATION_TYPE, profile.work_preferences.collaboration_types)} />
                  <InfoRow label="وضعیت کاری" value={labelForValue(C.WORK_STATUS, profile.work_preferences.work_status)} />
                  <InfoRow label="خدمات قابل ارائه" value={labelsForValues(C.OFFERED_SERVICE, profile.work_preferences.offered_services)} />
                  <InfoRow label="روزهای کاری" value={labelsForValues(C.WEEKDAY, profile.work_preferences.available_days)} />
                  <InfoRow label="شیفت‌ها" value={labelsForValues(C.SHIFT, profile.work_preferences.available_shifts)} />
                  <InfoRow label="پذیرش قوانین" value={yesNoLabel(profile.work_preferences.terms_accepted)} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">این فرم هنوز تکمیل نشده.</p>
              )}
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">مناطق خدماتی</p>
                {profile.service_areas.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {profile.service_areas.map((a, i) => (
                      <li key={a.id ?? i}>
                        {[a.province_name, a.city_name, a.district_name].filter(Boolean).join(" / ") || "—"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">هیچ منطقه‌ای ثبت نشده.</p>
                )}
              </div>
            </Section>

            <Section icon="🎓" title="سوابق کاری و مهارت‌ها">
              {profile.experience ? (
                <div>
                  <InfoRow label="سابقه مراقبت سالمند" value={labelForValue(C.EXPERIENCE_RANGE, profile.experience.elderly_care_experience)} />
                  <InfoRow label="تعداد سالمندان" value={labelForValue(C.PATIENTS_CARED_FOR_COUNT, profile.experience.patients_cared_for_count)} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">سوابق کاری هنوز تکمیل نشده.</p>
              )}
              {profile.skills ? (
                <div className="mt-2">
                  <InfoRow label="سطح تحصیلات" value={labelForValue(C.EDUCATION_LEVEL, profile.skills.education_level)} />
                  <InfoRow label="مهارت‌های مراقبتی" value={labelsForValues(C.CAREGIVING_SKILL, profile.skills.caregiving_skills)} />
                  <InfoRow label="گواهینامه رانندگی" value={yesNoLabel(profile.skills.has_driving_license)} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">مهارت‌ها هنوز تکمیل نشده.</p>
              )}
            </Section>

            <Section icon="📇" title={`معرف‌ها (${profile.references.length})`}>
              {profile.references.length > 0 ? (
                <div className="space-y-2">
                  {profile.references.map((r, i) => (
                    <div key={i} className="rounded-md border p-2 text-sm">
                      <p className="font-medium">{r.full_name}</p>
                      <p className="text-muted-foreground" dir="ltr">{r.phone_number}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">معرفی ثبت نشده (اختیاری است).</p>
              )}
            </Section>

            {/* Decision actions */}
            <Card className="border-pink-100">
              <CardContent className="space-y-3 p-4">
                {showRejectBox ? (
                  <div className="space-y-2">
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="دلیل رد شدن را بنویسید..."
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowRejectBox(false)} disabled={busy}>انصراف</Button>
                      <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={handleReject} disabled={busy}>
                        {busy ? "..." : "ثبت رد شدن"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                      onClick={() => setShowRejectBox(true)}
                      disabled={busy || profile.status === "rejected"}
                    >
                      رد کردن
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleApprove}
                      disabled={busy || profile.status === "approved"}
                    >
                      {busy ? "..." : profile.status === "approved" ? "✓ تأیید شده" : "تأیید پروفایل"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
