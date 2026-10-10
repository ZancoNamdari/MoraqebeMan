import { api } from "./api"
import type { CaregiverFamilyViewPreview } from "@/types/caregiver-public"

export const myFamilyViewService = {
  // دقیقاً همان پروفایلی که خانواده و بیمار از این مراقب می‌بینند.
  async get(): Promise<CaregiverFamilyViewPreview> {
    const { data } = await api.get("/api/caregivers/me/family-view/")
    return data
  },
}
