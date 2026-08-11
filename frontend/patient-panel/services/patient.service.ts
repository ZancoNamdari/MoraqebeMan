import { api } from "./api"
import type { AccessLevel, FamilyLink, PatientFormData, PatientProfile, Questionnaire } from "@/types/patient"

/** The patient's own record, via the /me/ endpoint surface —
 * distinct from family-panel's patientService, which is the FAMILY
 * side viewing (possibly several) patients they have access to. */
export const myPatientService = {
  async get(): Promise<PatientProfile> {
    const { data } = await api.get("/api/patients/me/")
    return data
  },

  async update(input: Partial<PatientFormData>) {
    const { data } = await api.put("/api/patients/me/", input)
    return data as PatientProfile
  },

  async getQuestionnaire(): Promise<Questionnaire> {
    const { data } = await api.get("/api/patients/me/questionnaire/")
    return data
  },

  async saveQuestionnaire(input: Questionnaire) {
    const { data } = await api.put("/api/patients/me/questionnaire/", input)
    return data as Questionnaire
  },

  async listFamilyLinks(): Promise<FamilyLink[]> {
    const { data } = await api.get("/api/patients/me/family-links/")
    return data
  },

  async listAccessRequests(): Promise<FamilyLink[]> {
    const { data } = await api.get("/api/patients/me/access-requests/")
    return data
  },

  async decideAccessRequest(linkId: number, decision: "approve" | "reject") {
    const { data } = await api.post(`/api/patients/me/access-requests/${linkId}/${decision}/`)
    return data as FamilyLink
  },

  async inviteFamilyByCode(input: { family_code: string; relation: string; access_level?: AccessLevel }) {
    const { data } = await api.post("/api/patients/me/invite-family/", input)
    return data as FamilyLink
  },
}
