import { api } from "./api"

export interface MyFullProfileStatus {
  is_approved: boolean
  status: "draft" | "pending" | "needs_more_docs" | "approved" | "rejected" | "suspended"
  rejection_reason: string
  blacklist_reason: string
  needs_more_docs_note: string
  missing_forms?: string[]
  reviewing_agency?: string | null
  identity: { full_name?: string } | null
}

export const myProfileStatusService = {
  async get(): Promise<MyFullProfileStatus> {
    const { data } = await api.get("/api/caregivers/me/full/")
    return data
  },
  /** ارسال پرونده برای بررسی (ادمین پلتفرم، یا آژانسی که کدش داده شود)؛ اگر فرمی ناقص باشد 400 با فهرست `missing` برمی‌گردد. */
  async submit(agencyCode?: string): Promise<{ detail: string; status: string; reviewer: "agency" | "platform"; agency_name: string | null }> {
    const { data } = await api.post("/api/caregivers/me/submit/", agencyCode ? { agency_code: agencyCode } : {})
    return data
  },
}
