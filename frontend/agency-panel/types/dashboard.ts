export interface DashboardBreakdownItem {
  status?: string
  category?: string
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
  patient_pipeline_breakdown: DashboardBreakdownItem[]
  complaints_by_category: DashboardBreakdownItem[]
  weekly_growth_trend: DashboardWeeklyTrendPoint[]
}
