"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { CaregiverAvatar } from "@/components/caregivers/caregiver-avatar"
import { caregiverDirectoryService } from "@/services/caregiver-directory.service"
import type { PublicCaregiverCard } from "@/types/caregiver-public"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

const SERVICE_FILTERS = [
  { key: "", label: "همه" },
  { key: "salmandyar", label: "سالمندیار" },
  { key: "madaryar", label: "مادریار" },
  { key: "parastar", label: "پرستار / بهیار" },
  { key: "nezafatchi", label: "امور منزل" },
]

export default function CaregiversDirectoryPage() {
  const { user, loading: authLoading } = useAuth(["patient"])
  const router = useRouter()
  const [rows, setRows] = useState<PublicCaregiverCard[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [q, setQ] = useState("")
  const [query, setQuery] = useState("")
  const [service, setService] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    setLoading(true); setError("")
    caregiverDirectoryService
      .list({ q: query || undefined, service_type: service || undefined, page })
      .then((d) => { setRows(d.results); setTotal(d.count); setPageSize(d.page_size) })
      .catch(() => setError("بارگذاری فهرست مراقبان با خطا مواجه شد."))
      .finally(() => setLoading(false))
  }, [user, query, service, page])

  if (authLoading || !user) return null
  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">مراقبان</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q.trim()) }}>
          <Input placeholder="جستجوی نام یا شهر/منطقه..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" size="sm">جستجو</Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {SERVICE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setPage(1); setService(f.key) }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                service === f.key ? "border-rose-400 bg-rose-100 text-rose-800" : "border-pink-100 bg-background text-muted-foreground hover:bg-pink-50",
              )}
            >{f.label}</button>
          ))}
        </div>

        {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}

        {loading ? (
          <Skeleton className="h-60 w-full rounded-2xl" />
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">مراقبی با این مشخصات پیدا نشد.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((c) => (
              <Card key={c.id} className="cursor-pointer border-pink-100 transition hover:shadow-md" onClick={() => router.push(ROUTES.caregiverDetail(c.id))}>
                <CardContent className="flex gap-3 p-4">
                  <CaregiverAvatar url={c.photo_url} name={c.display_name} gender={c.gender} className="h-16 w-16" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <p className="font-semibold text-rose-900">{c.display_name}</p>
                      {c.age ? <span className="text-xs text-muted-foreground">{c.age} ساله</span> : null}
                      {c.city ? <span className="text-xs text-muted-foreground">· {c.city}</span> : null}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.services.map((s) => (
                        <span key={s.key} className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] text-rose-800">{s.label}</span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.avg_rating != null ? `⭐ ${c.avg_rating} (${c.review_count} نظر)` : "هنوز نظری ثبت نشده"}
                      {c.care_count ? ` · ${c.care_count} مراقبت` : ""}
                      {c.satisfaction_percent != null ? ` · رضایت ${c.satisfaction_percent}٪` : ""}
                    </p>
                    {c.special_talents.length > 0 && (
                      <p className="truncate text-xs text-muted-foreground">استعدادها: {c.special_talents.join("، ")}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>قبلی</Button>
            <span className="text-xs text-muted-foreground">{page} از {pages}</span>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>بعدی</Button>
          </div>
        )}
      </main>
    </div>
  )
}
