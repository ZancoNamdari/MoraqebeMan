export interface DashboardBreakdownItem {
  status?: string
  category?: string
  gender?: string | null
  city?: string | null
  role?: string
  education_level?: string | null
  label: string
  count: number
}

export interface DashboardWeeklyTrendPoint {
  week_label: string
  new_families: number
  new_caregivers: number
}

export interface DashboardInsights {
  caregiver_total_count: number
  caregiver_status_breakdown: DashboardBreakdownItem[]
  // "سرکار" vs "خارج از شیفت" — how many of the agency's caregivers
  // currently have an active apps.care.models.CaregiverAssignment
  // row, i.e. are actually serving a patient right now. Always
  // exactly two entries (status: "on_duty" | "off_duty").
  caregiver_on_duty_breakdown: DashboardBreakdownItem[]
  patient_pipeline_breakdown: DashboardBreakdownItem[]
  complaints_by_category: DashboardBreakdownItem[]
  weekly_growth_trend: DashboardWeeklyTrendPoint[]
  // Added for the per-entity caregiver/patient dashboards — see
  // apps.agencies.views.AgencyDashboardInsightsView's _gender_breakdown
  // / _city_breakdown helpers on the backend.
  caregiver_gender_breakdown: DashboardBreakdownItem[]
  caregiver_city_breakdown: DashboardBreakdownItem[]
  patient_gender_breakdown: DashboardBreakdownItem[]
  patient_city_breakdown: DashboardBreakdownItem[]
}

// GET /api/agencies/me/dashboard/staff/ — the agency's own staff
// (supervisors + admins), a separate dashboard from DashboardInsights
// above. See apps.agencies.views.AgencyStaffDashboardView.
export interface StaffDashboardData {
  total_staff: number
  by_role: DashboardBreakdownItem[]
  by_gender: DashboardBreakdownItem[]
  by_education: DashboardBreakdownItem[]
  by_city: DashboardBreakdownItem[]
  weekly_trend: { week_label: string; new_staff: number }[]
}
