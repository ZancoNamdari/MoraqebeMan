import { api } from "./api"

export interface BlacklistAppeal {
  id: number
  caregiver_name: string
  appeal_reason: string
  status: "pending" | "approved" | "denied"
  reviewer_name: string | null
  review_note: string
  reviewed_at: string | null
  created_at: string
}

export const blacklistAppealReviewService = {
  async list(status?: string): Promise<BlacklistAppeal[]> {
    const { data } = await api.get("/api/caregivers/blacklist-appeals/", { params: status ? { status } : {} })
    return data
  },

  async approve(id: number, note: string): Promise<BlacklistAppeal> {
    const { data } = await api.post(`/api/caregivers/blacklist-appeals/${id}/approve/`, { note })
    return data
  },

  async deny(id: number, note: string): Promise<BlacklistAppeal> {
    const { data } = await api.post(`/api/caregivers/blacklist-appeals/${id}/deny/`, { note })
    return data
  },
}
