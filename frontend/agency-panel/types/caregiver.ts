export interface CaregiverListItem {
  user_id: number
  full_name: string
  phone_number: string
  status: string
  forms_completed: number
  forms_total: number
  created_by: string | null
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
  national_id: string
  birth_certificate_number: string
  birth_certificate_issue_place: string
  birth_date: string // Jalali "YYYY-MM-DD"
  gender: string
  marital_status: string
  children_count: string
  has_children: boolean | null
  currently_caring_for_own_child: boolean | null
  military_status: string | null
  height_range: string
  weight_range: string
  ethnicities: string[]
  is_non_iranian_national: boolean | null
  nationality_country: string
  has_chronic_disease: boolean
  chronic_disease_types: string[]
  chronic_disease_detail: string
  takes_permanent_medication: boolean
  medication_types: string[]
  medication_detail: string
  psychiatric_medication_detail: string
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
  daily_work_hours: string
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
  // Universal fields (apply to every service type, not just کودک‌یار).
  // Phrased as "آیا مشکلی دارید؟" — true means the caregiver DOES
  // have a problem with that situation, not "is willing".
  problem_with_single_father: boolean | null
  problem_with_single_mother: boolean | null
  problem_with_father_present_at_home: boolean | null
  problem_with_grandparent_or_relative_at_home: boolean | null
  problem_with_home_camera: boolean | null
  problem_with_dog: boolean | null
  problem_with_cat: boolean | null
  pets_other_notes: string
  problem_with_domestic_travel: boolean | null
  problem_with_international_travel: boolean | null
  problem_without_private_room: boolean | null
  pay_basis: string
  terms_accepted: boolean
  night_stay_until: string
  has_night_time_limit: boolean | null
  additional_notes: string
  requested_salary: string
  cleaning_willingness: string
  day_off_request: string
  serves_all_areas: boolean
  // {service_type: {field: value}} — extra Form 2 questions that only
  // apply to one service type (see wizard-constants.ts's
  // SERVICE_SPECIFIC_FORMS). One key per selected non-سالمندیار type.
  service_specific_answers: Record<string, Record<string, unknown>>
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
  // Same shape/purpose as WorkPreferencesFormData's field above, but
  // for Form 3's (experience/skills step) extra per-service-type
  // questions.
  service_specific_answers: Record<string, Record<string, unknown>>
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
  local_language_fluency: string
  english_level: string
  arabic_level: string
  other_languages_detail: string
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

export interface FullCaregiverProfile {
  is_approved: boolean
  status: string
  rejection_reason: string
  service_types?: string[]
  service_subtypes?: Record<string, string[]>
  identity: (IdentityFormData & { full_name?: string }) | null
  work_preferences: WorkPreferencesFormData | null
  service_areas: ServiceArea[]
  experience: ExperienceFormData | null
  skills: SkillsFormData | null
  references: ReferenceFormData[]
}
