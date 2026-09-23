export interface AgencySupervisor {
  id: number
  user_id: number
  username: string
  full_name: string
  phone_number: string
  created_by_username: string | null
  created_at: string
}

export interface CreateAgencySupervisorPayload {
  first_name: string
  last_name: string
  phone_number: string
  email?: string
}

export interface AgencyAdmin {
  id: number
  user_id: number
  username: string
  full_name: string
  phone_number: string
  supervisor_id: number
  supervisor_name: string
  created_by_username: string | null
  created_at: string
}

export interface CreateAgencyAdminPayload {
  first_name: string
  last_name: string
  phone_number: string
  email?: string
  supervisor_id: number
}

export interface AgencyPatient {
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
  physical_condition: string
  pipeline_status: string
  created_by: string | null
  needed_shifts: string[]
  created_at: string
  updated_at: string
}

export interface CreatePatientFamilyInfo {
  first_name: string
  last_name: string
  phone_number: string
  relation: string
}

export interface CreatedFamilyInfo {
  user_id: number
  phone_number: string
  access_code: string
}

export interface CreateAgencyPatientPayload {
  mode: "standalone" | "with_family"
  patient: { full_name: string; gender?: string; [key: string]: unknown }
  family?: CreatePatientFamilyInfo
}

export type CreateAgencyPatientResponse = AgencyPatient & { family?: CreatedFamilyInfo }

// Same shape as the platform-wide suggest-caregivers response — the
// backend deliberately reuses one pipeline for both, see
// apps.care.matching.agency_scoped's docstring.
export interface AgencyCaregiverSuggestion {
  caregiver_user_id: number
  caregiver_name: string
  caregiver_gender: string
  objective_fit_score: number | null
  trait_match_score: number | null
  caregiver_cfi: number | null
  avg_rating: number | null
  mcdm_score: number | null
  match_confidence: "high" | "medium" | "low"
  explanation: {
    summary: string
    strengths: string[]
    weaknesses: string[]
  }
  [key: string]: unknown
}

export interface AgencySuggestionsResponse {
  patient_name: string
  patient_gender: string
  suggestions: AgencyCaregiverSuggestion[]
}
