import { api } from "./api"
import type { CaregiverAssignment } from "@/types/assignment"

export const assignmentService = {
  async listForCaregiver(caregiverUserId: number): Promise<CaregiverAssignment[]> {
    const { data } = await api.get("/api/care/assignments/", { params: { caregiver_user_id: caregiverUserId } })
    return data
  },

  async assign(caregiverUserId: number, patientCode: string, notes = "") {
    const { data } = await api.post("/api/care/assignments/", {
      caregiver_user_id: caregiverUserId, patient_code: patientCode, notes,
    })
    return data as CaregiverAssignment
  },

  async end(assignmentId: number) {
    const { data } = await api.post(`/api/care/assignments/${assignmentId}/end/`)
    return data as CaregiverAssignment
  },
}

export interface CaregiverSuggestion {
  caregiver_user_id: number
  caregiver_name: string
  caregiver_gender: string
  score: number
  reasons: string[]
  avg_rating: number | null
  review_count: number
  flexibility_score: number | null
  flexibility_sections: Record<string, number> | null
}

export const matchingService = {
  async suggestCaregivers(patientCode: string) {
    const { data } = await api.get("/api/care/suggest-caregivers/", { params: { patient_code: patientCode } })
    return data as { patient_name: string; patient_gender: string; suggestions: CaregiverSuggestion[] }
  },

  async patientQuestionnaire(patientCode: string) {
    const { data } = await api.get("/api/care/patient-questionnaire/", { params: { patient_code: patientCode } })
    return data as Record<string, string>
  },
}
