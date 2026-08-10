import { api } from "./api"
import type { CaregiverAssignment, CareLogCategory, CareLogEntry } from "@/types/care"

export const careService = {
  async myPatients(): Promise<CaregiverAssignment[]> {
    const { data } = await api.get("/api/care/me/patients/")
    return data
  },

  async myLogEntries(patientId?: number): Promise<CareLogEntry[]> {
    const { data } = await api.get("/api/care/me/log-entries/", { params: patientId ? { patient: patientId } : {} })
    return data
  },

  async submitLogEntry(patientId: number, category: CareLogCategory, note: string) {
    const { data } = await api.post("/api/care/me/log-entries/", { patient: patientId, category, note })
    return data as CareLogEntry
  },
}
