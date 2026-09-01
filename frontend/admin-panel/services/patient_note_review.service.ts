import { api } from "./api"

export interface PatientNoteListItem {
  id: number
  category: string
  flagged_urgent: boolean
  patient_name: string | null
  caregiver_name: string
  acknowledged_at: string | null
  created_at: string
}

export interface PatientNoteDetail extends PatientNoteListItem {
  note: string
  updated_at: string
}

export const patientNoteReviewService = {
  async list(filters?: { flagged_urgent?: boolean; unacknowledged?: boolean }): Promise<PatientNoteListItem[]> {
    const params: Record<string, string> = {}
    if (filters?.flagged_urgent) params.flagged_urgent = "true"
    if (filters?.unacknowledged) params.unacknowledged = "true"
    const { data } = await api.get("/api/reviews/patient-notes/", { params })
    return data
  },

  async detail(id: number): Promise<PatientNoteDetail> {
    const { data } = await api.get(`/api/reviews/patient-notes/${id}/`)
    return data
  },

  async acknowledge(id: number) {
    const { data } = await api.post(`/api/reviews/patient-notes/${id}/acknowledge/`)
    return data as PatientNoteDetail
  },
}
