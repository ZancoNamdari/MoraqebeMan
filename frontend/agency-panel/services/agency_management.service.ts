import { api } from "./api"
import type {
  AgencyAdmin,
  AgencyCaregiverPipelineItem,
  AgencyCaregiverSuggestion,
  AgencyPatient,
  AgencySuggestionsResponse,
  AgencySupervisor,
  CaregiverDocumentField,
  CaregiverDocumentUpload,
  CreateAgencyAdminPayload,
  CreateAgencyPatientPayload,
  CreateAgencyPatientResponse,
  CreateAgencySupervisorPayload,
  CreateCaregiverCandidatePayload,
  UpdateAgencyAdminPayload,
  UpdateAgencySupervisorPayload,
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

  async updateSupervisor(agencyId: number, supervisorId: number, payload: UpdateAgencySupervisorPayload) {
    const { data } = await api.patch(`/api/agencies/${agencyId}/supervisors/${supervisorId}/`, payload)
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

  async updateAdmin(agencyId: number, adminId: number, payload: UpdateAgencyAdminPayload) {
    const { data } = await api.patch(`/api/agencies/${agencyId}/admins/${adminId}/`, payload)
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

  async createCaregiverCandidate(agencyId: number, payload: CreateCaregiverCandidatePayload) {
    const { data } = await api.post(`/api/agencies/${agencyId}/caregivers-pipeline/`, payload)
    return data as AgencyCaregiverPipelineItem
  },

  async updateCaregiverPipeline(agencyId: number, caregiverId: number, fields: Partial<AgencyCaregiverPipelineItem>) {
    const { data } = await api.patch(`/api/agencies/${agencyId}/caregivers-pipeline/${caregiverId}/`, fields)
    return data as AgencyCaregiverPipelineItem
  },

  // Uploads (or re-uploads, after a rejection) the file behind one of
  // the seven document-checklist items — agency staff's own job, from
  // right under that checklist item in the drawer.
  async uploadCaregiverDocument(agencyId: number, caregiverId: number, documentType: CaregiverDocumentField, file: File) {
    const formData = new FormData()
    formData.append("file", file)
    const { data } = await api.post(
      `/api/agencies/${agencyId}/caregivers-pipeline/${caregiverId}/documents/${documentType}/`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    )
    return data as CaregiverDocumentUpload
  },

  // Approve/reject live in the platform-wide, user_id-keyed space
  // (apps.caregivers.document_views), reachable from here too per
  // the confirmed requirement that the agency's own owner/supervisor
  // can review — same endpoints admin-panel hits.
  async approveCaregiverDocument(caregiverUserId: number, documentType: CaregiverDocumentField) {
    const { data } = await api.post(`/api/caregivers/${caregiverUserId}/documents/${documentType}/approve/`)
    return data as CaregiverDocumentUpload
  },

  async rejectCaregiverDocument(caregiverUserId: number, documentType: CaregiverDocumentField, reason: string) {
    const { data } = await api.post(`/api/caregivers/${caregiverUserId}/documents/${documentType}/reject/`, { reason })
    return data as CaregiverDocumentUpload
  },
}
