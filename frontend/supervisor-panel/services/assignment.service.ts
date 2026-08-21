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
  caregiver_id: number
  caregiver_name: string
  caregiver_gender: string
  waterfall_reasons: string[]
  objective_fit_score: number | null
  objective_criterion_scores: { gender: number | null; age: number | null; location: number | null }
  objective_reasons: string[]
  score: number | null
  trait_match_available: boolean
  trait_match_score: number | null
  trait_dimension_scores: Record<string, number>
  trait_dimension_labels: Record<string, string>
  caregiver_cfi: number | null
  flexibility_score: number | null
  flexibility_sections: Record<string, number> | null
  avg_rating: number | null
  review_count: number
  active_patient_count: number
  mcdm_score: number | null
  mcdm_method: string
  ahp_weights: Record<string, number>
  ahp_consistency_ratio: number | null
  match_confidence: "high" | "medium" | "low"
  explanation: {
    summary: string
    confidence: string
    strengths: string[]
    weaknesses: string[]
  }
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
