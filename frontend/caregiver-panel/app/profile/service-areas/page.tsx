"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Field } from "@/components/forms/fields"
import { serviceAreasService, type MyServiceArea } from "@/services/experience_skills.service"
import { locationService } from "@/services/location.service"
import type { Province, City, District } from "@/types/location"
import { ROUTES } from "@/lib/routes"

export default function ServiceAreasPage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()

  const [areas, setAreas] = useState<MyServiceArea[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [provinces, setProvinces] = useState<Province[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [selectedProvince, setSelectedProvince] = useState<number | null>(null)
  const [selectedCity, setSelectedCity] = useState<number | null>(null)
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([serviceAreasService.list(), locationService.provinces()])
      .then(([areaList, provinceList]) => { setAreas(areaList); setProvinces(provinceList) })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (selectedProvince) locationService.cities(selectedProvince).then(setCities)
    else setCities([])
    setSelectedCity(null); setSelectedDistrict(null)
  }, [selectedProvince])

  useEffect(() => {
    if (selectedCity) locationService.districts(selectedCity).then(setDistricts)
    else setDistricts([])
    setSelectedDistrict(null)
  }, [selectedCity])

  if (authLoading || !user) return null

  async function handleAdd() {
    if (!selectedProvince) return
    setSaving(true); setError("")
    try {
      const created = await serviceAreasService.add(selectedProvince, selectedCity, selectedDistrict)
      setAreas((prev) => [...prev, created])
      setSelectedProvince(null); setSelectedCity(null); setSelectedDistrict(null)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "افزودن منطقه با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: number) {
    await serviceAreasService.remove(id)
    setAreas((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">مناطق خدماتی</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          مناطقی را اضافه کنید که حاضرید در آن‌ها به سالمندان سر بزنید. می‌توانید فقط استان،
          یا استان و شهر، یا هر سه سطح را برای هر منطقه مشخص کنید.
        </p>

        <Card className="border-pink-100">
          <CardHeader><CardTitle className="text-base text-rose-900">افزودن منطقه جدید</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}
            <div className="grid grid-cols-3 gap-3">
              <Field label="استان">
                <Select value={selectedProvince ?? ""} onChange={(e) => setSelectedProvince(Number(e.target.value) || null)}>
                  <option value="">انتخاب کنید...</option>
                  {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="شهر (اختیاری)">
                <Select value={selectedCity ?? ""} onChange={(e) => setSelectedCity(Number(e.target.value) || null)} disabled={!selectedProvince}>
                  <option value="">همه شهرها</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="منطقه (اختیاری)">
                <Select value={selectedDistrict ?? ""} onChange={(e) => setSelectedDistrict(Number(e.target.value) || null)} disabled={!selectedCity}>
                  <option value="">همه مناطق</option>
                  {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
            </div>
            <Button size="sm" disabled={!selectedProvince || saving} onClick={handleAdd}>
              {saving ? "در حال افزودن..." : "افزودن به فهرست"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-pink-100">
          <CardHeader><CardTitle className="text-base text-rose-900">مناطق ثبت‌شده ({areas.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full rounded-2xl" />
            ) : areas.length === 0 ? (
              <p className="text-sm text-muted-foreground">هنوز منطقه‌ای اضافه نکرده‌اید.</p>
            ) : (
              <div className="space-y-2">
                {areas.map((area) => (
                  <div key={area.id} className="flex items-center justify-between rounded-lg border border-pink-100 bg-pink-50/40 p-3">
                    <span className="text-sm">
                      {[area.province_name, area.city_name, area.district_name].filter(Boolean).join(" / ")}
                    </span>
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleRemove(area.id)}>
                      حذف
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
