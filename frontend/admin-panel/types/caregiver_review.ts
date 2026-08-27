export interface CaregiverListItem {
  user_id: number
  full_name: string
  phone_number: string
  status: "draft" | "pending" | "approved" | "rejected" | "suspended"
  forms_completed: number
  forms_total: number
  created_by: string | null
}

export interface CaregiverFullProfile {
  is_approved: boolean
  status: "draft" | "pending" | "approved" | "rejected" | "suspended"
  rejection_reason: string
  blacklist_reason: string
  identity: Record<string, unknown> | null
  work_preferences: Record<string, unknown> | null
  service_areas: Record<string, unknown>[]
  experience: Record<string, unknown> | null
  skills: Record<string, unknown> | null
  references: Record<string, unknown>[]
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس",
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "رد شده",
  suspended: "مسدود شده",
}
