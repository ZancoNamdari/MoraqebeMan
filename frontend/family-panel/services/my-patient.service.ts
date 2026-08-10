import { api } from "./api"
import type { AccessLevel, FamilyLink, PatientFormData, PatientListItem } from "@/types/patient"

/** For a PATIENT-role account managing their own record directly —
 * separate from patientService, which is the FAMILY-side view of
 * (possibly several) patients they have access to. */
export const myPatientService = {
  async get(): Promise<PatientListItem> {
    const { data } = await api.get("/api/patients/me/")
    return data
  },

  async update(input: Partial<PatientFormData>) {
    const { data } = await api.put("/api/patients/me/", input)
    return data as PatientListItem
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
