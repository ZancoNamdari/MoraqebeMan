import { api } from "./api"
import type { CaregiverFamilyViewPreview } from "@/types/caregiver-public"

export const caregiverFamilyViewService = {
  // آژانس صراحتاً در مسیر می‌آید تا سرور مطمئن شود فقط مراقبانِ خودِ همین آژانس دیده می‌شوند.
  async get(agencyId: number | string, userId: number | string): Promise<CaregiverFamilyViewPreview> {
    const { data } = await api.get(`/api/agencies/${agencyId}/caregivers/${userId}/family-view/`)
    return data
  },
}
