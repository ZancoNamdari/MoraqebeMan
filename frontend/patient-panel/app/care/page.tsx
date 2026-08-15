"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { StarRating } from "@/components/forms/star-rating"
import { myPatientService } from "@/services/patient.service"
import { careService } from "@/services/care.service"
import { CARE_LOG_CATEGORY_LABEL, CARE_LOG_CATEGORY_ICON, caregiverAvatar } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"
import type { CaregiverAssignment, CareLogEntry } from "@/types/care"

export default function CarePage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [team, setTeam] = useState<CaregiverAssignment[]>([])
  const [timeline, setTimeline] = useState<CareLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [patientId, setPatientId] = useState<number | null>(null)
  const [reviewingId, setReviewingId] = useState<number | null>(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!user) return
    myPatientService.get()
      .then((profile) => {
        setPatientId(profile.id)
        return Promise.all([careService.team(profile.id), careService.timeline(profile.id)])
      })
      .then(([t, tl]) => { setTeam(t); setTimeline(tl) })
      .finally(() => setLoading(false))
  }, [user])

  async function handleSubmitReview(assignmentId: number) {
    if (!patientId) return
    setReviewSaving(true)
    try {
      await careService.submitReview(assignmentId, reviewRating, reviewComment)
      setReviewedIds((prev) => new Set(prev).add(assignmentId))
      setReviewingId(null); setReviewRating(0); setReviewComment("")
      const refreshedTeam = await careService.team(patientId)
      setTeam(refreshedTeam)
    } finally {
      setReviewSaving(false)
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b border-pink-100 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">تیم مراقبت</h1>
          <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
              <Button variant="ghost" size="sm" className="text-rose-600" onClick={logout}>خروج</Button>
            </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <>
            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-rose-900">مراقبان فعلی</CardTitle></CardHeader>
              <CardContent>
                {team.length === 0 ? (
                  <p className="text-sm text-muted-foreground">در حال حاضر مراقبی برای شما تخصیص داده نشده است.</p>
                ) : (
                  <div className="space-y-2">
                    {team.map((a) => (
                      <div key={a.id} className="rounded-lg border border-pink-100 bg-pink-50/50 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-rose-300 text-sm">{caregiverAvatar(a.caregiver_gender)}</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{a.caregiver_name}</p>
                            <p className="text-xs text-muted-foreground">
                              از تاریخ {a.assigned_at.slice(0, 10)}
                              {a.caregiver_avg_rating !== null && (
                                <span> · {"★".repeat(Math.round(a.caregiver_avg_rating))}{"☆".repeat(5 - Math.round(a.caregiver_avg_rating))} ({a.caregiver_avg_rating} از {a.caregiver_review_count} نظر)</span>
                              )}
                            </p>
                          </div>
                          {reviewedIds.has(a.id) ? (
                            <span className="text-xs font-medium text-emerald-700">✓ نظر ثبت شد</span>
                          ) : reviewingId !== a.id && (
                            <button className="text-xs text-rose-600 hover:underline" onClick={() => setReviewingId(a.id)}>
                              ثبت نظر
                            </button>
                          )}
                        </div>
                        {reviewingId === a.id && (
                          <div className="mt-3 space-y-2 border-t border-pink-100 pt-3">
                            <StarRating value={reviewRating} onChange={setReviewRating} />
                            <Textarea
                              value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                              placeholder="نظر شما درباره این مراقب (اختیاری)" rows={2}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" disabled={reviewSaving || reviewRating === 0} onClick={() => handleSubmitReview(a.id)}>
                                {reviewSaving ? "در حال ثبت..." : "ثبت نظر"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setReviewingId(null); setReviewRating(0); setReviewComment("") }}>
                                انصراف
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-rose-900">جدول زمانی مراقبت</CardTitle></CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">هنوز گزارشی ثبت نشده است.</p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((entry) => (
                      <div key={entry.id} className="flex gap-3 border-r-2 border-pink-200 pr-3">
                        <span className="text-lg leading-none">{CARE_LOG_CATEGORY_ICON[entry.category] || "📝"}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-rose-700">{CARE_LOG_CATEGORY_LABEL[entry.category] || entry.category}</p>
                            <p className="text-xs text-muted-foreground">{entry.created_at.slice(0, 16).replace("T", " — ")}</p>
                          </div>
                          <p className="text-sm">{entry.note}</p>
                          <p className="text-xs text-muted-foreground">توسط {entry.caregiver_name}</p>
                        </div>
                      </div>
                    ))}
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
