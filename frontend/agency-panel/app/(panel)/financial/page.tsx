"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Wallet, Plus, X } from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { agencyService } from "@/services/agency.service"
import { financeService } from "@/services/finance.service"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import {
  BILLING_CYCLE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  type AssignmentBilling,
  type BillingCycle,
  type CaregiverPerformanceRow,
  type FinanceOverview,
  type Invoice,
  type InvoiceStatus,
  type ServiceTariff,
  type StaffPerformanceRow,
} from "@/types/finance"

type MainTab = "tariffs" | "invoices" | "overview" | "performance"

function toman(value: string | number | null | undefined) {
  const n = Number(value ?? 0)
  return n.toLocaleString("fa-IR") + " تومان"
}

const STATUS_BADGE: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "پیش‌نویس", variant: "outline" },
  issued: { label: "صادرشده", variant: "secondary" },
  partially_paid: { label: "بخشی پرداخت‌شده", variant: "default" },
  paid: { label: "پرداخت‌شده", variant: "default" },
  overdue: { label: "معوق", variant: "destructive" },
  cancelled: { label: "لغوشده", variant: "outline" },
}

const TABS: { key: MainTab; label: string }[] = [
  { key: "tariffs", label: "مدیریت تعرفه‌ها" },
  { key: "invoices", label: "صورت‌حساب‌ها" },
  { key: "overview", label: "نظارت بر عملکرد مالی" },
  { key: "performance", label: "عملکرد مالی کارمندان" },
]

export default function FinancialPage() {
  // Deliberately excludes agency_admin — matches the backend's finance
  // views, which resolve tenancy with allow_admin=False (money is a more
  // sensitive surface than caregiver/patient data entry; see
  // apps.finance.views's module docstring).
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor"])
  const router = useRouter()

  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<MainTab>("tariffs")

  const [tariffs, setTariffs] = useState<ServiceTariff[]>([])
  const [assignments, setAssignments] = useState<AssignmentBilling[]>([])

  function refreshBase(id: number) {
    return Promise.all([
      financeService.listTariffs(id),
      financeService.listAssignmentsBilling(id),
    ]).then(([t, a]) => {
      setTariffs(t)
      setAssignments(a)
    })
  }

  useEffect(() => {
    if (!user) return
    if (user.role !== "agency" && user.role !== "agency_supervisor") {
      router.replace(ROUTES.dashboard)
      return
    }
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return refreshBase(profile.id)
    }).finally(() => setLoading(false))
  }, [user, router])

  if (authLoading || !user) return null

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary-strong" />
        <div>
          <h1 className="text-lg font-bold text-slate-900">مالی</h1>
          <p className="text-xs text-slate-500">تعرفه‌ها، صورت‌حساب‌ها و عملکرد مالی آژانس</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading || agencyId === null ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <>
          {tab === "tariffs" && (
            <TariffsTab
              agencyId={agencyId}
              tariffs={tariffs}
              setTariffs={setTariffs}
              assignments={assignments}
              setAssignments={setAssignments}
            />
          )}
          {tab === "invoices" && <InvoicesTab agencyId={agencyId} assignments={assignments} />}
          {tab === "overview" && <OverviewTab agencyId={agencyId} />}
          {tab === "performance" && <PerformanceTab agencyId={agencyId} />}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — مدیریت تعرفه‌ها: agency-wide default rate per service type, plus
// per-assignment overrides (per the confirmed "هر دو" requirement).
// ---------------------------------------------------------------------------

type TariffFormState = { hourly_rate: string; daily_rate: string; monthly_rate: string; is_active: boolean }

function TariffsTab({
  agencyId, tariffs, setTariffs, assignments, setAssignments,
}: {
  agencyId: number
  tariffs: ServiceTariff[]
  setTariffs: (t: ServiceTariff[]) => void
  assignments: AssignmentBilling[]
  setAssignments: (a: AssignmentBilling[]) => void
}) {
  const [forms, setForms] = useState<Record<string, TariffFormState>>({})
  const [savingType, setSavingType] = useState<string | null>(null)
  const [error, setError] = useState("")

  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null)
  const [assignmentForm, setAssignmentForm] = useState({
    service_type: "", billing_cycle: "", custom_hourly_rate: "", custom_daily_rate: "", custom_monthly_rate: "",
  })
  const [savingAssignment, setSavingAssignment] = useState(false)

  useEffect(() => {
    const next: Record<string, TariffFormState> = {}
    for (const opt of SERVICE_TYPE_OPTIONS) {
      const existing = tariffs.find((t) => t.service_type === opt.value)
      next[opt.value] = {
        hourly_rate: existing?.hourly_rate ?? "",
        daily_rate: existing?.daily_rate ?? "",
        monthly_rate: existing?.monthly_rate ?? "",
        is_active: existing?.is_active ?? true,
      }
    }
    setForms(next)
  }, [tariffs])

  async function saveTariff(serviceType: string) {
    const f = forms[serviceType]
    setSavingType(serviceType); setError("")
    try {
      const updated = await financeService.upsertTariff(agencyId, {
        service_type: serviceType as any,
        hourly_rate: f.hourly_rate === "" ? null : Number(f.hourly_rate),
        daily_rate: f.daily_rate === "" ? null : Number(f.daily_rate),
        monthly_rate: f.monthly_rate === "" ? null : Number(f.monthly_rate),
        is_active: f.is_active,
      })
      setTariffs([...tariffs.filter((t) => t.service_type !== serviceType), updated])
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ذخیره تعرفه با خطا مواجه شد.")
    } finally {
      setSavingType(null)
    }
  }

  function startAssignmentEdit(a: AssignmentBilling) {
    setAssignmentForm({
      service_type: a.service_type,
      billing_cycle: a.billing_cycle,
      custom_hourly_rate: a.custom_hourly_rate ?? "",
      custom_daily_rate: a.custom_daily_rate ?? "",
      custom_monthly_rate: a.custom_monthly_rate ?? "",
    })
    setEditingAssignmentId(a.id)
  }

  async function saveAssignment(a: AssignmentBilling) {
    setSavingAssignment(true); setError("")
    try {
      const updated = await financeService.updateAssignmentBilling(agencyId, a.id, {
        service_type: (assignmentForm.service_type || undefined) as any,
        billing_cycle: (assignmentForm.billing_cycle || undefined) as any,
        custom_hourly_rate: assignmentForm.custom_hourly_rate === "" ? null : Number(assignmentForm.custom_hourly_rate),
        custom_daily_rate: assignmentForm.custom_daily_rate === "" ? null : Number(assignmentForm.custom_daily_rate),
        custom_monthly_rate: assignmentForm.custom_monthly_rate === "" ? null : Number(assignmentForm.custom_monthly_rate),
      })
      setAssignments(assignments.map((x) => (x.id === a.id ? updated : x)))
      setEditingAssignmentId(null)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ذخیره تخصیص با خطا مواجه شد.")
    } finally {
      setSavingAssignment(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-800">تعرفه پیش‌فرض بر اساس نوع خدمت</h2>
        <div className="space-y-2">
          {SERVICE_TYPE_OPTIONS.map((opt) => {
            const f = forms[opt.value]
            if (!f) return null
            return (
              <div key={opt.value} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-2 text-sm font-medium text-slate-900">{opt.label}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">نرخ ساعتی</Label>
                    <Input dir="ltr" type="number" value={f.hourly_rate} onChange={(e) => setForms({ ...forms, [opt.value]: { ...f, hourly_rate: e.target.value } })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">نرخ روزانه</Label>
                    <Input dir="ltr" type="number" value={f.daily_rate} onChange={(e) => setForms({ ...forms, [opt.value]: { ...f, daily_rate: e.target.value } })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">نرخ ماهانه</Label>
                    <Input dir="ltr" type="number" value={f.monthly_rate} onChange={(e) => setForms({ ...forms, [opt.value]: { ...f, monthly_rate: e.target.value } })} />
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" disabled={savingType === opt.value} onClick={() => saveTariff(opt.value)} className="w-full">
                      {savingType === opt.value ? "در حال ذخیره..." : "ذخیره"}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-800">تعرفه اختصاصی هر تخصیص</h2>
        <p className="mb-2 text-xs text-slate-500">
          خالی‌گذاشتن نرخ‌ها یعنی تعرفه پیش‌فرض همان نوع خدمت روی این تخصیص اعمال می‌شود.
        </p>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز تخصیصی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => {
              const isEditing = editingAssignmentId === a.id
              return (
                <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <button
                    type="button"
                    onClick={() => (isEditing ? setEditingAssignmentId(null) : startAssignmentEdit(a))}
                    className="flex w-full items-center justify-between text-right"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{a.caregiver_name} ← {a.patient_name}</p>
                      <p className="text-xs text-slate-500">
                        {a.service_type_display || "نوع خدمت تعیین نشده"}
                        {a.billing_cycle_display ? ` • دوره: ${a.billing_cycle_display}` : ""}
                      </p>
                    </div>
                  </button>
                  {isEditing && (
                    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>نوع خدمت</Label>
                          <select
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={assignmentForm.service_type}
                            onChange={(e) => setAssignmentForm({ ...assignmentForm, service_type: e.target.value })}
                          >
                            <option value="">— تعیین نشده —</option>
                            {SERVICE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>دوره صورت‌حساب</Label>
                          <select
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={assignmentForm.billing_cycle}
                            onChange={(e) => setAssignmentForm({ ...assignmentForm, billing_cycle: e.target.value })}
                          >
                            <option value="">— تعیین نشده —</option>
                            {BILLING_CYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">نرخ ساعتی اختصاصی</Label>
                          <Input dir="ltr" type="number" value={assignmentForm.custom_hourly_rate} onChange={(e) => setAssignmentForm({ ...assignmentForm, custom_hourly_rate: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">نرخ روزانه اختصاصی</Label>
                          <Input dir="ltr" type="number" value={assignmentForm.custom_daily_rate} onChange={(e) => setAssignmentForm({ ...assignmentForm, custom_daily_rate: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">نرخ ماهانه اختصاصی</Label>
                          <Input dir="ltr" type="number" value={assignmentForm.custom_monthly_rate} onChange={(e) => setAssignmentForm({ ...assignmentForm, custom_monthly_rate: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={savingAssignment} onClick={() => saveAssignment(a)}>
                          {savingAssignment ? "در حال ذخیره..." : "ذخیره تغییرات"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingAssignmentId(null)}>انصراف</Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — صورت‌حساب‌ها: generate invoices (amount always calculated server-
// side) and record real payments against them.
// ---------------------------------------------------------------------------

function InvoicesTab({ agencyId, assignments }: { agencyId: number; assignments: AssignmentBilling[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [statusFilter, setStatusFilter] = useState("")
  const [periodTypeFilter, setPeriodTypeFilter] = useState("")

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    assignment_id: "", period_type: "monthly", period_start: "", period_end: "", due_date: "", notes: "",
  })
  const [creating, setCreating] = useState(false)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "cash", paid_at: "", notes: "" })
  const [savingPayment, setSavingPayment] = useState(false)

  function refresh() {
    setLoading(true)
    return financeService
      .listInvoices(agencyId, {
        status: (statusFilter || undefined) as any,
        period_type: (periodTypeFilter || undefined) as any,
      })
      .then(setInvoices)
      .catch(() => setError("دریافت صورت‌حساب‌ها با خطا مواجه شد."))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [agencyId, statusFilter, periodTypeFilter])

  async function submitCreate() {
    if (!createForm.assignment_id || !createForm.period_start || !createForm.period_end) {
      setError("تخصیص، شروع و پایان دوره الزامی است.")
      return
    }
    setCreating(true); setError("")
    try {
      const invoice = await financeService.createInvoice(agencyId, {
        assignment_id: Number(createForm.assignment_id),
        period_type: createForm.period_type as any,
        period_start: createForm.period_start,
        period_end: createForm.period_end,
        due_date: createForm.due_date || undefined,
        notes: createForm.notes || undefined,
      })
      setInvoices([invoice, ...invoices])
      setShowCreate(false)
      setCreateForm({ assignment_id: "", period_type: "monthly", period_start: "", period_end: "", due_date: "", notes: "" })
    } catch (err: any) {
      setError(err?.response?.data?.detail || "صدور صورت‌حساب با خطا مواجه شد — احتمالاً نرخی برای این نوع خدمت تعریف نشده.")
    } finally {
      setCreating(false)
    }
  }

  async function submitPayment(invoice: Invoice) {
    if (!paymentForm.amount || !paymentForm.paid_at) {
      setError("مبلغ و تاریخ پرداخت الزامی است.")
      return
    }
    setSavingPayment(true); setError("")
    try {
      const updated = await financeService.createPayment(agencyId, invoice.id, {
        amount: Number(paymentForm.amount), method: paymentForm.method as any,
        paid_at: paymentForm.paid_at, notes: paymentForm.notes || undefined,
      })
      setInvoices(invoices.map((i) => (i.id === invoice.id ? updated : i)))
      setPaymentForm({ amount: "", method: "cash", paid_at: "", notes: "" })
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ثبت پرداخت با خطا مواجه شد.")
    } finally {
      setSavingPayment(false)
    }
  }

  async function cancelInvoice(invoice: Invoice) {
    try {
      const updated = await financeService.cancelInvoice(agencyId, invoice.id)
      setInvoices(invoices.map((i) => (i.id === invoice.id ? updated : i)))
    } catch {
      setError("لغو صورت‌حساب با خطا مواجه شد.")
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STATUS_BADGE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={periodTypeFilter} onChange={(e) => setPeriodTypeFilter(e.target.value)}>
          <option value="">همه دوره‌ها</option>
          {BILLING_CYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Button size="sm" variant="outline" className="gap-1.5 mr-auto" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          صدور صورت‌حساب جدید
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>تخصیص</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={createForm.assignment_id}
                onChange={(e) => setCreateForm({ ...createForm, assignment_id: e.target.value })}
              >
                <option value="">— انتخاب کنید —</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>{a.caregiver_name} ← {a.patient_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>دوره صورت‌حساب</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={createForm.period_type}
                onChange={(e) => setCreateForm({ ...createForm, period_type: e.target.value })}
              >
                {BILLING_CYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>سررسید (اختیاری)</Label>
              <Input dir="ltr" placeholder="1404-02-15" value={createForm.due_date} onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>شروع دوره (شمسی)</Label>
              <Input dir="ltr" placeholder="1404-02-01" value={createForm.period_start} onChange={(e) => setCreateForm({ ...createForm, period_start: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>پایان دوره (شمسی)</Label>
              <Input dir="ltr" placeholder="1404-02-30" value={createForm.period_end} onChange={(e) => setCreateForm({ ...createForm, period_end: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>یادداشت (اختیاری)</Label>
              <Input value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} />
            </div>
          </div>
          <Button size="sm" className="mt-3" disabled={creating} onClick={submitCreate}>
            {creating ? "در حال صدور..." : "صدور صورت‌حساب"}
          </Button>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">صورت‌حسابی یافت نشد.</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const isExpanded = expandedId === inv.id
            const badge = STATUS_BADGE[inv.status]
            return (
              <div key={inv.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : inv.id)} className="flex w-full items-center justify-between text-right">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{inv.caregiver_name} ← {inv.patient_name}</p>
                    <p className="text-xs text-slate-500">
                      {inv.period_type_display} • {inv.period_start} تا {inv.period_end}
                    </p>
                  </div>
                  <div className="text-left">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <p className="mt-1 text-xs font-medium text-slate-700" dir="ltr">{toman(inv.amount)}</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div><p className="text-slate-400">مبلغ کل</p><p className="font-medium" dir="ltr">{toman(inv.amount)}</p></div>
                      <div><p className="text-slate-400">دریافت‌شده</p><p className="font-medium" dir="ltr">{toman(inv.paid_amount)}</p></div>
                      <div><p className="text-slate-400">مانده</p><p className="font-medium" dir="ltr">{toman(inv.remaining_amount)}</p></div>
                      <div><p className="text-slate-400">صادرکننده</p><p className="font-medium">{inv.created_by_username || "—"}</p></div>
                    </div>

                    {inv.payments.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-600">پرداخت‌های ثبت‌شده</p>
                        {inv.payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-xs">
                            <span>{p.paid_at} • {p.method_display}</span>
                            <span dir="ltr" className="font-medium">{toman(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {inv.status !== "cancelled" && inv.status !== "paid" && (
                      <div className="rounded-md border border-dashed border-slate-200 p-2">
                        <p className="mb-2 text-xs font-bold text-slate-600">ثبت پرداخت جدید</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <Input dir="ltr" type="number" placeholder="مبلغ" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                            {PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <Input dir="ltr" placeholder="تاریخ پرداخت 1404-02-05" value={paymentForm.paid_at} onChange={(e) => setPaymentForm({ ...paymentForm, paid_at: e.target.value })} />
                          <Button size="sm" disabled={savingPayment} onClick={() => submitPayment(inv)}>
                            {savingPayment ? "..." : "ثبت پرداخت"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {(inv.status === "issued" || inv.status === "partially_paid") && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelInvoice(inv)}>
                        لغو صورت‌حساب
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3 — نظارت بر عملکرد مالی: agency-wide totals with a day/week/month
// filter (the confirmed "انواع فیلترهای مالی هفتگی روزانه ماهانه" requirement).
// ---------------------------------------------------------------------------

function DateRangeAndGranularity({
  from, to, granularity, onFrom, onTo, onGranularity,
}: {
  from: string; to: string; granularity: BillingCycle
  onFrom: (v: string) => void; onTo: (v: string) => void; onGranularity: (v: BillingCycle) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {BILLING_CYCLE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onGranularity(o.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              granularity === o.value ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Input dir="ltr" placeholder="از تاریخ 1404-01-01" value={from} onChange={(e) => onFrom(e.target.value)} className="w-40" />
      <Input dir="ltr" placeholder="تا تاریخ 1404-03-01" value={to} onChange={(e) => onTo(e.target.value)} className="w-40" />
    </div>
  )
}

function OverviewTab({ agencyId }: { agencyId: number }) {
  const [granularity, setGranularity] = useState<BillingCycle>("monthly")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [data, setData] = useState<FinanceOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    financeService.overview(agencyId, granularity, from || undefined, to || undefined)
      .then(setData)
      .catch(() => setError("دریافت گزارش مالی با خطا مواجه شد — قالب تاریخ باید شمسی YYYY-MM-DD باشد."))
      .finally(() => setLoading(false))
  }, [agencyId, granularity, from, to])

  return (
    <div className="space-y-4">
      <DateRangeAndGranularity from={from} to={to} granularity={granularity} onFrom={setFrom} onTo={setTo} onGranularity={setGranularity} />
      {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="مجموع صورت‌حساب‌شده" value={toman(data.total_billed)} />
            <StatCard label="مجموع دریافت‌شده" value={toman(data.total_paid)} />
            <StatCard label="مانده مطالبات" value={toman(data.total_outstanding)} />
            <StatCard label="تعداد صورت‌حساب" value={String(data.invoice_count)} />
          </div>

          {data.series.length === 0 ? (
            <p className="text-sm text-muted-foreground">داده‌ای در این بازه یافت نشد.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="p-2 text-right">دوره</th>
                    <th className="p-2 text-right">صورت‌حساب‌شده</th>
                    <th className="p-2 text-right">دریافت‌شده</th>
                    <th className="p-2 text-right">تعداد</th>
                  </tr>
                </thead>
                <tbody>
                  {data.series.map((row) => (
                    <tr key={row.period} className="border-t border-slate-100">
                      <td className="p-2" dir="ltr">{row.period}</td>
                      <td className="p-2" dir="ltr">{toman(row.billed)}</td>
                      <td className="p-2" dir="ltr">{toman(row.paid)}</td>
                      <td className="p-2">{row.invoice_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900" dir="ltr">{value}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 4 — عملکرد مالی کارمندان: caregivers (revenue they generate) and
// supervisors/admins (revenue attributed via who registered the patient).
// ---------------------------------------------------------------------------

function PerformanceTab({ agencyId }: { agencyId: number }) {
  const [subTab, setSubTab] = useState<"caregivers" | "staff">("caregivers")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [caregiverRows, setCaregiverRows] = useState<CaregiverPerformanceRow[]>([])
  const [staffRows, setStaffRows] = useState<StaffPerformanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true); setError("")
    const call = subTab === "caregivers"
      ? financeService.caregiverPerformance(agencyId, from || undefined, to || undefined).then(setCaregiverRows)
      : financeService.staffPerformance(agencyId, from || undefined, to || undefined).then(setStaffRows)
    call
      .catch(() => setError("دریافت گزارش عملکرد با خطا مواجه شد."))
      .finally(() => setLoading(false))
  }, [agencyId, subTab, from, to])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {([
            { key: "caregivers", label: "مراقبین" },
            { key: "staff", label: "سوپروایزر و ادمین" },
          ] as { key: "caregivers" | "staff"; label: string }[]).map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setSubTab(o.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                subTab === o.key ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Input dir="ltr" placeholder="از تاریخ 1404-01-01" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        <Input dir="ltr" placeholder="تا تاریخ 1404-03-01" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : subTab === "caregivers" ? (
        caregiverRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">داده‌ای در این بازه یافت نشد.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-2 text-right">مراقب</th>
                  <th className="p-2 text-right">صورت‌حساب‌شده</th>
                  <th className="p-2 text-right">دریافت‌شده</th>
                  <th className="p-2 text-right">مانده</th>
                  <th className="p-2 text-right">تعداد صورت‌حساب</th>
                </tr>
              </thead>
              <tbody>
                {caregiverRows.map((r) => (
                  <tr key={r.caregiver_id} className="border-t border-slate-100">
                    <td className="p-2">{r.caregiver_name}</td>
                    <td className="p-2" dir="ltr">{toman(r.billed)}</td>
                    <td className="p-2" dir="ltr">{toman(r.paid)}</td>
                    <td className="p-2" dir="ltr">{toman(r.outstanding)}</td>
                    <td className="p-2">{r.invoice_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : staffRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">داده‌ای در این بازه یافت نشد.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="p-2 text-right">کارمند</th>
                <th className="p-2 text-right">صورت‌حساب‌شده</th>
                <th className="p-2 text-right">دریافت‌شده</th>
                <th className="p-2 text-right">مانده</th>
                <th className="p-2 text-right">تعداد بیمار</th>
              </tr>
            </thead>
            <tbody>
              {staffRows.map((r) => (
                <tr key={r.staff_user_id ?? "unknown"} className="border-t border-slate-100">
                  <td className="p-2">{r.staff_name}</td>
                  <td className="p-2" dir="ltr">{toman(r.billed)}</td>
                  <td className="p-2" dir="ltr">{toman(r.paid)}</td>
                  <td className="p-2" dir="ltr">{toman(r.outstanding)}</td>
                  <td className="p-2">{r.patient_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
