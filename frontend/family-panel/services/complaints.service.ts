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

export interface FileComplaintPayload {
  patient: number
  category: string
  description: string
  voice_note?: File | null
}

export const complaintsService = {
  async list(): Promise<ComplaintListItem[]> {
    const { data } = await api.get("/api/reviews/complaints/me/")
    return data
  },

  async file(payload: FileComplaintPayload): Promise<ComplaintDetail> {
    const formData = new FormData()
    formData.append("patient", String(payload.patient))
    formData.append("category", payload.category)
    formData.append("description", payload.description)
    if (payload.voice_note) formData.append("voice_note", payload.voice_note)

    // The api instance sets Content-Type: application/json globally
    // (see services/api.ts) — explicitly clearing it here lets axios/
    // the browser correctly auto-generate the multipart boundary for
    // this specific FormData request instead of fighting the global
    // default, which is the standard, documented way to handle this
    // exact conflict.
    const { data } = await api.post("/api/reviews/complaints/me/", formData, {
      headers: { "Content-Type": undefined },
    })
    return data
  },
}
