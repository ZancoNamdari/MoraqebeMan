import type { ActiveReminder } from "@/types/reminders"

// gender/education_level use the same value strings as GENDER/EDUCATION_LEVEL
// in lib/wizard-constants.ts (transcribed from backend/apps/caregivers/choices.py,
// which apps.agencies's AgencySupervisor/AgencyAdmin models reuse directly —
// see this session's dashboard work). Feeds the "پرسنل" dashboard's
// gender/education/city breakdowns; all four are optional since existing
// staff rows predate these fields.
export interface AgencySupervisor {
  id: number
  user_id: number
  username: string
  full_name: string
  phone_number: string
  position: string
  created_by_username: string | null
  created_at: string
  gender: string | null
  birth_date: string | null
  city_name: string | null
  education_level: string | null
}

export interface CreateAgencySupervisorPayload {
  first_name: string
  last_name: string
  phone_number: string
  email?: string
  position?: string
  gender?: string
  birth_date?: string
  city_id?: number
  education_level?: string
}

export interface UpdateAgencySupervisorPayload {
  first_name?: string
  last_name?: string
  phone_number?: string
  position?: string
  gender?: string
  birth_date?: string
  city_id?: number
  education_level?: string
}

export interface AgencyAdmin {
  id: number
  user_id: number
  username: string
  full_name: string
  phone_number: string
  position: string
  supervisor_id: number
  supervisor_name: string
  created_by_username: string | null
  created_at: string
  gender: string | null
  birth_date: string | null
  city_name: string | null
  education_level: string | null
}

export interface CreateAgencyAdminPayload {
  first_name: string
  last_name: string
  phone_number: string
  email?: string
  position?: string
  supervisor_id: number
  gender?: string
  birth_date?: string
  city_id?: number
  education_level?: string
}

export interface UpdateAgencyAdminPayload {
  first_name?: string
  last_name?: string
  phone_number?: string
  position?: string
  supervisor_id?: number
  gender?: string
  birth_date?: string
  city_id?: number
  education_level?: string
}

// One of the seven "تکمیل مدارک" checklist items' real file — see
// backend's CaregiverDocumentUpload docstring. null when nothing has
// been uploaded for that document type yet.
export type CaregiverDocumentReviewStatus = "pending" | "approved" | "rejected"

export interface CaregiverDocumentUpload {
  document_type: string
  file: string
  status: CaregiverDocumentReviewStatus
  uploaded_by_name: string | null
  uploaded_at: string
  reviewed_by_name: string | null
  reviewed_at: string | null
  rejection_reason: string
}

export type CaregiverDocumentField =
  | "no_criminal_record" | "no_addiction_test" | "identity_verified"
  | "personal_photo" | "mental_health_test" | "promissory_note" | "id_card_received"

// One column of an agency's own patient/caregiver Kanban board —
// backed by apps.agencies.models.AgencyPipelineStage. Every agency
// starts with the platform's original 7 stages per board and can
// append its own to the end (see AgencyPipelineStageListCreateView).
export interface AgencyPipelineStage {
  id: number
  pipeline_type: "patient" | "caregiver" | "episodic"
  value: string
  label: string
  order: number
}

// One extra phone number on file for a caregiver or patient besides
// their own primary number — an emergency contact, a landline, a
// reference, or (for patients) an approved family member. Read-only:
// always sourced from the person's own onboarding/family data.
export interface ExtraContact {
  label: string
  phone: string
}

export interface AgencyCaregiverPipelineItem {
  id: number
  // The caregiver's platform User id — distinct from `id` above
  // (CaregiverProfile.pk) — used to deep-link into the supervisor
  // panel's own wizard (/caregivers/new?id=<user_id>), which is
  // keyed by user_id, not by this profile's id.
  user_id: number
  full_name: string
  phone_number: string
  extra_contacts: ExtraContact[]
  agency_pipeline_status: string
  is_urgent: boolean
  doc_no_criminal_record: boolean
  doc_no_addiction_test: boolean
  doc_identity_verified: boolean
  doc_personal_photo: boolean
  doc_mental_health_test: boolean
  doc_promissory_note: boolean
  doc_id_card_received: boolean
  // Keyed by CaregiverDocumentField (e.g. "no_criminal_record", NOT
  // the "doc_" prefixed booleans above) — the file/status detail
  // behind each of those seven fast-read booleans; null for a
  // document type that has never been uploaded.
  documents: Record<CaregiverDocumentField, CaregiverDocumentUpload | null>
  tags: string[]
  process_milestones: string[]
  created_by: string | null
  active_reminders: ActiveReminder[]
  // Free-text internal note staff keep on this caregiver's kanban
  // card — backed by CaregiverProfile.staff_notes, capped at 1000
  // chars, never shown outside the agency panel.
  staff_notes: string
  // Set once this caregiver reaches "در حال مأموریت" — see
  // CaregiverProfile.contract_start_date/contract_end_date's own
  // docstrings. Jalali "YYYY-MM-DD" strings, or null until entered.
  contract_start_date: string | null
  contract_end_date: string | null
}

// Step-0-only, mirroring apps.caregivers.serializers.CreateCaregiverSerializer
// — no password field, same "entering someone else's info" pattern as
// CreateAgencyPatientPayload below. Whoever submits this (an admin, a
// supervisor, or the owner) is who this candidate ends up "linked to"
// in the pipeline, since the backend records them as decided_by.
export interface CreateCaregiverCandidatePayload {
  first_name: string
  last_name: string
  phone_number: string
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
  // Every approved family member's own phone number on this
  // patient's record — see PatientProfileSerializer.get_family_contacts.
  family_contacts: ExtraContact[]
  guardianship_status: string
  guardian_details: string
  language_dialect: string
  basic_medical_info: string
  physical_condition: string
  pipeline_status: string
  created_by: string | null
  is_urgent: boolean
  tags: string[]
  // Free-text internal note staff keep on this patient's kanban card
  // — backed by PatientProfile.notes, internal-only.
  notes: string
  needed_shifts: string[]
  // Set once this patient reaches "قرارداد بسته و تایید شده" — see
  // PatientProfile.contract_start_date/contract_end_date's own
  // docstrings. Jalali "YYYY-MM-DD" strings, or null until entered.
  contract_start_date: string | null
  contract_end_date: string | null
  active_reminders: ActiveReminder[]
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

// Mirrors apps.families.serializers.PatientCompatibilityQuestionnaireSerializer
// — twelve fixed fields, one per compatibility-questionnaire question.
// Kept as a flat Record rather than a named interface at the call
// site (same convention as CAREGIVER_QUESTIONNAIRE's answers map) so
// lib/patient-compatibility-questionnaire.ts's question list stays
// the single source of truth for which fields exist.
export type PatientQuestionnaireAnswers = Record<string, string>

export interface PatientDocumentUpload {
  document_type: string
  file: string
  uploaded_by_name: string | null
  uploaded_at: string
}

export const PATIENT_DOCUMENT_TYPES: [string, string][] = [
  ["national_id_card", "کارت ملی"],
  ["birth_certificate", "شناسنامه"],
  ["personal_photo", "عکس پرسنلی"],
]

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

// Reverse direction — one of this agency's own patients (still
// looking for a caregiver), scored for how well they'd suit ONE
// specific caregiver. Same score fields as AgencyCaregiverSuggestion
// (spread from that caregiver's own entry in the patient's ranking —
// see suggest_patients_for_agency_caregiver's docstring), plus which
// patient this row is about.
export interface AgencyPatientSuggestion {
  patient_id: number
  patient_name: string
  patient_gender: string
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

export interface AgencyPatientSuggestionsResponse {
  caregiver_name: string
  suggestions: AgencyPatientSuggestion[]
}
