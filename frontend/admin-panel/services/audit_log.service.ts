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

export interface AuditLogFilters {
  event_type?: string
  actor_user_id?: number
  target_user_id?: number
  start?: string
  end?: string
}

export const auditLogService = {
  async list(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    const params: Record<string, string | number> = {}
    if (filters.event_type) params.event_type = filters.event_type
    if (filters.actor_user_id) params.actor_user_id = filters.actor_user_id
    if (filters.target_user_id) params.target_user_id = filters.target_user_id
    if (filters.start) params.start = filters.start
    if (filters.end) params.end = filters.end

    const { data } = await api.get("/api/audit/logs/", { params })
    return data
  },
}
