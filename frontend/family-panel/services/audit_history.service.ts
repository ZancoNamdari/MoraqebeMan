import { api } from "./api"

export interface AuditLogEntry {
  id: number
  event_type: string
  event_type_label: string
  actor_user_id: number | null
  actor_name: string | null
  target_user_id: number | null
  target_name: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export const auditHistoryService = {
  async forPatient(patientId: number, filters?: { start?: string; end?: string }): Promise<AuditLogEntry[]> {
    const params: Record<string, string> = {}
    if (filters?.start) params.start = filters.start
    if (filters?.end) params.end = filters.end
    const { data } = await api.get(`/api/audit/logs/patient/${patientId}/`, { params })
    return data
  },
}
