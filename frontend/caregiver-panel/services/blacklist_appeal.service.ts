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

export const blacklistAppealService = {
  async list(): Promise<BlacklistAppeal[]> {
    const { data } = await api.get("/api/caregivers/me/blacklist-appeal/")
    return data
  },

  async submit(appeal_reason: string): Promise<BlacklistAppeal> {
    const { data } = await api.post("/api/caregivers/me/blacklist-appeal/", { appeal_reason })
    return data
  },
}
