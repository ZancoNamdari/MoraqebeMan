export interface CaregiverAssignment {
  id: number
  caregiver: number
  caregiver_name: string
  patient: number
  patient_name: string
  patient_gender: string
  patient_code: string
  assigned_by: number | null
  assigned_by_username: string | null
  status: "active" | "ended"
  notes: string
  assigned_at: string
  ended_at: string | null
}
