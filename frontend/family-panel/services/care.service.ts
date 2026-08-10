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
}
