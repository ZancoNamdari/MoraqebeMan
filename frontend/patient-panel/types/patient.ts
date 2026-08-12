export interface PatientProfile {
  id: number
  user_id: number | null
  access_code: string
  full_name: string
  gender: string
  father_name: string
  birth_date: string | null
  national_id: string
  birth_certificate_number: string
  birth_certificate_issue_place: string
  full_address: string
  province: number | null
  city: number | null
  district: number | null
  province_name: string | null
  city_name: string | null
  district_name: string | null
  postal_code: string
  emergency_contact_phone: string
  guardianship_status: string
  guardian_details: string
  language_dialect: string
  basic_medical_info: string
  created_at: string
  updated_at: string
}

export type PatientFormData = Omit<PatientProfile, "id" | "user_id" | "access_code" | "created_at" | "updated_at" | "province_name" | "city_name" | "district_name">

export interface Questionnaire {
  religious_beliefs_priority: string
  new_treatment_openness: string
  caregiver_as_family_member: string
  respectful_disagreement_acceptance: string
  privacy_comfort_with_caregiver: string
  noise_smell_sensitivity: string
  meal_time_strictness: string
  special_diet_preference: string
  medication_timing_priority: string
  accent_customs_annoyance: string
  cultural_respect_expectation: string
  willingness_to_express_opinion: string
}

export type AccessLevel = "full_access" | "view_only"

export interface FamilyLink {
  id: number
  family: number
  family_display_name: string | null
  family_phone_number: string | null
  patient: number
  patient_full_name: string
  relation: string
  is_primary_contact: boolean
  status: "pending" | "approved" | "rejected"
  access_level: AccessLevel
  approved_at: string | null
  created_at: string
}
