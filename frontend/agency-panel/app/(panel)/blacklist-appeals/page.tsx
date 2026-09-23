"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { blacklistAppealReviewService, type BlacklistAppeal } from "@/services/blacklist_appeal_review.service"
import { ROUTES } from "@/lib/routes"
import { Sidebar } from "@/components/layout/sidebar"

const STATUS_LABEL: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "پذیرفته‌شده",
  denied: "رد شده",
}

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  denied: "bg-gray-100 text-gray-600",
}

export default function BlacklistAppealsPage() {
  const { user, loading: authLoading, logout } = useAuth(["agency", "agency_supervisor"])
  const router = useRouter()

  const [appeals, setAppeals] = useState<BlacklistAppeal[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [acting, setActing] = useState(false)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")

  function refresh() {
    setLoading(true)
    return blacklistAppealReviewService.list(statusFilter || undefined).then(setAppeals).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter])

  if (authLoading || !user) return null

  async function handleDecision(id: number, decision: "approve" | "deny") {
    setActing(true); setError("")
    try {
      if (decision === "approve") await blacklistAppealReviewService.approve(id, noteDraft)
      else await blacklistAppealReviewService.deny(id, noteDraft)
      setExpandedId(null); setNoteDraft("")
      await refresh()
    } catch {
      setError("این عملیات با خطا مواجه شد.")
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">درخواست‌های بازبینی مسدودیت</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
          </div>
        </div>
      </header>

      <div className="min-h-screen bg-slate-50">
      <Sidebar onLogout={logout} isOwner={user.role === "agency"} />

      <div className="sm:mr-64">
        <main className="mx-auto max-w-2xl space-y-4 p-4">
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <Card className="border-pink-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-rose-900">درخواست‌ها ({appeals.length})</CardTitle>
            <div className="flex gap-1">
              {([["pending", "در انتظار"], ["approved", "پذیرفته"], ["denied", "رد شده"], ["", "همه"]] as [string, string][]).map(([value, label]) => (
                <Button key={value} size="sm" variant={statusFilter === value ? "default" : "outline"} onClick={() => setStatusFilter(value)}>
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : appeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">موردی یافت نشد.</p>
            ) : (
              <div className="space-y-2">
                {appeals.map((appeal) => (
                  <div key={appeal.id} className="rounded-lg border border-pink-100 bg-pink-50/40">
                    <button
                      onClick={() => { setExpandedId(expandedId === appeal.id ? null : appeal.id); setNoteDraft("") }}
                      className="flex w-full items-center justify-between p-3 text-right"
                    >
                      <div>
                        <p className="text-sm font-medium">{appeal.caregiver_name}</p>
                        <p className="text-xs text-muted-foreground">{appeal.created_at.slice(0, 16).replace("T", " — ")}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_CLASS[appeal.status]}`}>
                        {STATUS_LABEL[appeal.status]}
                      </span>
                    </button>
                    {expandedId === appeal.id && (
                      <div className="space-y-2 border-t border-pink-100 p-3">
                        <p className="text-sm leading-relaxed">{appeal.appeal_reason}</p>
                        {appeal.status === "pending" ? (
                          <>
                            <textarea
                              className="w-full rounded-md border border-input bg-background p-2 text-sm"
                              rows={2}
                              placeholder="یادداشت (اختیاری)"
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={acting} onClick={() => handleDecision(appeal.id, "approve")}>
                                پذیرش و رفع مسدودیت
                              </Button>
                              <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={acting} onClick={() => handleDecision(appeal.id, "deny")}>
                                رد درخواست
                              </Button>
                            </div>
                          </>
                        ) : (
                          appeal.review_note && <p className="text-xs text-muted-foreground">یادداشت بررسی: {appeal.review_note}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      </div>
    </div>
    </div>
  )
}
