import type { ActiveReminder } from "@/types/reminders"

export type EpisodicStage = "phone_coordination" | "dispatched" | "settled" | "followup"

// Duplicated from apps.finance.PaymentMethod's choices (see backend)
// rather than importing frontend/types/finance.ts — keeps this
// delivery self-contained whether or not the finance-section zip has
// been applied yet, since this is the only place episodic needs it.
export const EPISODIC_PAYMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "cash", label: "نقدی" },
  { value: "card_transfer", label: "کارت‌به‌کارت" },
  { value: "bank_transfer", label: "حواله بانکی" },
  { value: "online", label: "پرداخت آنلاین" },
  { value: "cheque", label: "چک" },
  { value: "other", label: "سایر" },
]

export interface EpisodicService {
  id: number
  recipient_full_name: string
  recipient_phone_number: string
  notes: string
  stage: EpisodicStage
  stage_display: string
  assigned_caregiver: number | null
  assigned_caregiver_name: string | null
  phone_coordination_at: string | null
  dispatched_at: string | null
  settled_at: string | null
  followup_at: string | null
  invoice: number | null
  invoice_amount: string | null
  invoice_status: string | null
  invoice_status_display: string | null
  active_reminders: ActiveReminder[]
  created_by_username: string | null
  created_at: string
}

export interface CreateEpisodicServicePayload {
  recipient_full_name: string
  recipient_phone_number?: string
  notes?: string
}

export interface UpdateEpisodicServiceStagePayload {
  stage?: EpisodicStage
  assigned_caregiver_id?: number | null
  notes?: string
  amount?: string
  method?: string
  paid_at?: string
}

export interface EpisodicCaregiverOption {
  id: number
  full_name: string
}
