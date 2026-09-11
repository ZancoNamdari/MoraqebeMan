import { api } from "./api"

export interface PageViewStats {
  today_visits: number
  today_unique_visitors: number
  range_start: string
  range_end: string
  range_total_visits: number
  range_unique_visitors: number
  most_viewed_pages: { path: string; views: number }[]
}

export interface PlatformCounts {
  users_by_role: {
    family: number
    patient: number
    caregiver: number
    agency: number
    admin: number
    superuser: number
  }
  total_users: number
  total_agencies: number
  total_caregivers_approved: number
  total_caregivers_all: number
  agency_customers: number
}

export const analyticsService = {
  async pageViewStats(filters: { start?: string; end?: string; path?: string } = {}): Promise<PageViewStats> {
    const { data } = await api.get("/api/analytics/pageviews/", { params: filters })
    return data
  },

  async platformCounts(): Promise<PlatformCounts> {
    const { data } = await api.get("/api/analytics/platform-counts/")
    return data
  },
}
