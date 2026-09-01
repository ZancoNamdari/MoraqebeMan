import { api } from "./api"

export interface MyFullProfileStatus {
  is_approved: boolean
  status: "draft" | "pending" | "approved" | "rejected" | "suspended"
  rejection_reason: string
  blacklist_reason: string
}

export const myProfileStatusService = {
  async get(): Promise<MyFullProfileStatus> {
    const { data } = await api.get("/api/caregivers/me/full/")
    return data
  },
}
