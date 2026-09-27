export interface TopFlaggedCaregiver {
  caregiver_id: number
  name: string
  complaint_count: number
}

export interface AgencyAnalytics {
  vetting_funnel: {
    total_candidates: number
    approved_count: number
    rejected_count: number
    needs_more_docs_count: number
    pending_count: number
    approval_rate_percent: number
    avg_decision_days: number | null
  }
  complaint_quality: {
    total_complaints: number
    complaints_per_approved_caregiver: number
    top_flagged_caregivers: TopFlaggedCaregiver[]
  }
  stale_family_requests: {
    within_3_days: number
    within_7_days: number
    over_7_days: number
  }
  care_activity: {
    active_assignments_count: number
    ended_assignments_count: number
    avg_assignment_duration_days: number | null
  }
}
