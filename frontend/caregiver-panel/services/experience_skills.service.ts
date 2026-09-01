import { api } from "./api"

export interface MyExperience {
  elderly_care_experience?: string
  other_services_experience?: string
  previous_workplaces?: string[]
  patients_cared_for_count?: string
  special_conditions_experience?: string[]
  live_in_experience?: boolean | null
  couple_care_experience?: boolean | null
  solo_elderly_care_experience?: boolean | null
  driving_for_patient_experience?: boolean | null
  last_workplace?: string
  additional_notes?: string
}

export interface MySkills {
  education_level?: string
  field_of_study?: string
  training_courses?: string[]
  communication_skills?: string[]
  caregiving_skills?: string[]
  physical_ability?: string
  mobility_assistance_ability?: string[]
  household_skills?: string[]
  foreign_languages?: string[]
  local_languages?: string[]
  has_driving_license?: boolean | null
  can_use_smartphone?: boolean | null
  additional_notes?: string
}

export interface MyServiceArea {
  id: number
  province: number | null
  city: number | null
  district: number | null
  province_name: string | null
  city_name: string | null
  district_name: string | null
}

async function getOrNull<T>(url: string): Promise<T | null> {
  try {
    const { data } = await api.get(url)
    return data
  } catch (err: any) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

export const experienceService = {
  me: () => getOrNull<MyExperience>("/api/caregivers/me/experience/"),
  save: async (payload: MyExperience) => (await api.put("/api/caregivers/me/experience/", payload)).data as MyExperience,
}

export const skillsService = {
  me: () => getOrNull<MySkills>("/api/caregivers/me/skills/"),
  save: async (payload: MySkills) => (await api.put("/api/caregivers/me/skills/", payload)).data as MySkills,
}

export const serviceAreasService = {
  async list(): Promise<MyServiceArea[]> {
    const { data } = await api.get("/api/caregivers/me/service-areas/")
    return data
  },
  async add(province: number, city: number | null, district: number | null) {
    const { data } = await api.post("/api/caregivers/me/service-areas/", { province, city, district })
    return data as MyServiceArea
  },
  async remove(id: number) {
    await api.delete(`/api/caregivers/me/service-areas/${id}/`)
  },
}
