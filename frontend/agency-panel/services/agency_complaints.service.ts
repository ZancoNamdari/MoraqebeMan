import { api } from "./api"

export interface ComplaintListItem {
  id: number
  category: string
  status: string
  patient_name: string | null
  caregiver_name: string | null
  filed_by_phone: string
  created_at: string
}

export const agencyComplaintsService = {
  async list(agencyId: number): Promise<ComplaintListItem[]> {
    const { data } = await api.get(`/api/agencies/${agencyId}/complaints/`)
    return data
  },
}
