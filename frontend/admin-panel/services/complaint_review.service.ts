import { api } from "./api"

export interface ComplaintListItem {
  id: number
  category: string
  status: string
  patient_name: string | null
  caregiver_name: string | null
  filed_by_phone: string
  created_at: string
}

export interface ComplaintDetail extends ComplaintListItem {
  description: string
  voice_note: string | null
  resolution_note: string
  resolved_at: string | null
  updated_at: string
}

export const complaintReviewService = {
  async list(status?: string): Promise<ComplaintListItem[]> {
    const { data } = await api.get("/api/reviews/complaints/", { params: status ? { status } : {} })
    return data
  },

  async listAboutCaregiver(caregiverUserId: number): Promise<ComplaintListItem[]> {
    const { data } = await api.get("/api/reviews/complaints/", { params: { about_caregiver: caregiverUserId } })
    return data
  },

  async detail(id: number): Promise<ComplaintDetail> {
    const { data } = await api.get(`/api/reviews/complaints/${id}/`)
    return data
  },

  async markUnderReview(id: number) {
    const { data } = await api.post(`/api/reviews/complaints/${id}/under-review/`)
    return data as ComplaintDetail
  },

  async resolve(id: number, note: string) {
    const { data } = await api.post(`/api/reviews/complaints/${id}/resolve/`, { note })
    return data as ComplaintDetail
  },

  async dismiss(id: number, note: string) {
    const { data } = await api.post(`/api/reviews/complaints/${id}/dismiss/`, { note })
    return data as ComplaintDetail
  },
}
