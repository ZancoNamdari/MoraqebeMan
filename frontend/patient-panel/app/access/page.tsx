"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChoiceSelect } from "@/components/forms/fields"
import { RELATION_TYPE } from "@/lib/constants"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/layout/app-header"
import { myPatientService } from "@/services/patient.service"
import { ROUTES } from "@/lib/routes"
import type { AccessLevel, FamilyLink } from "@/types/patient"

export default function AccessPage() {
  const { user, loading: authLoading, logout } = useAuth(["patient"])
  const router = useRouter()
  const [links, setLinks] = useState<FamilyLink[]>([])
  const [pending, setPending] = useState<FamilyLink[]>([])
  const [loading, setLoading] = useState(true)

  const [familyCode, setFamilyCode] = useState("")
  const [relation, setRelation] = useState("")
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("full_access")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  function refresh() {
    return Promise.all([
      myPatientService.listFamilyLinks().then(setLinks),
      myPatientService.listAccessRequests().then(setPending),
    ])
  }

  useEffect(() => {
    if (!user) return
    refresh().finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  async function handleInvite() {
    setBusy(true); setError("")
    try {
      await myPatientService.inviteFamilyByCode({ family_code: familyCode.trim().toUpperCase(), relation, access_level: accessLevel })
      setFamilyCode(""); setRelation("")
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.detail || "افزودن با خطا مواجه شد.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDecision(linkId: number, decision: "approve" | "reject") {
    await myPatientService.decideAccessRequest(linkId, decision)
    refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background pb-10">
      <AppHeader title="دسترسی خانواده" maxWidth="max-w-xl">
        <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
              <Button variant="ghost" size="sm" className="text-primary-strong" onClick={logout}>خروج</Button>
            </div>
      </AppHeader>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <>
            {pending.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/60">
                <CardHeader><CardTitle className="text-sm text-amber-900">درخواست‌های در انتظار تأیید</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {pending.map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3">
                      <div>
                        <p className="text-sm font-medium">{l.family_display_name || l.family_phone_number}</p>
                        <p className="text-xs text-muted-foreground">درخواست دسترسی به عنوان «{l.relation}»</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleDecision(l.id, "approve")}>تأیید</Button>
                        <Button size="sm" variant="outline" className="border-border text-primary-strong hover:bg-secondary" onClick={() => handleDecision(l.id, "reject")}>رد</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-border">
              <CardHeader><CardTitle className="text-foreground">اعضای خانواده با دسترسی</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {links.length === 0 ? (
                  <p className="text-sm text-muted-foreground">هنوز عضوی از خانواده دسترسی ندارد.</p>
                ) : (
                  <div className="space-y-2">
                    {links.map((l) => (
                      <div key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-3">
                        <div>
                          <p className="text-sm font-medium">{l.family_display_name || l.family_phone_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {l.relation}{l.is_primary_contact && " · مخاطب اصلی"} · {l.access_level === "full_access" ? "دسترسی کامل" : "فقط مشاهده"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground">افزودن عضو خانواده با کد عضویت او</p>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Input placeholder="کد عضو (مثلاً FAM-92K7XQ)" className="w-44" value={familyCode} onChange={(e) => setFamilyCode(e.target.value)} dir="ltr" />
                    <div className="w-28"><ChoiceSelect choices={RELATION_TYPE} value={relation} onChange={setRelation} placeholder="نسبت" /></div>
                    <select
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      value={accessLevel}
                      onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
                    >
                      <option value="full_access">دسترسی کامل</option>
                      <option value="view_only">فقط مشاهده</option>
                    </select>
                    <Button variant="outline" className="border-border text-primary-strong hover:bg-secondary" disabled={busy || !familyCode || !relation} onClick={handleInvite}>
                      + افزودن
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline" className="w-full border-border text-primary-strong hover:bg-secondary"
              size="lg" onClick={() => router.push(ROUTES.care)}
            >
              ادامه به تیم مراقبت ←
            </Button>
          </>
        )}
      </main>
    </div>
  )
}
