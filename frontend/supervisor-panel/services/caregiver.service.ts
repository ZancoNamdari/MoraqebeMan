import { api } from "./api"
import type {
  CaregiverListItem,
  CaregiverProgress,
  ExperienceFormData,
  FullCaregiverProfile,
  IdentityFormData,
  ReferenceFormData,
  ServiceArea,
  SkillsFormData,
  WorkPreferencesFormData,
} from "@/types/caregiver"

const base = "/api/supervisor/caregivers"

export const caregiverService = {
  async list(): Promise<CaregiverListItem[]> {
    const { data } = await api.get(`${base}/`)
    return data
  },

  async create(input: { first_name: string; last_name: string; phone_number: string; email?: string }) {
    const { data } = await api.post(`${base}/`, input)
    return data as { user_id: number; username: string; full_name: string }
  },

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

  async saveCompatibilityQuestionnaire(userId: number, answers: Record<string, string>) {
    const { data } = await api.put(`${base}/${userId}/compatibility-questionnaire/`, answers)
    return data
  },

  async approve(userId: number) {
    const { data } = await api.post(`/api/caregivers/${userId}/approve/`)
    return data
  },

  async reject(userId: number, reason: string) {
    const { data } = await api.post(`/api/caregivers/${userId}/reject/`, { reason })
    return data
  },

  async progress(userId: number): Promise<CaregiverProgress> {
    const { data } = await api.get(`${base}/${userId}/progress/`)
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
