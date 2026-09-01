import { api } from "./api"

export interface CaregiverReview {
  id: number
  rating: number
  comment: string
  reviewer_name: string | null
  created_at: string
}

export const caregiverReviewsService = {
  async list(caregiverUserId: number): Promise<CaregiverReview[]> {
    const { data } = await api.get(`/api/care/caregivers/${caregiverUserId}/reviews/`)
    return data
  },
}
