"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, ChoiceSelect } from "@/components/forms/fields"
import { QUESTIONNAIRE_FIELDS } from "@/lib/constants"
import { myPatientService } from "@/services/patient.service"
import { ROUTES } from "@/lib/routes"
import type { Questionnaire } from "@/types/patient"

export default function QuestionnairePage() {
  const { user, loading: authLoading, logout } = useAuth(["patient"])
  const router = useRouter()
  const [answers, setAnswers] = useState<Partial<Questionnaire>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!user) return
    myPatientService.getQuestionnaire().then(setAnswers).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  if (authLoading || !user) return null

  async function handleSave(andContinue = false) {
    setSaving(true); setMessage("")
    try {
      const saved = await myPatientService.saveQuestionnaire(answers as Questionnaire)
      setAnswers(saved)
      if (andContinue) {
        router.push(ROUTES.access)
        return
      }
      setMessage("پرسشنامه ذخیره شد.")
    } finally {
      setSaving(false)
    }
  }

  const axes = Array.from(new Set(QUESTIONNAIRE_FIELDS.map((f) => f.axis)))

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b border-pink-100 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">پرسشنامه سازگاری</h1>
          <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
              <Button variant="ghost" size="sm" className="text-rose-600" onClick={logout}>خروج</Button>
            </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : (
          <>
            {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
            <p className="text-sm text-muted-foreground">این پرسشنامه به یافتن مراقب هماهنگ‌تر با سبک زندگی و ترجیحات شما کمک می‌کند.</p>

            {axes.map((axis) => (
              <Card key={axis} className="border-pink-100">
                <CardHeader><CardTitle className="text-sm text-rose-800">{axis}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {QUESTIONNAIRE_FIELDS.filter((f) => f.axis === axis).map((f) => (
                    <Field key={f.name} label={f.label}>
                      <ChoiceSelect
                        choices={f.scale}
                        value={(answers as any)[f.name] || ""}
                        onChange={(v) => setAnswers({ ...answers, [f.name]: v })}
                      />
                    </Field>
                  ))}
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-gradient-to-l from-pink-400 to-rose-400 shadow-md shadow-pink-200/50 hover:from-pink-500 hover:to-rose-500"
                size="lg" onClick={() => handleSave(false)} disabled={saving}
              >
                {saving ? "در حال ذخیره..." : "ذخیره پرسشنامه"}
              </Button>
              <Button
                variant="outline" className="flex-1 border-pink-200 text-rose-700 hover:bg-pink-50"
                size="lg" onClick={() => handleSave(true)} disabled={saving}
              >
                ذخیره و ادامه به دسترسی خانواده ←
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
