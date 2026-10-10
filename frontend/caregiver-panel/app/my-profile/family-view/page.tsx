"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { CaregiverProfileView } from "@/components/caregiver-public/profile-view"
import { myFamilyViewService } from "@/services/my_family_view.service"
import type { CaregiverFamilyViewPreview } from "@/types/caregiver-public"
import { ROUTES } from "@/lib/routes"

export default function CaregiverFamilyViewPage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()
  const [p, setP] = useState<CaregiverFamilyViewPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    myFamilyViewService.get().then(setP).catch(() => setError("پروفایل پیدا نشد.")).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-background pb-10">
      <AppHeader title="نمای خانواده — همان چیزی که خانواده‌ها می‌بینند" maxWidth="max-w-2xl" sticky={false}>
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.myProfile)}>بازگشت به پروفایل من</Button>
      </AppHeader>
      <main className="mx-auto max-w-2xl px-4">
        {loading ? <Skeleton className="mt-4 h-80 w-full rounded-2xl" /> : error || !p ? (
          <p className="py-10 text-center text-sm text-destructive">{error || "پروفایل پیدا نشد."}</p>
        ) : (
          <>
            {(p.status !== "approved" || (p.photo_status && p.photo_status !== "approved")) && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                {p.status !== "approved" && "حساب شما هنوز تأیید نشده و برای خانواده‌ها نمایش داده نمی‌شود."}
                {p.photo_status && p.photo_status !== "approved" && " عکس پروفایل شما هنوز تأیید نشده و برای خانواده‌ها نمایش داده نمی‌شود."}
              </div>
            )}
            <CaregiverProfileView p={p} />
          </>
        )}
      </main>
    </div>
  )
}
