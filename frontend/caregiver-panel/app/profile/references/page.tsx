"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, ChoiceSelect } from "@/components/forms/fields"
import { referencesService, type Reference } from "@/services/references.service"
import { REFERENCE_RELATION_TYPE, REFERENCE_ACQUAINTANCE_DURATION } from "@/lib/constants"
import { ROUTES } from "@/lib/routes"

const emptyReference: Reference = {
  full_name: "", occupation: "", relation_type: "", acquaintance_duration: "",
  phone_number: "", callable_for_inquiry: true,
}

export default function ReferencesPage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()

  const [references, setReferences] = useState<Reference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    referencesService.list().then(setReferences).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  function update(index: number, patch: Partial<Reference>) {
    setReferences((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
    setSaved(false)
  }

  function addReference() {
    setReferences((prev) => [...prev, { ...emptyReference }])
    setSaved(false)
  }

  function removeReference(index: number) {
    setReferences((prev) => prev.filter((_, i) => i !== index))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true); setError(""); setSaved(false)
    try {
      const savedData = await referencesService.saveAll(references)
      setReferences(savedData)
      setSaved(true)
    } catch (err: any) {
      const detail = err?.response?.data
      setError(typeof detail === "object" ? JSON.stringify(detail) : "ثبت معرف‌ها با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">معرف‌ها</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <p className="text-xs text-muted-foreground">
          ثبت معرف اختیاری است — می‌توانید بدون آن هم پروفایل خود را کامل کنید.
        </p>

        {loading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <>
            {saved && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">معرف‌ها با موفقیت ذخیره شد.</div>}
            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

            {references.map((ref, index) => (
              <Card key={index} className="border-pink-100">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm text-rose-900">معرف {index + 1}</CardTitle>
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => removeReference(index)}>حذف</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="نام کامل" required>
                      <Input value={ref.full_name} onChange={(e) => update(index, { full_name: e.target.value })} />
                    </Field>
                    <Field label="شغل">
                      <Input value={ref.occupation} onChange={(e) => update(index, { occupation: e.target.value })} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="نسبت">
                      <ChoiceSelect choices={REFERENCE_RELATION_TYPE} value={ref.relation_type} onChange={(v) => update(index, { relation_type: v })} />
                    </Field>
                    <Field label="مدت آشنایی">
                      <ChoiceSelect choices={REFERENCE_ACQUAINTANCE_DURATION} value={ref.acquaintance_duration} onChange={(v) => update(index, { acquaintance_duration: v })} />
                    </Field>
                  </div>
                  <Field label="شماره تلفن" required>
                    <Input dir="ltr" value={ref.phone_number} onChange={(e) => update(index, { phone_number: e.target.value })} />
                  </Field>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={ref.callable_for_inquiry} onChange={(e) => update(index, { callable_for_inquiry: e.target.checked })} />
                    امکان تماس جهت استعلام وجود دارد
                  </label>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="w-full border-pink-200 text-rose-700 hover:bg-pink-50" onClick={addReference}>
              + افزودن معرف
            </Button>
          </>
        )}
      </main>

      {!loading && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <Button className="w-full" disabled={saving} onClick={handleSave}>
              {saving ? "در حال ذخیره..." : "ذخیره معرف‌ها"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
