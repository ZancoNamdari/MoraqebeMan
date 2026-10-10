import { api } from "./api"
import type { CaregiverAssignment, CareLogCategory, CareLogEntry } from "@/types/care"

export interface ServiceHistoryItem {
  id: number
  recipient_name: string
  service_type: string
  service_type_display: string
  status: "active" | "ended"
  assigned_at: string | null
  ended_at: string | null
  report_count: number
}

export const careService = {
  async myServiceHistory(): Promise<ServiceHistoryItem[]> {
    const { data } = await api.get("/api/care/me/service-history/")
    return data
  },

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
