"use client"

import { useEffect, useState } from "react"
import { Select } from "@/components/ui/select"
import { Field } from "@/components/forms/fields"
import { locationService } from "@/services/location.service"
import type { City, District, Province } from "@/types/location"

export interface LocationValue {
  province: number | null
  city: number | null
  district: number | null
}

interface Props extends LocationValue {
  onChange: (values: LocationValue) => void
  districtRequired?: boolean
}

/**
 * Cascading province -> city -> district selects. Backend fields are
 * real ForeignKeys (apps.locations.Province/City/District) — this
 * component works with ids throughout, not name strings, matching
 * what the API actually stores and expects now.
 *
 * Only Tehran currently has seeded district/neighborhood data (128
 * entries) — every other city has zero. Since district is a real FK
 * now, there's no way to "just type a name" for the other 233 cities
 * the way there was when this field was plain text — so this shows an
 * honest disabled state ("no district data for this city yet")
 * instead of a free-text input that would fail validation on submit.
 * The field stays optional either way.
 */
export function LocationPicker({ province, city, district, onChange, districtRequired }: Props) {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])

  useEffect(() => {
    locationService.provinces().then(setProvinces).catch(() => {})
  }, [])

  useEffect(() => {
    if (!province) {
      setCities([])
      return
    }
    locationService.cities(province).then(setCities).catch(() => {})
  }, [province])

  useEffect(() => {
    if (!city) {
      setDistricts([])
      return
    }
    locationService.districts(city).then(setDistricts).catch(() => {})
  }, [city])

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Field label="استان">
        <Select
          value={province ?? ""}
          onChange={(e) => onChange({ province: e.target.value ? Number(e.target.value) : null, city: null, district: null })}
        >
          <option value="">انتخاب استان...</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="شهر">
        <Select
          value={city ?? ""}
          disabled={!province}
          onChange={(e) => onChange({ province, city: e.target.value ? Number(e.target.value) : null, district: null })}
        >
          <option value="">{province ? "انتخاب شهر..." : "ابتدا استان را انتخاب کنید"}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="منطقه / محله" required={districtRequired}>
        <Select
          value={district ?? ""}
          disabled={!city || districts.length === 0}
          onChange={(e) => onChange({ province, city, district: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">
            {!city ? "ابتدا شهر را انتخاب کنید" : districts.length === 0 ? "منطقه‌ای برای این شهر ثبت نشده" : "انتخاب منطقه..."}
          </option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </Field>
    </div>
  )
}
