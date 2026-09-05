import { api } from "./api"

export interface Candidate {
  user_id: number
  full_name: string
  first_name: string
  last_name: string
  national_id: string | null
  phone_number: string
  city: string | null
  registered_at: string  // real Jalali datetime string from the backend ("1405-06-14 10:30:00"), not Gregorian
  experience_level: string | null
  status: "draft" | "pending" | "needs_more_docs" | "approved" | "rejected" | "suspended"
  status_label: string
  interview_score: number | null
  interview_date: string | null
  interviewer_name: string | null
  staff_notes: string
  needs_more_docs_note: string
}

export interface CandidateResume {
  identity: Record<string, unknown> | null
  experience: {
    elderly_care_experience: string
    other_services_experience: string
    previous_workplaces: string[]
    patients_cared_for_count: string
    special_conditions_experience: string[]
    live_in_experience: boolean | null
    couple_care_experience: boolean | null
    solo_elderly_care_experience: boolean | null
    driving_for_patient_experience: boolean | null
    last_workplace: string
    additional_notes: string
  } | null
  skills: {
    education_level: string
    field_of_study: string
    training_courses: string[]
    communication_skills: string[]
    caregiving_skills: string[]
    physical_ability: string
    mobility_assistance_ability: string[]
    household_skills: string[]
    foreign_languages: string[]
    local_languages: string[]
    has_driving_license: boolean | null
    can_use_smartphone: boolean | null
    additional_notes: string
  } | null
  references: {
    id: number
    full_name: string
    occupation: string
    relation_type: string
    acquaintance_duration: string
    phone_number: string
    callable_for_inquiry: boolean
  }[]
}

export const candidateTrackingService = {
  async list(): Promise<Candidate[]> {
    const { data } = await api.get("/api/agencies/me/candidates/")
    return data
  },

  async recordInterview(userId: number, payload: { score?: number; interview_date?: string; note?: string }): Promise<Candidate> {
    const { data } = await api.post(`/api/caregivers/${userId}/record-interview/`, payload)
    return data
  },

  async requestMoreDocuments(userId: number, note: string): Promise<Candidate> {
    const { data } = await api.post(`/api/caregivers/${userId}/request-more-documents/`, { note })
    return data
  },

  async markReadyForReview(userId: number): Promise<Candidate> {
    const { data } = await api.post(`/api/caregivers/${userId}/mark-ready-for-review/`)
    return data
  },

  async editFields(userId: number, payload: { first_name?: string; last_name?: string; national_id?: string; phone_number?: string }): Promise<Candidate> {
    const { data } = await api.patch(`/api/caregivers/${userId}/edit-fields/`, payload)
    return data
  },

  async resume(userId: number): Promise<CandidateResume> {
    const { data } = await api.get(`/api/caregivers/${userId}/resume/`)
    return data
  },
}
