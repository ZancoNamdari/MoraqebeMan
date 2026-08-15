export interface CaregiverAssignment {
  id: number
  caregiver: number
  caregiver_name: string
  caregiver_gender: string
  patient: number
  patient_name: string
  patient_gender: string
  patient_code: string
  caregiver_avg_rating: number | null
  caregiver_review_count: number
  assigned_by: number | null
  assigned_by_username: string | null
  status: "active" | "ended"
  notes: string
  assigned_at: string
  ended_at: string | null
}

export type CareLogCategory = "general" | "medication" | "meal" | "mobility" | "vitals" | "incident"

export interface CareLogEntry {
  id: number
  assignment: number
  caregiver: number
  caregiver_name: string
  caregiver_gender: string
  patient: number
  category: CareLogCategory
  note: string
  created_at: string
}
