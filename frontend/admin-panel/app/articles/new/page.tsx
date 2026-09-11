"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { articlesService } from "@/services/articles.service"
import { ROUTES } from "@/lib/routes"
import { Sidebar } from "@/components/layout/sidebar"

export default function NewArticlePage() {
  const { user, loading: authLoading, logout } = useAuth(["admin", "superuser"])
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [body, setBody] = useState("")
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  if (authLoading || !user) return null

  async function handleSave() {
    setSaving(true); setError("")
    try {
      const created = await articlesService.create({ title, summary, body, cover_image: coverImage })
      router.push(ROUTES.articleDetail(created.id))
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ثبت مقاله با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background">
      <Sidebar onLogout={logout} />

      <div className="sm:mr-64">
        <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
          <div className="flex items-center justify-between p-4 sm:px-6">
            <h1 className="font-bold text-rose-900">مقاله جدید</h1>
            <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.articles)}>بازگشت</Button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Card className="mx-auto max-w-2xl border-pink-100">
            <CardHeader>
              <CardTitle className="text-rose-900">نوشتن مقاله</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

              <div className="space-y-1.5">
                <Label htmlFor="title">عنوان</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="summary">خلاصه (برای کارت پیش‌نمایش در صفحه اصلی)</Label>
                <Input id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cover">تصویر شاخص</Label>
                <Input
                  id="cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverImage(e.target.files?.[0] ?? null)}
                />
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

              <p className="text-xs text-muted-foreground">
                مقاله ابتدا به‌صورت پیش‌نویس ذخیره می‌شود — انتشار آن یک مرحله جداگانه است.
              </p>

              <Button
                disabled={saving || !title.trim() || !summary.trim() || !body.trim()}
                onClick={handleSave}
                className="w-full"
              >
                {saving ? "در حال ذخیره..." : "ذخیره به‌عنوان پیش‌نویس"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
