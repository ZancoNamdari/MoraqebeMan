import { api } from "./api"
import type { CaregiverFamilyViewPreview } from "@/types/caregiver-public"

export const caregiverFamilyViewService = {
  async get(userId: number | string): Promise<CaregiverFamilyViewPreview> {
    const { data } = await api.get(`/api/caregivers/${userId}/family-view/`)
    return data
  },
}
