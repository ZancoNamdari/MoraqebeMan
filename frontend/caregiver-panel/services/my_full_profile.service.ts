import { api } from "./api"

export interface MyFullProfile {
  identity: Record<string, string> | null
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
  service_areas: { id: number; province_name: string | null; city_name: string | null; district_name: string | null }[]
}

export const myFullProfileService = {
  async get(): Promise<MyFullProfile> {
    const { data } = await api.get("/api/caregivers/me/full/")
    return data
  },
}
