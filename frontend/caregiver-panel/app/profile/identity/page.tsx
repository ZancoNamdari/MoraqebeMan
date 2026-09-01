"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, ChoiceSelect, CheckboxGroup, YesNo } from "@/components/forms/fields"
import { identityService, type MyIdentityProfile } from "@/services/identity.service"
import { locationService } from "@/services/location.service"
import type { Province, City, District } from "@/types/location"
import {
  GENDER, MARITAL_STATUS, CHILDREN_COUNT, MILITARY_STATUS, HEIGHT_RANGE, WEIGHT_RANGE,
  ETHNICITY, CHRONIC_DISEASE_TYPE, MEDICATION_TYPE, EMERGENCY_CONTACT_RELATION,
} from "@/lib/constants"
import { parseJalaliDate, formatJalaliDate, daysInJalaliMonth, PERSIAN_MONTH_LIST, JALALI_YEAR_RANGE } from "@/lib/jalali"
import { ROUTES } from "@/lib/routes"

const emptyForm: MyIdentityProfile = {
  full_name: "", father_name: "", birth_certificate_number: "", birth_certificate_issue_place: "",
  birth_date: null, gender: "", marital_status: "", children_count: "", military_status: "",
  height_range: "", weight_range: "", ethnicities: [],
  has_chronic_disease: null, chronic_disease_types: [],
  takes_permanent_medication: null, medication_types: [],
  emergency_contact_phone: "", emergency_contact_relation: "", landline_phone: "",
  province: null, city: null, district: null, postal_code: "", full_address: "",
}

export default function IdentityFormPage() {
  const { user, loading: authLoading } = useAuth(["caregiver"])
  const router = useRouter()

  const [form, setForm] = useState<MyIdentityProfile>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const [provinces, setProvinces] = useState<Province[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])

  const birthParts = parseJalaliDate(form.birth_date || "")

  useEffect(() => {
    if (!user) return
    Promise.all([identityService.me(), locationService.provinces()])
      .then(([identity, provinceList]) => {
        if (identity) setForm({ ...emptyForm, ...identity })
        setProvinces(provinceList)
      })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (form.province) locationService.cities(form.province).then(setCities)
    else setCities([])
  }, [form.province])

  useEffect(() => {
    if (form.city) locationService.districts(form.city).then(setDistricts)
    else setDistricts([])
  }, [form.city])

  if (authLoading || !user) return null

  function set<K extends keyof MyIdentityProfile>(key: K, value: MyIdentityProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function setBirthPart(part: "year" | "month" | "day", value: number) {
    const current = parseJalaliDate(form.birth_date || "")
    const next = { ...current, [part]: value }
    set("birth_date", formatJalaliDate(next.year, next.month, next.day))
  }

  async function handleSave() {
    setSaving(true); setError(""); setSaved(false)
    try {
      const savedData = await identityService.save(form)
      setForm({ ...emptyForm, ...savedData })
      setSaved(true)
    } catch (err: any) {
      const detail = err?.response?.data
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" — ") : "ثبت اطلاعات با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-background to-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
          <h1 className="font-bold text-rose-900">اطلاعات هویتی</h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.dashboard)}>بازگشت</Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : (
          <>
            {saved && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">اطلاعات با موفقیت ذخیره شد.</div>}
            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-base text-rose-900">مشخصات فردی</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="نام کامل"><Input value={form.full_name} disabled /></Field>
                <Field label="نام پدر"><Input value={form.father_name} onChange={(e) => set("father_name", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="شماره شناسنامه"><Input value={form.birth_certificate_number} onChange={(e) => set("birth_certificate_number", e.target.value)} /></Field>
                  <Field label="محل صدور شناسنامه"><Input value={form.birth_certificate_issue_place} onChange={(e) => set("birth_certificate_issue_place", e.target.value)} /></Field>
                </div>
                <Field label="تاریخ تولد (شمسی)">
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={birthParts.day ?? ""} onChange={(e) => setBirthPart("day", Number(e.target.value))}>
                      <option value="">روز</option>
                      {Array.from({ length: daysInJalaliMonth(birthParts.year || 1400, birthParts.month || 1) }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Select>
                    <Select value={birthParts.month ?? ""} onChange={(e) => setBirthPart("month", Number(e.target.value))}>
                      <option value="">ماه</option>
                      {PERSIAN_MONTH_LIST.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                    <Select value={birthParts.year ?? ""} onChange={(e) => setBirthPart("year", Number(e.target.value))}>
                      <option value="">سال</option>
                      {JALALI_YEAR_RANGE.map((y) => <option key={y} value={y}>{y}</option>)}
                    </Select>
                  </div>
                </Field>
                <Field label="جنسیت"><ChoiceSelect choices={GENDER} value={form.gender || ""} onChange={(v) => set("gender", v)} /></Field>
                <Field label="وضعیت تأهل"><ChoiceSelect choices={MARITAL_STATUS} value={form.marital_status || ""} onChange={(v) => set("marital_status", v)} /></Field>
                <Field label="تعداد فرزندان"><ChoiceSelect choices={CHILDREN_COUNT} value={form.children_count || ""} onChange={(v) => set("children_count", v)} /></Field>
                {form.gender === "male" && (
                  <Field label="وضعیت نظام وظیفه"><ChoiceSelect choices={MILITARY_STATUS} value={form.military_status || ""} onChange={(v) => set("military_status", v)} /></Field>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="قد"><ChoiceSelect choices={HEIGHT_RANGE} value={form.height_range || ""} onChange={(v) => set("height_range", v)} /></Field>
                  <Field label="وزن"><ChoiceSelect choices={WEIGHT_RANGE} value={form.weight_range || ""} onChange={(v) => set("weight_range", v)} /></Field>
                </div>
                <Field label="قومیت (می‌توانید چند مورد انتخاب کنید)">
                  <CheckboxGroup choices={ETHNICITY} value={form.ethnicities || []} onChange={(v) => set("ethnicities", v)} />
                </Field>
              </CardContent>
            </Card>

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-base text-rose-900">سلامت</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="آیا بیماری زمینه‌ای دارید؟">
                  <YesNo value={form.has_chronic_disease ?? null} onChange={(v) => set("has_chronic_disease", v)} />
                </Field>
                {form.has_chronic_disease && (
                  <Field label="نوع بیماری" required>
                    <CheckboxGroup choices={CHRONIC_DISEASE_TYPE} value={form.chronic_disease_types || []} onChange={(v) => set("chronic_disease_types", v)} />
                  </Field>
                )}
                <Field label="آیا داروی دائمی مصرف می‌کنید؟">
                  <YesNo value={form.takes_permanent_medication ?? null} onChange={(v) => set("takes_permanent_medication", v)} />
                </Field>
                {form.takes_permanent_medication && (
                  <Field label="نوع دارو" required>
                    <CheckboxGroup choices={MEDICATION_TYPE} value={form.medication_types || []} onChange={(v) => set("medication_types", v)} />
                  </Field>
                )}
              </CardContent>
            </Card>

            <Card className="border-pink-100">
              <CardHeader><CardTitle className="text-base text-rose-900">تماس اضطراری و آدرس</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="شماره تماس اضطراری"><Input dir="ltr" value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} /></Field>
                  <Field label="نسبت"><ChoiceSelect choices={EMERGENCY_CONTACT_RELATION} value={form.emergency_contact_relation || ""} onChange={(v) => set("emergency_contact_relation", v)} /></Field>
                </div>
                <Field label="تلفن ثابت"><Input dir="ltr" value={form.landline_phone} onChange={(e) => set("landline_phone", e.target.value)} /></Field>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="استان">
                    <Select value={form.province ?? ""} onChange={(e) => { set("province", Number(e.target.value) || null); set("city", null); set("district", null) }}>
                      <option value="">انتخاب کنید...</option>
                      {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="شهر">
                    <Select value={form.city ?? ""} onChange={(e) => { set("city", Number(e.target.value) || null); set("district", null) }} disabled={!form.province}>
                      <option value="">انتخاب کنید...</option>
                      {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="منطقه">
                    <Select value={form.district ?? ""} onChange={(e) => set("district", Number(e.target.value) || null)} disabled={!form.city}>
                      <option value="">انتخاب کنید...</option>
                      {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="کد پستی"><Input dir="ltr" value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} /></Field>
                <Field label="آدرس کامل"><Input value={form.full_address} onChange={(e) => set("full_address", e.target.value)} /></Field>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {!loading && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <Button className="w-full" disabled={saving} onClick={handleSave}>
              {saving ? "در حال ذخیره..." : "ذخیره اطلاعات"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
