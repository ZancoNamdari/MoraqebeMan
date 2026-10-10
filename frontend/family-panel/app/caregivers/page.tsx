"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { MapPin, Search, Star } from "lucide-react"
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
  const { user, loading: authLoading } = useAuth(["family"])
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
      <AppHeader title="مراقبان تأییدشده">
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
      </AppHeader>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(q.trim()) }}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pr-9" placeholder="جستجوی نام یا شهر/منطقه..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button type="submit" size="sm">جستجو</Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {SERVICE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setPage(1); setService(f.key) }}
              className={cn(
                "min-h-10 rounded-full border px-4 py-2 text-sm",
                service === f.key ? "border-rose-400 bg-rose-100 text-rose-800" : "border-pink-100 bg-background text-muted-foreground hover:bg-pink-50",
              )}
            >{f.label}</button>
          ))}
        </div>

        {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground"><p>مراقبی با این مشخصات پیدا نشد.</p><p className="mt-2 text-xs">برای دیدن مراقبان، ابتدا از صفحه‌ی اصلی با کد آژانس به آژانس خود بپیوندید؛ فهرست فقط مراقبان تأییدشده‌ی آژانس‌های شما را نشان می‌دهد.</p></div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{total} مراقب</p>
            {rows.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(ROUTES.caregiverDetail(c.id))}
                className="flex w-full gap-4 rounded-2xl border border-pink-100 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-100"
              >
                <CaregiverAvatar url={c.photo_url} name={c.display_name} gender={c.gender} className="h-20 w-20 border border-pink-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-rose-900">{c.display_name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {c.age ? <span>{c.age} ساله</span> : null}
                        {c.city ? <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{c.city}</span> : null}
                        {c.elderly_experience ? <span>سابقه: {c.elderly_experience}</span> : null}
                      </p>
                    </div>
                    {c.avg_rating != null ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{c.avg_rating}
                        <span className="font-normal text-amber-700/70">({c.review_count})</span>
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-muted-foreground">جدید</span>
                    )}
                  </div>
                  {c.services.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.services.map((sv) => (
                        <span key={sv.key} className="rounded-full bg-pink-100 px-2 py-0.5 text-xs text-rose-800">{sv.label}</span>
                      ))}
                    </div>
                  )}
                  {c.special_talents.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.special_talents.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">{t}</span>
                      ))}
                    </div>
                  )}
                  {(c.care_count > 0 || c.satisfaction_percent != null) && (
                    <p className="text-xs text-muted-foreground">
                      {c.care_count ? `${c.care_count} مراقبت انجام‌شده` : ""}
                      {c.care_count && c.satisfaction_percent != null ? " · " : ""}
                      {c.satisfaction_percent != null ? `رضایت ${c.satisfaction_percent}٪` : ""}
                    </p>
                  )}
                </div>
              </button>
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
