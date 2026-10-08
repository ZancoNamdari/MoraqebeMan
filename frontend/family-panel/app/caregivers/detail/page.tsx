"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CaregiverProfileView } from "@/components/caregivers/profile-view"
import { caregiverDirectoryService } from "@/services/caregiver-directory.service"
import type { PublicCaregiverProfile } from "@/types/caregiver-public"
import { ROUTES } from "@/lib/routes"

function Content() {
  const { user, loading: authLoading } = useAuth(["family"])
  const router = useRouter()
  const id = useSearchParams().get("id")
  const [p, setP] = useState<PublicCaregiverProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user || !id) return
    caregiverDirectoryService.get(id).then(setP).catch(() => setError("این مراقب پیدا نشد.")).finally(() => setLoading(false))
  }, [user, id])

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold">پروفایل مراقب</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.caregivers)}>بازگشت به فهرست</Button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4">
        {loading ? <Skeleton className="mt-4 h-80 w-full rounded-2xl" /> : error || !p ? (
          <p className="py-10 text-center text-sm text-destructive">{error || "این مراقب پیدا نشد."}</p>
        ) : (
          <CaregiverProfileView p={p} />
        )}
      </main>
    </div>
  )
}

export default function CaregiverDetailPage() {
  return <Suspense fallback={null}><Content /></Suspense>
}
