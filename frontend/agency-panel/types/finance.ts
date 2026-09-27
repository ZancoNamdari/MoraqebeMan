export type ServiceType =
  | "daily"
  | "night"
  | "live_in"
  | "hospital_companion"
  | "home_companion"
  | "short_term"
  | "long_term"

export const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: "daily", label: "مراقبت روزانه" },
  { value: "night", label: "مراقبت شبانه" },
  { value: "live_in", label: "مراقبت شبانه‌روزی (مقیم)" },
  { value: "hospital_companion", label: "همراه سالمند در بیمارستان" },
  { value: "home_companion", label: "همراه سالمند در منزل" },
  { value: "short_term", label: "مراقبت موقت (چند روزه)" },
  { value: "long_term", label: "مراقبت بلندمدت" },
]

export type BillingCycle = "daily" | "weekly" | "monthly"

export const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: "daily", label: "روزانه" },
  { value: "weekly", label: "هفتگی" },
  { value: "monthly", label: "ماهانه" },
]

export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "cancelled"

export type PaymentMethod = "cash" | "card_transfer" | "bank_transfer" | "online" | "cheque" | "other"

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "نقدی" },
  { value: "card_transfer", label: "کارت‌به‌کارت" },
  { value: "bank_transfer", label: "حواله بانکی" },
  { value: "online", label: "پرداخت آنلاین" },
  { value: "cheque", label: "چک" },
  { value: "other", label: "سایر" },
]

export interface ServiceTariff {
  id: number
  service_type: ServiceType
  service_type_display: string
  hourly_rate: string | null
  daily_rate: string | null
  monthly_rate: string | null
  is_active: boolean
  created_by_username: string | null
  created_at: string
  updated_at: string
}

export interface UpsertServiceTariffPayload {
  service_type: ServiceType
  hourly_rate?: number | null
  daily_rate?: number | null
  monthly_rate?: number | null
  is_active?: boolean
}

export interface AssignmentBilling {
  id: number
  caregiver_name: string
  patient_name: string
  status: string
  service_type: ServiceType | ""
  service_type_display: string
  billing_cycle: BillingCycle | ""
  billing_cycle_display: string
  custom_hourly_rate: string | null
  custom_daily_rate: string | null
  custom_monthly_rate: string | null
}

export interface UpdateAssignmentBillingPayload {
  service_type?: ServiceType
  billing_cycle?: BillingCycle
  custom_hourly_rate?: number | null
  custom_daily_rate?: number | null
  custom_monthly_rate?: number | null
}

export interface Payment {
  id: number
  amount: string
  method: PaymentMethod
  method_display: string
  paid_at: string
  notes: string
  recorded_by_username: string | null
  created_at: string
}

export interface CreatePaymentPayload {
  amount: number
  method: PaymentMethod
  paid_at: string
  notes?: string
}

export interface Invoice {
  id: number
  assignment: number
  caregiver_name: string
  patient_name: string
  period_type: BillingCycle
  period_type_display: string
  period_start: string
  period_end: string
  amount: string
  paid_amount: string
  remaining_amount: string
  status: InvoiceStatus
  status_display: string
  due_date: string | null
  notes: string
  created_by_username: string | null
  created_at: string
  payments: Payment[]
}

export interface CreateInvoicePayload {
  assignment_id: number
  period_type: BillingCycle
  period_start: string
  period_end: string
  due_date?: string | null
  notes?: string
}

export interface InvoiceFilters {
  period_type?: BillingCycle
  status?: InvoiceStatus
  from?: string
  to?: string
}

export interface FinanceOverview {
  range: { from: string; to: string }
  granularity: BillingCycle
  total_billed: number
  total_paid: number
  total_outstanding: number
  invoice_count: number
  series: { period: string; billed: number; paid: number; invoice_count: number }[]
}

export interface CaregiverPerformanceRow {
  caregiver_id: number
  caregiver_name: string
  billed: number
  paid: number
  outstanding: number
  invoice_count: number
}

export interface StaffPerformanceRow {
  staff_user_id: number | null
  staff_name: string
  billed: number
  paid: number
  outstanding: number
  invoice_count: number
  patient_count: number
}
