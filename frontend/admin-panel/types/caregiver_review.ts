export interface CaregiverListItem {
  user_id: number
  full_name: string
  phone_number: string
  status: "draft" | "pending" | "approved" | "rejected" | "suspended"
  forms_completed: number
  forms_total: number
  created_by: string | null
}

// One of the seven "تکمیل مدارک" checklist items' real file — see
// backend's CaregiverDocumentUpload docstring. null when nothing has
// been uploaded for that document type yet. Agency staff upload
// these from agency-panel; this platform-staff view is read + review
// (approve/reject) only, never upload.
export type CaregiverDocumentReviewStatus = "pending" | "approved" | "rejected"

export interface CaregiverDocumentUpload {
  document_type: string
  file: string
  status: CaregiverDocumentReviewStatus
  uploaded_by_name: string | null
  uploaded_at: string
  reviewed_by_name: string | null
  reviewed_at: string | null
  rejection_reason: string
}

export type CaregiverDocumentField =
  | "no_criminal_record" | "no_addiction_test" | "identity_verified"
  | "personal_photo" | "mental_health_test" | "promissory_note" | "id_card_received"

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
  documents: Record<CaregiverDocumentField, CaregiverDocumentUpload | null>
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس",
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "رد شده",
  suspended: "مسدود شده",
}
