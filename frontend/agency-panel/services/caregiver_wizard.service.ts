import { api } from "./api"
import type {
  CaregiverProgress,
  ExperienceFormData,
  FullCaregiverProfile,
  IdentityFormData,
  ReferenceFormData,
  ServiceArea,
  SkillsFormData,
  WorkPreferencesFormData,
} from "@/types/caregiver"

// Continues a caregiver candidate's 4-form registration wizard from
// right inside agency-panel — same platform-wide, user_id-keyed
// endpoints supervisor.moraqebman.ir's own wizard used to call, now
// reachable from here too (backend's IsAdminOrSuperuserOrAgencyStaff
// + apps.agencies.tenancy.resolve_own_agency_for_agency_staff widen
// these to the caregiver's own agency's owner/supervisor/admin).
// Deliberately does NOT include list()/create()/approve()/reject():
// - list() would need agency-panel's OWN caregivers-pipeline
//   endpoint (agencyManagementService.listCaregiverPipeline), not this
//   platform-wide one.
// - create() likewise stays agencyManagementService.createCaregiverCandidate
//   so a new candidate is properly linked to this agency from the start.
// - approve()/reject() (final platform approval) stays admin/superuser-
//   only, per the confirmed requirement — never exposed from here.
const base = "/api/supervisor/caregivers"

export const caregiverWizardService = {
  async remove(userId: number) {
    await api.delete(`${base}/${userId}/`)
  },

  async getBasicInfo(userId: number) {
    const { data } = await api.get(`${base}/${userId}/`)
    return data as { user_id: number; first_name: string; last_name: string; phone_number: string; email: string }
  },

  async updateBasicInfo(userId: number, input: { first_name: string; last_name: string; phone_number: string; email?: string }) {
    const { data } = await api.patch(`${base}/${userId}/`, input)
    return data
  },

  async fullProfile(userId: number) {
    const { data } = await api.get(`${base}/${userId}/full/`)
    return data as FullCaregiverProfile
  },

  async getCompatibilityQuestionnaire(userId: number) {
    const { data } = await api.get(`${base}/${userId}/compatibility-questionnaire/`)
    return data
  },

  async saveCompatibilityQuestionnaire(userId: number, answers: Record<string, any>) {
    const { data } = await api.put(`${base}/${userId}/compatibility-questionnaire/`, answers)
    return data
  },

  async progress(userId: number): Promise<CaregiverProgress> {
    const { data } = await api.get(`${base}/${userId}/progress/`)
    return data
  },

  async getServiceTypes(userId: number) {
    const { data } = await api.get(`${base}/${userId}/service-types/`)
    return data as { service_types: string[]; service_subtypes: Record<string, string[]>; rapid_response?: boolean }
  },

  async saveServiceTypes(userId: number, payload: { service_types: string[]; service_subtypes: Record<string, string[]>; rapid_response?: boolean }) {
    const { data } = await api.put(`${base}/${userId}/service-types/`, payload)
    return data
  },

  async getIdentity(userId: number) {
    const { data } = await api.get(`${base}/${userId}/identity/`)
    return data as IdentityFormData
  },
  async saveIdentity(userId: number, payload: IdentityFormData) {
    const { data } = await api.put(`${base}/${userId}/identity/`, payload)
    return data
  },

  async getWorkPreferences(userId: number) {
    const { data } = await api.get(`${base}/${userId}/work-preferences/`)
    return data as WorkPreferencesFormData
  },
  async saveWorkPreferences(userId: number, payload: WorkPreferencesFormData) {
    const { data } = await api.put(`${base}/${userId}/work-preferences/`, payload)
    return data
  },

  async listServiceAreas(userId: number) {
    const { data } = await api.get(`${base}/${userId}/service-areas/`)
    return data as ServiceArea[]
  },
  async addServiceArea(userId: number, payload: ServiceArea) {
    const { data } = await api.post(`${base}/${userId}/service-areas/`, payload)
    return data as ServiceArea
  },
  async deleteServiceArea(userId: number, areaId: number) {
    await api.delete(`${base}/${userId}/service-areas/${areaId}/`)
  },

  async getExperience(userId: number) {
    const { data } = await api.get(`${base}/${userId}/experience/`)
    return data as ExperienceFormData
  },
  async saveExperience(userId: number, payload: ExperienceFormData) {
    const { data } = await api.put(`${base}/${userId}/experience/`, payload)
    return data
  },

  async getSkills(userId: number) {
    const { data } = await api.get(`${base}/${userId}/skills/`)
    return data as SkillsFormData
  },
  async saveSkills(userId: number, payload: SkillsFormData) {
    const { data } = await api.put(`${base}/${userId}/skills/`, payload)
    return data
  },

  async getReferences(userId: number) {
    const { data } = await api.get(`${base}/${userId}/references/`)
    return data as ReferenceFormData[]
  },
  async saveReferences(userId: number, references: ReferenceFormData[]) {
    const { data } = await api.put(`${base}/${userId}/references/`, { references })
    return data
  },
}
