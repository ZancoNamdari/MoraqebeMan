export interface CaregiverListItem {
  user_id: number
  full_name: string
  phone_number: string
  status: string
  forms_completed: number
  forms_total: number
}

export interface CaregiverProgress {
  user_id: number
  full_name: string
  identity_done: boolean
  work_preferences_done: boolean
  experience_done: boolean
  skills_done: boolean
  references_done: boolean
  missing: string[]
}

export interface IdentityFormData {
  father_name: string
  birth_certificate_number: string
  birth_certificate_issue_place: string
  birth_date: string // Jalali "YYYY-MM-DD"
  gender: string
  marital_status: string
  children_count: string
  military_status: string | null
  height_range: string
  weight_range: string
  ethnicities: string[]
  has_chronic_disease: boolean
  chronic_disease_types: string[]
  takes_permanent_medication: boolean
  medication_types: string[]
  emergency_contact_phone: string
  emergency_contact_relation: string
  landline_phone: string
  province: number | null
  city: number | null
  district: number | null
  postal_code: string
  full_address: string
}

export interface WorkPreferencesFormData {
  collaboration_types: string[]
  work_status: string
  family_presence_preference: string
  accepted_gender: string
  accepted_age_ranges: string[]
  offered_services: string[]
  accepted_physical_conditions: string[]
  lifting_capacity: string
  service_locations: string[]
  max_commute_time: string
  available_days: string[]
  available_shifts: string[]
  commute_methods: string[]
  smoking_status: string
  pets_ok: boolean | null
  holiday_work_ok: boolean | null
  overnight_stay_ok: boolean | null
  terms_accepted: boolean
}

export interface ServiceArea {
  id?: number
  province: number | null
  city: number | null
  district: number | null
  province_name?: string | null
  city_name?: string | null
  district_name?: string | null
}

export interface ExperienceFormData {
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
}

export interface SkillsFormData {
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
}

export interface ReferenceFormData {
  full_name: string
  occupation: string
  relation_type: string
  acquaintance_duration: string
  phone_number: string
  callable_for_inquiry: boolean
}
