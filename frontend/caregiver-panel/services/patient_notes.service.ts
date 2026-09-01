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

export interface FilePatientNotePayload {
  patient: number
  category: string
  note: string
  flagged_urgent?: boolean
}

export const patientNotesService = {
  async list(): Promise<PatientNoteListItem[]> {
    const { data } = await api.get("/api/reviews/patient-notes/me/")
    return data
  },

  async file(payload: FilePatientNotePayload): Promise<PatientNoteListItem> {
    const { data } = await api.post("/api/reviews/patient-notes/me/", payload)
    return data
  },
}
