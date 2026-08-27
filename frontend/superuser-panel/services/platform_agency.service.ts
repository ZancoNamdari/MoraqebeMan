import { api } from "./api"
import type { CreateAgencyPayload, PlatformAgencyListItem } from "@/types/platform_agency"

export const platformAgencyService = {
  async list() {
    const { data } = await api.get("/api/agencies/")
    return data as PlatformAgencyListItem[]
  },

  async create(payload: CreateAgencyPayload) {
    const { data } = await api.post("/api/agencies/", payload)
    return data as { id: number; company_name: string; access_code: string }
  },
}
