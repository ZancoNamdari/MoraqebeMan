import { api } from "./api"
import type {
  AssignmentBilling,
  CaregiverPerformanceRow,
  CreateInvoicePayload,
  CreatePaymentPayload,
  FinanceOverview,
  Invoice,
  InvoiceFilters,
  Payment,
  ServiceTariff,
  StaffPerformanceRow,
  UpdateAssignmentBillingPayload,
  UpsertServiceTariffPayload,
} from "@/types/finance"

function toQuery(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
  if (entries.length === 0) return ""
  return "?" + new URLSearchParams(entries as [string, string][]).toString()
}

export const financeService = {
  async listTariffs(agencyId: number) {
    const { data } = await api.get(`/api/agencies/${agencyId}/finance/tariffs/`)
    return data as ServiceTariff[]
  },

  async upsertTariff(agencyId: number, payload: UpsertServiceTariffPayload) {
    const { data } = await api.post(`/api/agencies/${agencyId}/finance/tariffs/`, payload)
    return data as ServiceTariff
  },

  async listAssignmentsBilling(agencyId: number) {
    const { data } = await api.get(`/api/agencies/${agencyId}/finance/assignments/`)
    return data as AssignmentBilling[]
  },

  async updateAssignmentBilling(agencyId: number, assignmentId: number, payload: UpdateAssignmentBillingPayload) {
    const { data } = await api.patch(`/api/agencies/${agencyId}/finance/assignments/${assignmentId}/`, payload)
    return data as AssignmentBilling
  },

  async listInvoices(agencyId: number, filters: InvoiceFilters = {}) {
    const query = toQuery({
      period_type: filters.period_type,
      status: filters.status,
      from: filters.from,
      to: filters.to,
    })
    const { data } = await api.get(`/api/agencies/${agencyId}/finance/invoices/${query}`)
    return data as Invoice[]
  },

  async createInvoice(agencyId: number, payload: CreateInvoicePayload) {
    const { data } = await api.post(`/api/agencies/${agencyId}/finance/invoices/`, payload)
    return data as Invoice
  },

  async cancelInvoice(agencyId: number, invoiceId: number) {
    const { data } = await api.patch(`/api/agencies/${agencyId}/finance/invoices/${invoiceId}/`, { status: "cancelled" })
    return data as Invoice
  },

  async createPayment(agencyId: number, invoiceId: number, payload: CreatePaymentPayload) {
    const { data } = await api.post(`/api/agencies/${agencyId}/finance/invoices/${invoiceId}/payments/`, payload)
    return data as Invoice
  },

  async overview(agencyId: number, granularity: string, from?: string, to?: string) {
    const query = toQuery({ granularity, from, to })
    const { data } = await api.get(`/api/agencies/${agencyId}/finance/overview/${query}`)
    return data as FinanceOverview
  },

  async caregiverPerformance(agencyId: number, from?: string, to?: string) {
    const query = toQuery({ from, to })
    const { data } = await api.get(`/api/agencies/${agencyId}/finance/performance/caregivers/${query}`)
    return data as CaregiverPerformanceRow[]
  },

  async staffPerformance(agencyId: number, from?: string, to?: string) {
    const query = toQuery({ from, to })
    const { data } = await api.get(`/api/agencies/${agencyId}/finance/performance/staff/${query}`)
    return data as StaffPerformanceRow[]
  },
}

export type { Payment }
