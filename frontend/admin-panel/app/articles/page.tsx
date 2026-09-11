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
import { Sidebar } from "@/components/layout/sidebar"

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
  const featuredCount = articles.filter((a) => a.is_featured).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background">
      <Sidebar onLogout={logout} />

      <div className="sm:mr-64">
        <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
          <div className="flex items-center justify-between p-4 sm:px-6">
            <h1 className="font-bold text-rose-900">مقالات و اخبار</h1>
            <Button size="sm" onClick={() => router.push(ROUTES.articleNew)}>مقاله جدید</Button>
          </div>
        </header>

        <main className="space-y-4 p-4 sm:p-6">
          <Card className="border-pink-100">
            <CardHeader>
              <CardTitle className="text-rose-900">
                فهرست مقالات ({articles.length}) — {publishedCount} منتشرشده، {draftCount} پیش‌نویس، {featuredCount} در صفحه اصلی
              </CardTitle>
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
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-medium",
                            a.is_published ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {a.is_published ? "منتشرشده" : "پیش‌نویس"}
                        </span>
                        {a.is_featured && (
                          <span className="rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-medium text-primary-strong">
                            صفحه اصلی
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
