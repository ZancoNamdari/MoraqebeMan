import { api } from "./api"
import type { PublicCaregiverCard, PublicCaregiverProfile } from "@/types/caregiver-public"

export const caregiverDirectoryService = {
  async list(params: { q?: string; service_type?: string; gender?: string; page?: number } = {}) {
    const { data } = await api.get("/api/caregivers/public/", { params })
    return data as { count: number; page: number; page_size: number; results: PublicCaregiverCard[] }
  },

  async get(id: number | string): Promise<PublicCaregiverProfile> {
    const { data } = await api.get(`/api/caregivers/public/${id}/`)
    return data
  },
}
