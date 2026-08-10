import { api } from "./api"
import type { AccessLevel, FamilyLink, PatientFormData, PatientListItem, Questionnaire } from "@/types/patient"

export const patientService = {
  async list(): Promise<PatientListItem[]> {
    const { data } = await api.get("/api/patients/")
    return data
  },

  async create(input: Partial<PatientFormData> & { relation: string }) {
    const { data } = await api.post("/api/patients/", input)
    return data as PatientListItem
  },

  /** Family requests access to a patient using the patient's access
   * code — creates a PENDING link, not immediate access. */
  async connect(patientCode: string, relation: string) {
    const { data } = await api.post("/api/patients/connect/", { patient_code: patientCode, relation })
    return data as { detail: string; link_id: number }
  },

  async get(id: number): Promise<PatientListItem> {
    const { data } = await api.get(`/api/patients/${id}/`)
    return data
  },

  async update(id: number, input: Partial<PatientFormData>) {
    const { data } = await api.put(`/api/patients/${id}/`, input)
    return data as PatientListItem
  },

  async remove(id: number) {
    await api.delete(`/api/patients/${id}/`)
  },

  async getQuestionnaire(id: number): Promise<Questionnaire> {
    const { data } = await api.get(`/api/patients/${id}/questionnaire/`)
    return data
  },

  async saveQuestionnaire(id: number, input: Questionnaire) {
    const { data } = await api.put(`/api/patients/${id}/questionnaire/`, input)
    return data
  },

  async listFamilyLinks(id: number): Promise<FamilyLink[]> {
    const { data } = await api.get(`/api/patients/${id}/family-links/`)
    return data
  },

  /** Invite a family member by THEIR code — approved immediately,
   * since the inviter already has approved standing on this patient. */
  async inviteFamilyByCode(id: number, input: { family_code: string; relation: string; access_level?: AccessLevel }) {
    const { data } = await api.post(`/api/patients/${id}/family-links/`, input)
    return data as FamilyLink
  },

  async updateFamilyLink(id: number, linkId: number, input: { relation?: string; is_primary_contact?: boolean; access_level?: AccessLevel }) {
    const { data } = await api.patch(`/api/patients/${id}/family-links/${linkId}/`, input)
    return data as FamilyLink
  },

  async removeFamilyLink(id: number, linkId: number) {
    await api.delete(`/api/patients/${id}/family-links/${linkId}/`)
  },

  async listAccessRequests(id: number): Promise<FamilyLink[]> {
    const { data } = await api.get(`/api/patients/${id}/access-requests/`)
    return data
  },

  async decideAccessRequest(id: number, linkId: number, decision: "approve" | "reject") {
    const { data } = await api.post(`/api/patients/${id}/access-requests/${linkId}/${decision}/`)
    return data as FamilyLink
  },
}
