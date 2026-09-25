"use client"

import { Fragment, useEffect, useState } from "react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { candidateTrackingService, type Candidate, type CandidateResume } from "@/services/candidate_tracking.service"
import { EXPERIENCE_RANGE, labelForValue } from "@/lib/constants"
import { toPersianDigits } from "@/lib/persian_digits"

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  needs_more_docs: "bg-purple-100 text-purple-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-700",
  suspended: "bg-gray-200 text-gray-700",
  draft: "bg-gray-100 text-gray-500",
}

// Same status→color mapping as STATUS_CLASS above, just as raw hex
// for the SVG donut chart, which can't consume Tailwind classes.
const STATUS_HEX: Record<string, string> = {
  pending: "#d97706",
  needs_more_docs: "#7e22ce",
  approved: "#059669",
  rejected: "#e11d48",
  suspended: "#6b7280",
  draft: "#9ca3af",
}

export default function CandidatesPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [scoreDraft, setScoreDraft] = useState("")
  const [dateDraft, setDateDraft] = useState("")
  const [noteDraft, setNoteDraft] = useState("")
  const [docsNoteDraft, setDocsNoteDraft] = useState("")
  const [acting, setActing] = useState(false)
  const [error, setError] = useState("")
  const [resume, setResume] = useState<CandidateResume | null>(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [editingFields, setEditingFields] = useState(false)
  const [editFirstName, setEditFirstName] = useState("")
  const [editLastName, setEditLastName] = useState("")
  const [editNationalId, setEditNationalId] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [savingFields, setSavingFields] = useState(false)

  function refresh() {
    setLoading(true)
    return candidateTrackingService.list().then(setCandidates).catch(() => setError("دریافت لیست با خطا مواجه شد.")).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (authLoading || !user) return null

  const counts = candidates.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const filteredCandidates = statusFilter ? candidates.filter((c) => c.status === statusFilter) : candidates

  function toggleFilter(status: string) {
    setStatusFilter((current) => (current === status ? null : status))
    setExpandedId(null)
  }

  const scoredCandidates = candidates.filter((c) => c.interview_score !== null)
  const averageScore = scoredCandidates.length > 0
    ? Math.round(scoredCandidates.reduce((sum, c) => sum + (c.interview_score || 0), 0) / scoredCandidates.length)
    : null
  const approvalRate = candidates.length > 0 ? Math.round(((counts.approved || 0) / candidates.length) * 100) : 0

  function resetDrafts() {
    setScoreDraft(""); setDateDraft(""); setNoteDraft(""); setDocsNoteDraft("")
    setResume(null)
    setEditingFields(false)
  }

  function startEditingFields(c: Candidate) {
    setEditFirstName(c.first_name)
    setEditLastName(c.last_name)
    setEditNationalId(c.national_id || "")
    setEditPhone(c.phone_number)
    setEditingFields(true)
    setError("")
  }

  async function handleSaveFields(userId: number) {
    setSavingFields(true); setError("")
    try {
      await candidateTrackingService.editFields(userId, {
        first_name: editFirstName,
        last_name: editLastName,
        national_id: editNationalId,
        phone_number: editPhone,
      })
      setEditingFields(false)
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ذخیره تغییرات با خطا مواجه شد.")
    } finally {
      setSavingFields(false)
    }
  }

  async function handleViewResume(userId: number) {
    setResumeLoading(true); setResume(null)
    try {
      const data = await candidateTrackingService.resume(userId)
      setResume(data)
    } catch {
      setError("دریافت رزومه با خطا مواجه شد.")
    } finally {
      setResumeLoading(false)
    }
  }

  async function handleRecordInterview(userId: number) {
    setActing(true); setError("")
    try {
      await candidateTrackingService.recordInterview(userId, {
        score: scoreDraft ? Number(scoreDraft) : undefined,
        interview_date: dateDraft || undefined,
        note: noteDraft || undefined,
      })
      resetDrafts(); setExpandedId(null)
      await refresh()
    } catch {
      setError("ثبت مصاحبه با خطا مواجه شد.")
    } finally {
      setActing(false)
    }
  }

  async function handleRequestDocs(userId: number) {
    if (!docsNoteDraft.trim()) return
    setActing(true); setError("")
    try {
      await candidateTrackingService.requestMoreDocuments(userId, docsNoteDraft)
      resetDrafts(); setExpandedId(null)
      await refresh()
    } catch {
      setError("این عملیات با خطا مواجه شد.")
    } finally {
      setActing(false)
    }
  }

  async function handleMarkReady(userId: number) {
    setActing(true); setError("")
    try {
      await candidateTrackingService.markReadyForReview(userId)
      await refresh()
    } catch {
      setError("این عملیات با خطا مواجه شد.")
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-slate-900">بانک اطلاعات مراقبان</h1>
      </div>

      {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <button onClick={() => toggleFilter("")} className={`rounded-2xl border border-pink-100 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === null ? "ring-2 ring-rose-400" : ""}`}>
          <p className="text-3xl font-bold text-rose-900">{toPersianDigits(candidates.length)}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">تعداد کل</p>
        </button>
        <button onClick={() => toggleFilter("approved")} className={`rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "approved" ? "ring-2 ring-emerald-500" : ""}`}>
          <p className="text-3xl font-bold text-emerald-700">{toPersianDigits(counts.approved || 0)}</p>
          <p className="mt-1 text-xs font-medium text-emerald-800/70">تأیید شده</p>
        </button>
        <button onClick={() => toggleFilter("pending")} className={`rounded-2xl border border-amber-100 bg-amber-50/40 p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "pending" ? "ring-2 ring-amber-500" : ""}`}>
          <p className="text-3xl font-bold text-amber-700">{toPersianDigits(counts.pending || 0)}</p>
          <p className="mt-1 text-xs font-medium text-amber-800/70">در حال بررسی</p>
        </button>
        <button onClick={() => toggleFilter("needs_more_docs")} className={`rounded-2xl border border-purple-100 bg-purple-50/40 p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "needs_more_docs" ? "ring-2 ring-purple-500" : ""}`}>
          <p className="text-3xl font-bold text-purple-700">{toPersianDigits(counts.needs_more_docs || 0)}</p>
          <p className="mt-1 text-xs font-medium text-purple-800/70">نیاز به مدارک</p>
        </button>
        <button onClick={() => toggleFilter("rejected")} className={`rounded-2xl border border-rose-100 bg-rose-50/40 p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "rejected" ? "ring-2 ring-rose-500" : ""}`}>
          <p className="text-3xl font-bold text-rose-700">{toPersianDigits(counts.rejected || 0)}</p>
          <p className="mt-1 text-xs font-medium text-rose-800/70">رد شده</p>
        </button>
      </div>

      {statusFilter && (
        <p className="mb-4 px-1 text-xs text-muted-foreground">
          نمایش فقط مراقبان با وضعیت «{STATUS_LABEL_FA[statusFilter]}» —{" "}
          <button className="font-medium text-rose-700 underline" onClick={() => setStatusFilter(null)}>نمایش همه</button>
        </p>
      )}

      {candidates.length > 0 && (
        <Card className="mb-4 border-pink-100">
          <CardHeader><CardTitle className="text-rose-900">نمودار وضعیت مراقبان</CardTitle></CardHeader>
          <CardContent>
            <StatusDonutChart counts={counts} total={candidates.length} />
          </CardContent>
        </Card>
      )}

      <Card className="mb-4 border-pink-100">
        <CardHeader><CardTitle className="text-rose-900">لیست مراقبان ({toPersianDigits(filteredCandidates.length)})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز مراقبی به این آژانس متصل نشده است.</p>
          ) : filteredCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              مراقبی با این وضعیت یافت نشد. <button className="font-medium text-rose-700 underline" onClick={() => setStatusFilter(null)}>نمایش همه</button>
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-pink-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pink-100 bg-pink-50/70 text-xs font-semibold text-rose-900">
                    <th className="p-3 text-right">نام</th>
                    <th className="p-3 text-right">کد ملی</th>
                    <th className="p-3 text-right">تلفن</th>
                    <th className="p-3 text-right">شهر</th>
                    <th className="p-3 text-right">تجربه</th>
                    <th className="p-3 text-center">تاریخ ثبت‌نام</th>
                    <th className="p-3 text-center">وضعیت</th>
                    <th className="p-3 text-center">امتیاز مصاحبه</th>
                    <th className="p-3 text-center">تاریخ مصاحبه</th>
                    <th className="p-3 text-right">یادداشت</th>
                    <th className="p-3 text-center">ویرایش</th>
                    <th className="p-3 text-center">جزئیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c, index) => (
                    <Fragment key={c.user_id}>
                      <tr className={`border-b border-pink-50 transition-colors last:border-0 hover:bg-pink-50/60 ${index % 2 === 1 ? "bg-pink-50/20" : ""}`}>
                        <td className="p-3 text-right font-medium text-rose-950">{c.full_name}</td>
                        <td className="p-3 text-right text-muted-foreground" dir="ltr">{c.national_id ? toPersianDigits(c.national_id) : "—"}</td>
                        <td className="p-3 text-right text-muted-foreground" dir="ltr">{toPersianDigits(c.phone_number)}</td>
                        <td className="p-3 text-right text-muted-foreground">{c.city || "—"}</td>
                        <td className="p-3 text-right text-muted-foreground">{c.experience_level ? labelForValue(EXPERIENCE_RANGE, c.experience_level) : "—"}</td>
                        <td className="p-3 text-center text-muted-foreground">{c.registered_at ? toPersianDigits(c.registered_at.slice(0, 10)) : "—"}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-medium ${STATUS_CLASS[c.status]}`}>
                            {c.status_label}
                          </span>
                        </td>
                        <td className="p-3 text-center font-semibold text-rose-900">{c.interview_score !== null ? toPersianDigits(c.interview_score) : "—"}</td>
                        <td className="p-3 text-center text-muted-foreground">{c.interview_date ? toPersianDigits(c.interview_date) : "—"}</td>
                        <td className="max-w-[160px] truncate p-3 text-right text-muted-foreground" title={c.staff_notes || undefined}>{c.staff_notes || "—"}</td>
                        <td className="p-3 text-center">
                          <Button size="sm" variant="outline" onClick={() => { setExpandedId(c.user_id); resetDrafts(); startEditingFields(c) }}>
                            ویرایش
                          </Button>
                        </td>
                        <td className="p-3 text-center">
                          <Button size="sm" variant="outline" onClick={() => { setExpandedId(expandedId === c.user_id ? null : c.user_id); resetDrafts() }}>
                            {expandedId === c.user_id ? "بستن" : "جزئیات"}
                          </Button>
                        </td>
                      </tr>
                      {expandedId === c.user_id && (
                        <tr>
                          <td colSpan={12} className="bg-pink-50/40 p-4">
                            <div className="grid gap-4 sm:grid-cols-3">
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-rose-900">ثبت نتیجه مصاحبه</p>
                                <div className="flex gap-2">
                                  <input type="number" min={0} max={100} placeholder="امتیاز (۰ تا ۱۰۰)" value={scoreDraft} onChange={(e) => setScoreDraft(e.target.value)} className="w-32 rounded-md border border-input bg-background p-2 text-sm" />
                                  <input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} className="rounded-md border border-input bg-background p-2 text-sm" />
                                </div>
                                <textarea placeholder="یادداشت داخلی (اختیاری)" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm" rows={2} />
                                <Button size="sm" disabled={acting} onClick={() => handleRecordInterview(c.user_id)}>ثبت مصاحبه</Button>
                                {c.staff_notes && <p className="text-xs text-muted-foreground">یادداشت فعلی: {c.staff_notes}</p>}
                              </div>
                              <div className="space-y-2">
                                {c.status === "needs_more_docs" ? (
                                  <>
                                    <p className="text-xs font-medium text-purple-900">در انتظار مدارک تکمیلی</p>
                                    <p className="text-xs text-muted-foreground">{c.needs_more_docs_note}</p>
                                    <Button size="sm" variant="outline" disabled={acting} onClick={() => handleMarkReady(c.user_id)}>
                                      بازگرداندن به بررسی (مدارک دریافت شد)
                                    </Button>
                                  </>
                                ) : c.status === "pending" ? (
                                  <>
                                    <p className="text-xs font-medium text-rose-900">درخواست مدارک تکمیلی</p>
                                    <textarea placeholder="چه مدرکی نیاز است؟" value={docsNoteDraft} onChange={(e) => setDocsNoteDraft(e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm" rows={2} />
                                    <Button size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50" disabled={acting || !docsNoteDraft.trim()} onClick={() => handleRequestDocs(c.user_id)}>
                                      درخواست مدارک
                                    </Button>
                                  </>
                                ) : (
                                  <p className="text-xs text-muted-foreground">در وضعیت «{c.status_label}» — بدون اقدام بیشتر.</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-rose-900">رزومه کامل</p>
                                <Button size="sm" variant="outline" disabled={resumeLoading} onClick={() => handleViewResume(c.user_id)}>
                                  {resumeLoading ? "در حال بارگذاری..." : "مشاهده رزومه"}
                                </Button>
                              </div>
                            </div>
                            {editingFields && (
                              <div className="mt-4 border-t border-pink-100 pt-4">
                                <p className="mb-2 text-xs font-medium text-rose-900">ویرایش اطلاعات مراقب</p>
                                <p className="mb-3 text-xs text-amber-700">
                                  این اطلاعات، مشخصات شخصی خود مراقب است — هر تغییری با نام شما در تاریخچه ثبت می‌شود.
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">نام</label>
                                    <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">نام خانوادگی</label>
                                    <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">کد ملی</label>
                                    <input value={editNationalId} onChange={(e) => setEditNationalId(e.target.value)} dir="ltr" className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">تلفن</label>
                                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} dir="ltr" className="w-full rounded-md border border-input bg-background p-2 text-sm" />
                                  </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <Button size="sm" disabled={savingFields} onClick={() => handleSaveFields(c.user_id)}>
                                    {savingFields ? "در حال ذخیره..." : "ذخیره تغییرات"}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingFields(false)}>انصراف</Button>
                                </div>
                              </div>
                            )}
                            {resume && (
                              <div className="mt-4 border-t border-pink-100 pt-4">
                                <ResumeView resume={resume} />
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {candidates.length > 0 && (
        <Card className="border-pink-100 bg-pink-50/40">
          <CardHeader><CardTitle className="text-rose-900">گزارش سریع</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-rose-900">{averageScore !== null ? toPersianDigits(averageScore) : "—"}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">میانگین امتیاز مصاحبه</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-emerald-700">{toPersianDigits(approvalRate)}٪</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">درصد تأیید‌شدگان</p>
            </div>
            <div className="rounded-xl bg-white p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-rose-900">{toPersianDigits(scoredCandidates.length)}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">تعداد مصاحبه‌شده</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusDonutChart({ counts, total }: { counts: Record<string, number>; total: number }) {
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const order = ["approved", "pending", "needs_more_docs", "rejected", "suspended", "draft"]
  let cumulative = 0

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="20" />
        {total === 0 ? null : order.map((key) => {
          const value = counts[key] || 0
          if (value === 0) return null
          const fraction = value / total
          const length = fraction * circumference
          const dashoffset = -cumulative
          cumulative += length
          return (
            <circle
              key={key}
              cx="80" cy="80" r={radius} fill="none"
              stroke={STATUS_HEX[key]} strokeWidth="20"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashoffset}
            />
          )
        })}
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-1">
        {order.filter((key) => counts[key] > 0).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_HEX[key] }} />
            <span className="text-muted-foreground">
              {STATUS_LABEL_FA[key]}: {toPersianDigits(counts[key])} ({toPersianDigits(total > 0 ? Math.round((counts[key] / total) * 100) : 0)}٪)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const STATUS_LABEL_FA: Record<string, string> = {
  pending: "در حال بررسی",
  needs_more_docs: "نیاز به مدارک",
  approved: "تأیید شده",
  rejected: "رد شده",
  suspended: "معلق",
  draft: "پیش‌نویس",
}

function ResumeView({ resume }: { resume: CandidateResume }) {
  const identity = resume.identity as Record<string, string> | null
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="mb-1 text-xs font-semibold text-rose-900">اطلاعات اولیه</p>
        {identity ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {identity.full_name && <p>نام: {identity.full_name}</p>}
            {identity.national_id && <p>کد ملی: {toPersianDigits(identity.national_id)}</p>}
          </div>
        ) : <p className="text-xs text-muted-foreground">ثبت نشده</p>}
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-rose-900">سوابق تحصیلی</p>
        {resume.skills?.education_level || resume.skills?.field_of_study ? (
          <p className="text-xs text-muted-foreground">
            {resume.skills.education_level} {resume.skills.field_of_study && `— ${resume.skills.field_of_study}`}
          </p>
        ) : <p className="text-xs text-muted-foreground">ثبت نشده</p>}
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-rose-900">سوابق شغلی</p>
        {resume.experience ? (
          <div className="text-xs text-muted-foreground">
            <p>سابقه مراقبت از سالمند: {resume.experience.elderly_care_experience || "—"}</p>
            {resume.experience.last_workplace && <p>آخرین محل کار: {resume.experience.last_workplace}</p>}
          </div>
        ) : <p className="text-xs text-muted-foreground">ثبت نشده</p>}
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-rose-900">مهارت‌های تکمیلی</p>
        {resume.skills ? (
          <div className="flex flex-wrap gap-1">
            {[...resume.skills.caregiving_skills, ...resume.skills.communication_skills].map((skill) => (
              <span key={skill} className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] text-rose-800">{skill}</span>
            ))}
            {resume.skills.caregiving_skills.length === 0 && resume.skills.communication_skills.length === 0 && (
              <p className="text-xs text-muted-foreground">ثبت نشده</p>
            )}
          </div>
        ) : <p className="text-xs text-muted-foreground">ثبت نشده</p>}
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-rose-900">معرف‌ها ({resume.references.length})</p>
        {resume.references.length === 0 ? (
          <p className="text-xs text-muted-foreground">ثبت نشده</p>
        ) : (
          <div className="space-y-1">
            {resume.references.map((ref) => (
              <p key={ref.id} className="text-xs text-muted-foreground">{ref.full_name} — {ref.occupation} ({toPersianDigits(ref.phone_number)})</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
