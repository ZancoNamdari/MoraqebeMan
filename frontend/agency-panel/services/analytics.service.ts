import { api } from "./api"
import type { AgencyAnalytics } from "@/types/analytics"

export const analyticsService = {
  async me(): Promise<AgencyAnalytics> {
    const { data } = await api.get("/api/agencies/me/analytics/")
    return data
  },
}
