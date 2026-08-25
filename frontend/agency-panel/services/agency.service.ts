import { api } from "./api"
import type { AgencyCaregiverLink, AgencyDashboard, AgencyFamilyLink, AgencyProfile } from "@/types/agency"

export const agencyService = {
  async me() {
    const { data } = await api.get("/api/agencies/me/")
    return data as AgencyProfile
  },

  async updateProfile(payload: { company_name?: string; license_number?: string }) {
    const { data } = await api.put("/api/agencies/me/", payload)
    return data as AgencyProfile
  },

  async dashboard() {
    const { data } = await api.get("/api/agencies/me/dashboard/")
    return data as AgencyDashboard
  },

  async familyRoster() {
    const { data } = await api.get("/api/agencies/me/families/")
    return data as AgencyFamilyLink[]
  },

  async familyRequests() {
    const { data } = await api.get("/api/agencies/me/families/requests/")
    return data as AgencyFamilyLink[]
  },

  async decideFamilyRequest(linkId: number, decision: "approve" | "reject") {
    const { data } = await api.post(`/api/agencies/me/families/requests/${linkId}/${decision}/`)
    return data as AgencyFamilyLink
  },

  async caregiverRoster() {
    const { data } = await api.get("/api/agencies/me/caregivers/")
    return data as AgencyCaregiverLink[]
  },

  async caregiverRequests() {
    const { data } = await api.get("/api/agencies/me/caregivers/requests/")
    return data as AgencyCaregiverLink[]
  },

  async decideCaregiverRequest(linkId: number, decision: "approve" | "reject") {
    const { data } = await api.post(`/api/agencies/me/caregivers/requests/${linkId}/${decision}/`)
    return data as AgencyCaregiverLink
  },
}
