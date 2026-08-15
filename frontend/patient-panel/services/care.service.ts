import { api } from "./api"
import type { CaregiverAssignment, CareLogEntry } from "@/types/care"

export const careService = {
  async team(patientId: number): Promise<CaregiverAssignment[]> {
    const { data } = await api.get(`/api/care/patients/${patientId}/team/`)
    return data
  },

  async timeline(patientId: number): Promise<CareLogEntry[]> {
    const { data } = await api.get(`/api/care/patients/${patientId}/timeline/`)
    return data
  },

  async submitReview(assignmentId: number, rating: number, comment: string) {
    const { data } = await api.post(`/api/care/assignments/${assignmentId}/review/`, { rating, comment })
    return data
  },
}
