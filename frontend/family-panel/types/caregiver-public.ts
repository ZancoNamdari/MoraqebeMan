export interface PublicCaregiverService { key: string; label: string; subtypes: string[] }

export interface PublicCaregiverCard {
  id: number
  display_name: string
  gender: string
  age: number | null
  photo_url: string | null
  city: string
  services: PublicCaregiverService[]
  avg_rating: number | null
  review_count: number
  care_count: number
  satisfaction_percent: number | null
  special_talents: string[]
  elderly_experience: string | null
  serves_all_areas: boolean
}

export interface PublicCaregiverProfile extends PublicCaregiverCard {
  about: { marital_status: string | null; ethnicities: string[] }
  areas: string[]
  experience: {
    elderly_care: string | null
    other_services: string | null
    patients_cared_for: string | null
    previous_workplaces: string[]
    special_conditions: string[]
    live_in: boolean
    couple_care: boolean
    solo_elderly_care: boolean
  }
  skills: {
    education: string | null
    field_of_study: string
    training_courses: string[]
    caregiving: string[]
    communication: string[]
    household: string[]
    mobility: string[]
    foreign_languages: string[]
    local_languages: string[]
    driving_license: boolean
  }
  availability: {
    collaboration_types: string[]
    days: string[]
    shifts: string[]
    overnight_stay: boolean | null
    holiday_work: boolean | null
  }
  highlights: string[]
  rating_distribution: Record<string, number>
  reviews: { id: number; name: string; rating: number; comment: string; when: string }[]
}
