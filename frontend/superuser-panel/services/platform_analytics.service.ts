import { api } from "./api"
import type { PlatformAnalytics } from "@/types/platform_analytics"

export const platformAnalyticsService = {
  async get() {
    const { data } = await api.get("/api/agencies/analytics/")
    return data as PlatformAnalytics
  },
}
