import { api } from "./api"
import type {
  AgencyAdmin,
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
}
