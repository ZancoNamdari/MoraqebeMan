import { api } from "./api"
import type {
  CreateEpisodicServicePayload,
  EpisodicCaregiverOption,
  EpisodicService,
  UpdateEpisodicServiceStagePayload,
} from "@/types/episodic"

// Reminder-rule CRUD used to live here (episodic-reminder-rules/...)
// but now goes through the shared engine — see
// services/reminders.service.ts and the "یادآوری‌ها" tab in Settings,
// which configures this pipeline (pipeline_key="episodic_services")
// exactly like every other one.
export const episodicService = {
  async list(agencyId: number) {
    const { data } = await api.get(`/api/agencies/${agencyId}/episodic-services/`)
    return data as EpisodicService[]
  },

  async create(agencyId: number, payload: CreateEpisodicServicePayload) {
    const { data } = await api.post(`/api/agencies/${agencyId}/episodic-services/`, payload)
    return data as EpisodicService
  },

  async updateStage(agencyId: number, serviceId: number, payload: UpdateEpisodicServiceStagePayload) {
    const { data } = await api.patch(`/api/agencies/${agencyId}/episodic-services/${serviceId}/`, payload)
    return data as EpisodicService
  },

  async caregiverRoster(agencyId: number) {
    const { data } = await api.get(`/api/agencies/${agencyId}/episodic-caregiver-roster/`)
    return data as EpisodicCaregiverOption[]
  },
}
