import { api } from "./api"
import type { CaregiverFullProfile, CaregiverListItem } from "@/types/caregiver_review"

export const caregiverReviewService = {
  async list() {
    const { data } = await api.get("/api/supervisor/caregivers/")
    return data as CaregiverListItem[]
  },

  async fullProfile(userId: number) {
    const { data } = await api.get(`/api/supervisor/caregivers/${userId}/full/`)
    return data as CaregiverFullProfile
  },

  async approve(userId: number) {
    const { data } = await api.post(`/api/caregivers/${userId}/approve/`)
    return data as { detail: string; status: string; missing?: string[] }
  },

  async reject(userId: number, reason: string) {
    const { data } = await api.post(`/api/caregivers/${userId}/reject/`, { reason })
    return data as { detail: string; status: string; rejection_reason: string }
  },

  async blacklist(userId: number, reason: string) {
    const { data } = await api.post(`/api/caregivers/${userId}/blacklist/`, { reason })
    return data as { detail: string; status: string; blacklist_reason: string }
  },

  async unblacklist(userId: number) {
    const { data } = await api.post(`/api/caregivers/${userId}/unblacklist/`)
    return data as { detail: string; status: string }
  },
}
