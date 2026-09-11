"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { articlesService, type ArticleDetail } from "@/services/articles.service"
import { ROUTES } from "@/lib/routes"
import { Sidebar } from "@/components/layout/sidebar"

export default function ArticleDetailPage() {
  const { user, loading: authLoading, logout } = useAuth(["admin", "superuser"])
  const router = useRouter()
  const params = useParams()
  const articleId = Number(params.id)

  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    articlesService.detail(articleId).then((data) => {
      setArticle(data)
      setTitle(data.title)
      setSummary(data.summary)
      setBody(data.body)
    }).finally(() => setLoading(false))
  }, [user, articleId])

  if (authLoading || !user) return null

  async function handleSave() {
    setSaving(true); setError("")
    try {
      const updated = await articlesService.update(articleId, { title, summary, body })
      setArticle(updated)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "بروزرسانی با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublish() {
    if (!article) return
    setSaving(true); setError("")
    try {
      const updated = article.is_published
        ? await articlesService.unpublish(article.id)
        : await articlesService.publish(article.id)
      setArticle(updated)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "این عملیات با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleFeature() {
    if (!article) return
    setSaving(true); setError("")
    try {
      const updated = article.is_featured
        ? await articlesService.unfeature(article.id)
        : await articlesService.feature(article.id)
      setArticle(updated)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "این عملیات با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!article) return
    if (!confirm("این مقاله برای همیشه حذف می‌شود. مطمئن هستید؟")) return
    setSaving(true); setError("")
    try {
      await articlesService.remove(article.id)
      router.push(ROUTES.articles)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "حذف با خطا مواجه شد.")
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background">
      <Sidebar onLogout={logout} />

      <div className="sm:mr-64">
        <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
          <div className="flex items-center justify-between p-4 sm:px-6">
            <h1 className="font-bold text-rose-900">ویرایش مقاله</h1>
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.articles)}>بازگشت</Button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {loading || !article ? (
            <Skeleton className="mx-auto h-96 max-w-2xl w-full rounded-2xl" />
          ) : (
            <Card className="mx-auto max-w-2xl border-pink-100">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-rose-900">
                  {article.is_published ? "منتشرشده" : "پیش‌نویس"}
                  {article.is_featured && " — در صفحه اصلی"}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={saving} onClick={handleTogglePublish}>
                    {article.is_published ? "لغو انتشار" : "انتشار"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving || !article.is_published}
                    onClick={handleToggleFeature}
                    title={!article.is_published ? "ابتدا مقاله را منتشر کنید" : undefined}
                  >
                    {article.is_featured ? "حذف از صفحه اصلی" : "نمایش در صفحه اصلی"}
                  </Button>
                  <Button size="sm" variant="destructive" disabled={saving} onClick={handleDelete}>
                    حذف
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

                <div className="space-y-1.5">
                  <Label htmlFor="title">عنوان</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="summary">خلاصه</Label>
                  <Input id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="body">متن کامل مقاله</Label>
                  <textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={14}
                    className="w-full rounded-md border border-input bg-background p-3 text-sm leading-relaxed"
                  />
                </div>

                <Button
                  disabled={saving || !title.trim() || !summary.trim() || !body.trim()}
                  onClick={handleSave}
                  className="w-full"
                >
                  {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}
