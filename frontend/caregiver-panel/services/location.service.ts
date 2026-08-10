import { api } from "./api"
import type { City, District, Province } from "@/types/location"

export const locationService = {
  async provinces(): Promise<Province[]> {
    const { data } = await api.get("/api/locations/provinces/")
    return data
  },
  async cities(provinceId: number): Promise<City[]> {
    const { data } = await api.get("/api/locations/cities/", { params: { province_id: provinceId } })
    return data
  },
  async districts(cityId: number): Promise<District[]> {
    const { data } = await api.get("/api/locations/districts/", { params: { city_id: cityId } })
    return data
  },
}
