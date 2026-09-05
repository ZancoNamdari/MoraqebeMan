import { api } from "./api"

export interface MyFullProfileStatus {
  is_approved: boolean
  status: "draft" | "pending" | "needs_more_docs" | "approved" | "rejected" | "suspended"
  rejection_reason: string
  blacklist_reason: string
  needs_more_docs_note: string
  identity: { full_name?: string } | null
}

export const myProfileStatusService = {
  async get(): Promise<MyFullProfileStatus> {
    const { data } = await api.get("/api/caregivers/me/full/")
    return data
  },
}
