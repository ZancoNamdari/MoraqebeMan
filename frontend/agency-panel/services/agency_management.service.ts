import { api } from "./api"
import type {
  AgencyAdmin,
  AgencyCaregiverPipelineItem,
  AgencyCaregiverSuggestion,
  AgencyPatient,
  AgencySuggestionsResponse,
  AgencySupervisor,
  CreateAgencyAdminPayload,
  CreateAgencyPatientPayload,
  CreateAgencyPatientResponse,
  CreateAgencySupervisorPayload,
} from "@/types/agency_management"

export const agencyManagementService = {
  async listSupervisors(agencyId: number) {
    const { data } = await api.get(`/api/agencies/${agencyId}/supervisors/`)
    return data as AgencySupervisor[]
  },

  async createSupervisor(agencyId: number, payload: CreateAgencySupervisorPayload) {
    const { data } = await api.post(`/api/agencies/${agencyId}/supervisors/`, payload)
    return data as AgencySupervisor
  },

  async listAdmins(agencyId: number) {
    const { data } = await api.get(`/api/agencies/${agencyId}/admins/`)
    return data as AgencyAdmin[]
  },

  async createAdmin(agencyId: number, payload: CreateAgencyAdminPayload) {
    const { data } = await api.post(`/api/agencies/${agencyId}/admins/`, payload)
    return data as AgencyAdmin
  },

  async listPatients(agencyId: number) {
    const { data } = await api.get(`/api/agencies/${agencyId}/patients/`)
    return data as AgencyPatient[]
  },

  async createPatient(agencyId: number, payload: CreateAgencyPatientPayload) {
    const { data } = await api.post(`/api/agencies/${agencyId}/patients/`, payload)
    return data as CreateAgencyPatientResponse
  },

  async suggestCaregivers(agencyId: number, patientId: number) {
    const { data } = await api.get(`/api/agencies/${agencyId}/patients/${patientId}/suggest-caregivers/`)
    return data as AgencySuggestionsResponse
  },

  async updatePipelineStatus(agencyId: number, patientId: number, pipelineStatus: string) {
    const { data } = await api.patch(`/api/agencies/${agencyId}/patients/${patientId}/pipeline-status/`, {
      pipeline_status: pipelineStatus,
    })
    return data as AgencyPatient
  },

  async updatePatientUrgent(agencyId: number, patientId: number, isUrgent: boolean) {
    const { data } = await api.patch(`/api/agencies/${agencyId}/patients/${patientId}/pipeline-status/`, {
      is_urgent: isUrgent,
    })
    return data as AgencyPatient
  },

  async updatePatientTags(agencyId: number, patientId: number, tags: string[]) {
    const { data } = await api.patch(`/api/agencies/${agencyId}/patients/${patientId}/pipeline-status/`, {
      tags,
    })
    return data as AgencyPatient
  },

  async listCaregiverPipeline(agencyId: number) {
    const { data } = await api.get(`/api/agencies/${agencyId}/caregivers-pipeline/`)
    return data as AgencyCaregiverPipelineItem[]
  },

  async updateCaregiverPipeline(agencyId: number, caregiverId: number, fields: Partial<AgencyCaregiverPipelineItem>) {
    const { data } = await api.patch(`/api/agencies/${agencyId}/caregivers-pipeline/${caregiverId}/`, fields)
    return data as AgencyCaregiverPipelineItem
  },
}
