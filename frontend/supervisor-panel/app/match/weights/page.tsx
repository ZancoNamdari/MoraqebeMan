"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { mcdmWeightService, MCDM_CRITERIA, MCDM_CRITERIA_LABELS } from "@/services/assignment.service"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

// The standard 1-9 AHP intensity scale (Saaty scale). Each pairwise
// judgment is stored as one of these values, or its reciprocal if the
// second criterion is judged more important than the first — the full
// 6x6 matrix is built from these 15 pairs before submitting, since a
// consistent AHP matrix is always reciprocal (a[j][i] = 1/a[i][j]) and
// has 1s on the diagonal, so there's no reason to make a supervisor
// fill in 36 cells when 15 judgments fully determine the matrix.
const INTENSITY_STOPS = [
  { value: 9, label: "خیلی مهم‌تر" },
  { value: 7, label: "بسیار مهم‌تر" },
  { value: 5, label: "مهم‌تر" },
  { value: 3, label: "کمی مهم‌تر" },
  { value: 1, label: "برابر" },
  { value: -3, label: "کمی مهم‌تر" },
  { value: -5, label: "مهم‌تر" },
  { value: -7, label: "بسیار مهم‌تر" },
  { value: -9, label: "خیلی مهم‌تر" },
]

function pairKey(i: number, j: number) {
  return `${MCDM_CRITERIA[i]}__${MCDM_CRITERIA[j]}`
}

function matrixToPairs(matrix: number[][]): Record<string, number> {
  const pairs: Record<string, number> = {}
  for (let i = 0; i < MCDM_CRITERIA.length; i++) {
    for (let j = i + 1; j < MCDM_CRITERIA.length; j++) {
      const raw = matrix[i][j]
      // Stored matrix value >= 1 means i is more important (positive
      // stop); < 1 means j is more important (negative stop, using
      // the reciprocal's magnitude).
      pairs[pairKey(i, j)] = raw >= 1 ? Math.round(raw) : -Math.round(1 / raw)
    }
  }
  return pairs
}

function pairsToMatrix(pairs: Record<string, number>): number[][] {
  const n = MCDM_CRITERIA.length
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(1))
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const stop = pairs[pairKey(i, j)] ?? 1
      const value = stop >= 1 ? stop : 1 / Math.abs(stop)
      matrix[i][j] = value
      matrix[j][i] = 1 / value
    }
  }
  return matrix
}

export default function MatchWeightsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [pairs, setPairs] = useState<Record<string, number>>({})
  const [consistencyRatio, setConsistencyRatio] = useState<number | null>(null)
  const [isDefault, setIsDefault] = useState(true)
  const [computedWeights, setComputedWeights] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    mcdmWeightService.get()
      .then((config) => {
        setPairs(matrixToPairs(config.pairwise_matrix))
        setConsistencyRatio(config.consistency_ratio)
        setIsDefault(config.is_default)
        setComputedWeights(config.weights)
      })
      .finally(() => setLoading(false))
  }, [])

  if (authLoading || !user) return null

  async function handleSave() {
    setSaving(true); setError(""); setMessage("")
    try {
      const matrix = pairsToMatrix(pairs)
      const result = await mcdmWeightService.save(matrix)
      setConsistencyRatio(result.consistency_ratio)
      setIsDefault(result.is_default)
      setComputedWeights(result.weights)
      setMessage("پیکربندی جدید ذخیره و فعال شد.")
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ذخیره با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    const equal: Record<string, number> = {}
    for (let i = 0; i < MCDM_CRITERIA.length; i++) {
      for (let j = i + 1; j < MCDM_CRITERIA.length; j++) {
        equal[pairKey(i, j)] = 1
      }
    }
    setPairs(equal)
    setMessage("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">تنظیم وزن معیارهای تطابق</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.match)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : (
          <>
            <Card className="border-pink-100 bg-pink-50/30">
              <CardContent className="pt-4 text-xs text-muted-foreground">
                <p>
                  برای هر جفت معیار، مشخص کنید کدام‌یک در رتبه‌بندی نهایی مراقبان پیشنهادی
                  اهمیت بیشتری دارد. این تنظیمات بر اساس روش AHP محاسبه می‌شوند و باید
                  <strong> منطقاً سازگار</strong> باشند — اگر قضاوت‌ها متناقض باشند (مثلاً
                  الف خیلی مهم‌تر از ب، ب خیلی مهم‌تر از ج، اما ج مهم‌تر از الف)، سیستم
                  ذخیره را رد می‌کند.
                </p>
                {isDefault && <p className="mt-2 font-medium text-rose-800">در حال حاضر از تنظیمات پیش‌فرض استفاده می‌شود.</p>}
              </CardContent>
            </Card>

            {error && <p className="text-sm text-rose-600">{error}</p>}
            {message && <p className="text-sm text-emerald-700">{message}</p>}

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-sm text-rose-800">مقایسه دو به دوی معیارها</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {MCDM_CRITERIA.map((a, i) =>
                  MCDM_CRITERIA.slice(i + 1).map((b, offset) => {
                    const j = i + 1 + offset
                    const key = pairKey(i, j)
                    const current = pairs[key] ?? 1
                    return (
                      <div key={key} className="space-y-1.5 rounded-lg border border-pink-100 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-rose-800">{MCDM_CRITERIA_LABELS[a]}</span>
                          <span className="text-muted-foreground">در برابر</span>
                          <span className="font-medium text-rose-800">{MCDM_CRITERIA_LABELS[b]}</span>
                        </div>
                        <div className="flex gap-1">
                          {INTENSITY_STOPS.map((stop, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPairs((prev) => ({ ...prev, [key]: stop.value }))}
                              className={cn(
                                "flex-1 rounded py-1 text-[10px] transition-colors",
                                current === stop.value
                                  ? "bg-brand-pink text-white"
                                  : "bg-pink-50 text-muted-foreground hover:bg-pink-100",
                              )}
                              title={`${stop.value > 0 ? a : b} ${stop.label}`}
                            >
                              {stop.value === 1 ? "=" : Math.abs(stop.value)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {computedWeights && (
              <Card className="border-pink-100 bg-pink-50/30">
                <CardHeader><CardTitle className="text-sm text-rose-800">وزن‌های محاسبه‌شده</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-xs">
                  {Object.entries(computedWeights).map(([criterion, weight]) => (
                    <div key={criterion} className="flex items-center justify-between">
                      <span>{MCDM_CRITERIA_LABELS[criterion] || criterion}</span>
                      <span className="font-medium text-rose-700">{(weight * 100).toFixed(1)}٪</span>
                    </div>
                  ))}
                  {consistencyRatio !== null && (
                    <p className={cn("mt-2 text-xs", consistencyRatio < 0.10 ? "text-emerald-700" : "text-rose-600")}>
                      نسبت سازگاری: {consistencyRatio.toFixed(3)} {consistencyRatio < 0.10 ? "(قابل‌قبول)" : "(ناسازگار — قابل ذخیره نیست)"}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-gradient-to-l from-brand-pink to-brand-mint-strong shadow-md shadow-brand-pink/20 hover:from-brand-pink-strong hover:to-brand-mint-strong"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "در حال ذخیره..." : "ذخیره و فعال‌سازی"}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={saving}>بازنشانی به برابر</Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
