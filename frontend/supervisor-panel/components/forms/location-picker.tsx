"use client"

import { useEffect, useState } from "react"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/forms/fields"
import { locationService } from "@/services/location.service"
import type { City, District, Province } from "@/types/location"

interface Props {
  province: string
  city: string
  district: string
  onChange: (values: { province: string; city: string; district: string }) => void
  districtRequired?: boolean
}

/**
 * Cascading province -> city -> district selects, backed by the real
 * apps.locations data (31 provinces, 234 cities) — replaces free-text
 * typing for the fields supervisors fill in most often. The backend
 * stores these as plain name strings (not foreign keys), so this
 * component looks up IDs purely to drive the cascading fetches and
 * always reports back the selected NAME.
 *
 * Only Tehran currently has seeded district/neighborhood data (128
 * entries) — every other city has zero. A dropdown with no options
 * would make it impossible to enter anything for those, so district
 * falls back to free text whenever the selected city has no matching
 * options, rather than silently blocking data entry for 233 of 234
 * cities.
 */
export function LocationPicker({ province, city, district, onChange, districtRequired }: Props) {
  const [provinces, setProvinces] = useState<Province[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])

  useEffect(() => {
    locationService.provinces().then(setProvinces).catch(() => {})
  }, [])

  const selectedProvince = provinces.find((p) => p.name === province)
  const selectedCity = cities.find((c) => c.name === city)

  useEffect(() => {
    if (!selectedProvince) {
      setCities([])
      return
    }
    locationService.cities(selectedProvince.id).then(setCities).catch(() => {})
  }, [selectedProvince?.id])

  useEffect(() => {
    if (!selectedCity) {
      setDistricts([])
      return
    }
    locationService.districts(selectedCity.id).then(setDistricts).catch(() => {})
  }, [selectedCity?.id])

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Field label="استان" required>
        <Select
          value={province}
          onChange={(e) => onChange({ province: e.target.value, city: "", district: "" })}
        >
          <option value="">انتخاب استان...</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="شهر" required>
        <Select
          value={city}
          disabled={!province}
          onChange={(e) => onChange({ province, city: e.target.value, district: "" })}
        >
          <option value="">{province ? "انتخاب شهر..." : "ابتدا استان را انتخاب کنید"}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="منطقه / محله" required={districtRequired}>
        {districts.length > 0 ? (
          <Select value={district} onChange={(e) => onChange({ province, city, district: e.target.value })}>
            <option value="">انتخاب منطقه...</option>
            {districts.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </Select>
        ) : (
          <Input
            value={district}
            disabled={!city}
            placeholder={city ? "نام منطقه یا محله را بنویسید" : "ابتدا شهر را انتخاب کنید"}
            onChange={(e) => onChange({ province, city, district: e.target.value })}
          />
        )}
      </Field>
    </div>
  )
}
