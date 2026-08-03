"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { caregiverService } from "@/services/caregiver.service"
import type { CaregiverListItem } from "@/types/caregiver"
import { ROUTES } from "@/lib/routes"

const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس",
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
  suspended: "تعلیق شده",
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [caregivers, setCaregivers] = useState<CaregiverListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    caregiverService
      .list()
      .then(setCaregivers)
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading) return null

  const doneCount = caregivers.filter((c) => c.forms_completed === c.forms_total).length

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <div>
            <h1 className="text-lg font-bold">پنل ناظر — مراقب من</h1>
            {user && <p className="text-sm text-muted-foreground">خوش آمدید، {user.username}</p>}
          </div>
          <Button variant="outline" onClick={logout}>خروج</Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">لیست مراقبان</h2>
            <p className="text-sm text-muted-foreground">
              {caregivers.length} مراقب ثبت‌شده — {doneCount} مورد کامل
            </p>
          </div>
          <Button size="lg" onClick={() => router.push(ROUTES.newCaregiver)}>
            + افزودن مراقب جدید
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-8 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : caregivers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              هنوز هیچ مراقبی ثبت نشده. با دکمه بالا شروع کنید.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {caregivers.map((c) => (
              <Card
                key={c.user_id}
                className="cursor-pointer transition hover:shadow-md"
                onClick={() => router.push(`${ROUTES.newCaregiver}?id=${c.user_id}`)}
              >
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{c.full_name || "(بدون نام)"}</p>
                      <Badge variant={c.status === "approved" ? "default" : "secondary"}>
                        {STATUS_LABEL[c.status] || c.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.phone_number}</p>
                  </div>
                  <div className="w-40 shrink-0">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>{c.forms_completed} از {c.forms_total} فرم</span>
                    </div>
                    <Progress value={(c.forms_completed / c.forms_total) * 100} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
