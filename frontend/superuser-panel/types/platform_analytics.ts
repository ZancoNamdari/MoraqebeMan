export interface PlatformAnalyticsAgencyRow {
  id: number
  company_name: string
  access_code: string
  supervisor_count: number
  approved_caregiver_count: number
  pending_caregiver_requests: number
  approved_family_count: number
  patient_count: number
  created_at: string
}

export interface PlatformAnalytics {
  totals: {
    agency_count: number
    supervisor_count: number
    caregiver_count: number
    approved_caregiver_count: number
    patient_count: number
    family_count: number
  }
  agencies: PlatformAnalyticsAgencyRow[]
}
