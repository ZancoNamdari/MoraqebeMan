export interface AgencyProfile {
  id: number
  user_id: number
  access_code: string
  company_name: string
  license_number: string
  created_at: string
}

export type AgencyLinkStatus = "pending" | "approved" | "rejected"

export interface AgencyFamilyLink {
  id: number
  family: number
  family_display_name: string
  family_phone_number: string | null
  status: AgencyLinkStatus
  requested_at: string
  decided_at: string | null
}

export interface AgencyCaregiverLink {
  id: number
  caregiver: number
  caregiver_display_name: string
  caregiver_phone_number: string | null
  caregiver_status: string
  status: AgencyLinkStatus
  requested_at: string
  decided_at: string | null
}

export interface AgencyDashboard {
  company_name: string
  access_code: string
  approved_family_count: number
  pending_family_requests: number
  approved_caregiver_count: number
  pending_caregiver_requests: number
}
