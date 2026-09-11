"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { articlesService, type ArticleListItem } from "@/services/articles.service"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

export default function ArticlesListPage() {
  const { user, loading: authLoading, logout } = useAuth(["admin", "superuser"])
  const router = useRouter()

  const [articles, setArticles] = useState<ArticleListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    articlesService.list().then(setArticles).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  const publishedCount = articles.filter((a) => a.is_published).length
  const draftCount = articles.length - publishedCount

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">مقالات و اخبار</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>داشبورد</Button>
            <Button variant="ghost" size="sm" className="text-rose-600" onClick={logout}>خروج</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <Card className="border-pink-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-rose-900">
              فهرست مقالات ({articles.length}) — {publishedCount} منتشرشده، {draftCount} پیش‌نویس
            </CardTitle>
            <Button size="sm" onClick={() => router.push(ROUTES.articleNew)}>مقاله جدید</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : articles.length === 0 ? (
              <p className="text-sm text-muted-foreground">هنوز هیچ مقاله‌ای ثبت نشده است.</p>
            ) : (
              <div className="space-y-2">
                {articles.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => router.push(ROUTES.articleDetail(a.id))}
                    className="flex w-full items-center justify-between rounded-lg border border-pink-100 bg-pink-50/40 p-3 text-right transition-colors hover:bg-pink-50"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.summary}</p>
                      {a.author_username && (
                        <p className="mt-1 text-[11px] text-muted-foreground">نویسنده: {a.author_username}</p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                        a.is_published ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {a.is_published ? "منتشرشده" : "پیش‌نویس"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
