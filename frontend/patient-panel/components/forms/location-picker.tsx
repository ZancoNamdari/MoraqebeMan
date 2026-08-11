"use client"

import { useEffect, useState } from "react"
import { Field } from "@/components/forms/fields"
import { Combobox } from "@/components/forms/combobox"
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
 * Cascading province -> city -> district — each one a searchable
 * combobox (type to filter by "starts with", click to select), not a
 * long scrolling dropdown. Backend fields are real ForeignKeys
 * (apps.locations.Province/City/District), so this works with ids
 * throughout, not name strings.
 *
 * Only Tehran currently has seeded district/neighborhood data (128
 * entries) — every other city has zero. Since district is a real FK,
 * there's no way to "just type a name" for the other 233 cities the
 * way there was when this field was plain text — so this shows an
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
        <Combobox
          options={provinces}
          value={province}
          onChange={(id) => onChange({ province: id, city: null, district: null })}
          placeholder="جستجوی استان..."
        />
      </Field>

      <Field label="شهر">
        <Combobox
          options={cities}
          value={city}
          disabled={!province}
          disabledPlaceholder="ابتدا استان را انتخاب کنید"
          onChange={(id) => onChange({ province, city: id, district: null })}
          placeholder="جستجوی شهر..."
        />
      </Field>

      <Field label="منطقه / محله" required={districtRequired}>
        {districts.length > 0 ? (
          <Combobox
            options={districts}
            value={district}
            disabled={!city}
            onChange={(id) => onChange({ province, city, district: id })}
            placeholder="جستجوی منطقه..."
          />
        ) : (
          <Combobox
            options={[]}
            value={null}
            disabled
            disabledPlaceholder={city ? "منطقه‌ای برای این شهر ثبت نشده" : "ابتدا شهر را انتخاب کنید"}
            onChange={() => {}}
            placeholder=""
          />
        )}
      </Field>
    </div>
  )
}
