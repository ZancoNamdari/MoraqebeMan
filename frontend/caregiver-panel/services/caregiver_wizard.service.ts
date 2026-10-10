import { api } from "./api"
import type {
  ExperienceFormData,
  IdentityFormData,
  ReferenceFormData,
  ServiceArea,
  SkillsFormData,
  WorkPreferencesFormData,
} from "@/types/caregiver"

// Self-service version of the agency panel's registration wizard
// service: same method names/payloads, but every call goes to the
// signed-in caregiver's own /api/caregivers/me/... endpoints.
const base = "/api/caregivers/me"

export const caregiverWizardService = {
  async fullProfile() {
    const { data } = await api.get(`${base}/full/`)
    return data as { first_name?: string; last_name?: string; full_name?: string; status?: string; missing_forms?: string[] }
  },

  async getCompatibilityQuestionnaire() {
    const { data } = await api.get(`${base}/compatibility-questionnaire/`)
    return data
  },
  async saveCompatibilityQuestionnaire(answers: Record<string, any>) {
    const { data } = await api.put(`${base}/compatibility-questionnaire/`, answers)
    return data
  },

  async getServiceTypes() {
    const { data } = await api.get(`${base}/service-types/`)
    return data as { service_types: string[]; service_subtypes: Record<string, string[]> }
  },
  async saveServiceTypes(payload: { service_types: string[]; service_subtypes: Record<string, string[]> }) {
    const { data } = await api.put(`${base}/service-types/`, payload)
    return data
  },

  async getIdentity() {
    const { data } = await api.get(`${base}/identity/`)
    return data as IdentityFormData
  },
  async saveIdentity(payload: IdentityFormData) {
    const { data } = await api.put(`${base}/identity/`, payload)
    return data
  },

  async getWorkPreferences() {
    const { data } = await api.get(`${base}/work-preferences/`)
    return data as WorkPreferencesFormData
  },
  async saveWorkPreferences(payload: WorkPreferencesFormData) {
    const { data } = await api.put(`${base}/work-preferences/`, payload)
    return data
  },

  async listServiceAreas() {
    const { data } = await api.get(`${base}/service-areas/`)
    return data as ServiceArea[]
  },
  async addServiceArea(payload: ServiceArea) {
    const { data } = await api.post(`${base}/service-areas/`, payload)
    return data as ServiceArea
  },
  async deleteServiceArea(areaId: number) {
    await api.delete(`${base}/service-areas/${areaId}/`)
  },

  async getExperience() {
    const { data } = await api.get(`${base}/experience/`)
    return data as ExperienceFormData
  },
  async saveExperience(payload: ExperienceFormData) {
    const { data } = await api.put(`${base}/experience/`, payload)
    return data
  },

  async getSkills() {
    const { data } = await api.get(`${base}/skills/`)
    return data as SkillsFormData
  },
  async saveSkills(payload: SkillsFormData) {
    const { data } = await api.put(`${base}/skills/`, payload)
    return data
  },

  async getReferences() {
    const { data } = await api.get(`${base}/references/`)
    return data as ReferenceFormData[]
  },
  async saveReferences(references: ReferenceFormData[]) {
    const { data } = await api.put(`${base}/references/`, { references })
    return data
  },
}
