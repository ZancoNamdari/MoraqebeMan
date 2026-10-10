"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BellRing, GripVertical, Plus, Settings as SettingsIcon, Trash2, UserCog, Wallet } from "lucide-react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useAuth } from "@/hooks/useauth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { authService } from "@/services/auth.service"
import { agencyService } from "@/services/agency.service"
import { remindersService } from "@/services/reminders.service"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "@/components/layout/icon-rail"
import {
  ACCENT_PRESETS,
  FONT_SCALE_PRESETS,
  applyThemePrefs,
  getSavedThemePrefs,
  saveThemePrefs,
  type ThemePrefs,
} from "@/lib/theme"
import type { ReminderColor, ReminderPipelineOption, ReminderRule } from "@/types/reminders"

type SettingsTab = "profile" | "access" | "appearance" | "reminders"

const TABS: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
  { key: "profile", label: "پروفایل و امنیت", icon: UserCog },
  { key: "access", label: "کاربران و دسترسی", icon: Wallet },
  { key: "appearance", label: "ظاهر و شخصی‌سازی", icon: SettingsIcon },
  { key: "reminders", label: "یادآوری‌ها", icon: BellRing },
]

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])
  const router = useRouter()
  const [tab, setTab] = useState<SettingsTab>("profile")

  if (authLoading || !user) return null

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-slate-900">تنظیمات</h1>
          <p className="text-xs text-slate-500">حساب کاربری، دسترسی‌ها و شخصی‌سازی ظاهر برنامه</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab user={user} />}
      {tab === "access" && <AccessTab isOwner={user.role === "agency"} router={router} />}
      {tab === "appearance" && <AppearanceTab isOwner={user.role === "agency"} />}
      {tab === "reminders" && <RemindersTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — پروفایل و امنیت: edit own basic info + change own password.
// Both endpoints are generic across every panel (apps.authentication),
// so this needs no new backend work.
// ---------------------------------------------------------------------------

function ProfileTab({ user }: { user: import("@/types/user").User }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", phone_number: "" })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState("")
  const [profileErr, setProfileErr] = useState("")

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" })
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState("")
  const [pwErr, setPwErr] = useState("")

  useEffect(() => {
    setForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone_number: user.phone_number || "",
    })
  }, [user])

  async function saveProfile() {
    setSavingProfile(true); setProfileMsg(""); setProfileErr("")
    try {
      await authService.updateOwnProfile(form)
      setProfileMsg("اطلاعات با موفقیت ذخیره شد.")
    } catch (err: any) {
      setProfileErr(err?.response?.data?.detail || "ذخیره اطلاعات با خطا مواجه شد.")
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword() {
    setPwMsg(""); setPwErr("")
    if (pwForm.next !== pwForm.confirm) {
      setPwErr("رمز جدید و تکرار آن یکسان نیستند.")
      return
    }
    setSavingPw(true)
    try {
      await authService.changePassword(pwForm.current, pwForm.next)
      setPwMsg("رمز عبور با موفقیت تغییر کرد.")
      setPwForm({ current: "", next: "", confirm: "" })
    } catch (err: any) {
      setPwErr(err?.response?.data?.detail || err?.response?.data?.current_password?.[0] || "تغییر رمز عبور با خطا مواجه شد.")
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-800">اطلاعات شخصی</h2>
        {profileMsg && <p className="mb-2 text-xs text-emerald-600">{profileMsg}</p>}
        {profileErr && <p className="mb-2 text-xs text-destructive">{profileErr}</p>}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>نام</Label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>نام خانوادگی</Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>شماره موبایل</Label>
            <Input dir="ltr" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          </div>
          <Button size="sm" disabled={savingProfile} onClick={saveProfile}>
            {savingProfile ? "در حال ذخیره..." : "ذخیره اطلاعات"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-800">تغییر رمز عبور</h2>
        {pwMsg && <p className="mb-2 text-xs text-emerald-600">{pwMsg}</p>}
        {pwErr && <p className="mb-2 text-xs text-destructive">{pwErr}</p>}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>رمز عبور فعلی</Label>
            <Input type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>رمز عبور جدید</Label>
            <Input type="password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>تکرار رمز عبور جدید</Label>
            <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
          </div>
          <Button size="sm" disabled={savingPw} onClick={savePassword}>
            {savingPw ? "در حال تغییر..." : "تغییر رمز عبور"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — کاربران و دسترسی: owner-only. Links out to the already-built
// user-management pages (adding a user under a given role lives there,
// not duplicated here), plus the one real, backend-enforced access
// toggle — see apps.finance.views._resolve_finance_tenant.
// ---------------------------------------------------------------------------

function AccessTab({ isOwner, router }: { isOwner: boolean; router: ReturnType<typeof useRouter> }) {
  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [adminFinanceAccess, setAdminFinanceAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      setAdminFinanceAccess(profile.admin_finance_access)
    }).finally(() => setLoading(false))
  }, [])

  async function toggleAdminFinanceAccess() {
    setSaving(true); setError("")
    try {
      const updated = await agencyService.updateProfile({ admin_finance_access: !adminFinanceAccess })
      setAdminFinanceAccess(updated.admin_finance_access)
    } catch {
      setError("ذخیره تغییرات با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  if (!isOwner) {
    return <p className="text-sm text-muted-foreground">این بخش فقط برای مدیر آژانس در دسترس است.</p>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold text-slate-800">افزودن و مدیریت کاربران</h2>
        <p className="mb-3 text-xs text-slate-500">افزودن کاربر در نقش‌های مختلف، فقط با دسترسی مدیر امکان‌پذیر است.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push(ROUTES.employees)}>مشاهده همه کارمندان</Button>
          <Button size="sm" variant="outline" onClick={() => router.push(ROUTES.supervisors)}>افزودن سوپروایزر</Button>
          <Button size="sm" variant="outline" onClick={() => router.push(ROUTES.admins)}>افزودن ادمین</Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold text-slate-800">سطح دسترسی نقش‌ها</h2>
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        {loading || agencyId === null ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : (
          <label className="flex items-center justify-between rounded-md border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-800">دسترسی ادمین‌ها به بخش مالی</p>
              <p className="text-xs text-slate-500">در صورت فعال بودن، ادمین‌های این آژانس هم می‌توانند بخش «مالی» را ببینند و در آن کار کنند.</p>
            </div>
            <button
              type="button"
              onClick={toggleAdminFinanceAccess}
              disabled={saving}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                adminFinanceAccess ? "bg-primary" : "bg-slate-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  adminFinanceAccess ? "right-0.5" : "right-5"
                )}
              />
            </button>
          </label>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3 — ظاهر و شخصی‌سازی: per-user, client-side only (see lib/theme.ts).
// ---------------------------------------------------------------------------

function AppearanceTab({ isOwner }: { isOwner: boolean }) {
  const [prefs, setPrefs] = useState<ThemePrefs | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    setPrefs(getSavedThemePrefs())
  }, [])

  const orderedItems = (() => {
    if (!prefs) return []
    const base = NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner)
    if (prefs.sidebarOrder.length === 0) return base
    return [...base].sort((a, b) => {
      const ai = prefs.sidebarOrder.indexOf(a.href)
      const bi = prefs.sidebarOrder.indexOf(b.href)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  })()

  function update(next: Partial<ThemePrefs>) {
    if (!prefs) return
    const merged = { ...prefs, ...next }
    setPrefs(merged)
    saveThemePrefs(merged)
    applyThemePrefs(merged)
    setSavedMsg(true)
    window.setTimeout(() => setSavedMsg(false), 1500)
  }

  // Real drag-and-drop (not arrow buttons) for reordering the sidebar
  // icons — @dnd-kit/core + @dnd-kit/sortable, already a dependency
  // of this project. PointerSensor handles mouse/touch dragging,
  // KeyboardSensor keeps it operable with arrow keys + space for
  // anyone who can't drag with a mouse.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const hrefs = orderedItems.map((i) => i.href)
    const fromIndex = hrefs.indexOf(String(active.id))
    const toIndex = hrefs.indexOf(String(over.id))
    if (fromIndex === -1 || toIndex === -1) return
    update({ sidebarOrder: arrayMove(hrefs, fromIndex, toIndex) })
  }

  if (!prefs) return <Skeleton className="h-64 w-full rounded-2xl" />

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-800">رنگ اصلی برنامه</h2>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => update({ accent: a.key })}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                prefs.accent === a.key ? "border-slate-900" : "border-slate-200"
              )}
            >
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: a.primary }} />
              {a.label}
            </button>
          ))}
        </div>

        <h2 className="mb-3 mt-5 text-sm font-bold text-slate-800">اندازه فونت</h2>
        <div className="flex gap-2">
          {FONT_SCALE_PRESETS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => update({ fontScale: f.key })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                prefs.fontScale === f.key ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <h2 className="mb-3 mt-5 text-sm font-bold text-slate-800">تم</h2>
        <label className="flex items-center justify-between rounded-md border border-slate-100 p-3">
          <span className="text-sm text-slate-700">حالت تیره</span>
          <button
            type="button"
            onClick={() => update({ darkMode: !prefs.darkMode })}
            className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", prefs.darkMode ? "bg-primary" : "bg-slate-300")}
          >
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", prefs.darkMode ? "right-0.5" : "right-5")} />
          </button>
        </label>

        {savedMsg && <p className="mt-3 text-xs text-emerald-600">ذخیره شد.</p>}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-bold text-slate-800">ترتیب آیکون‌های نوار کناری</h2>
        <p className="mb-3 text-xs text-slate-500">فقط برای شما — آیتم‌ها را با نگه‌داشتن دستگیره و کشیدن جابه‌جا کنید.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedItems.map((i) => i.href)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {orderedItems.map((item) => (
                <SortableNavRow key={item.href} href={item.href} label={item.label} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

/**
 * One draggable row in the sidebar-order list. useSortable gives us
 * the drag transform/transition and the props to spread onto the
 * drag handle — only the handle (not the whole row) is the drag
 * trigger, so the row's own click targets (if any get added later)
 * stay usable.
 */
function SortableNavRow({ href, label }: { href: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: href })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center justify-between rounded-md border border-slate-100 bg-white px-3 py-2",
        isDragging && "relative z-10 shadow-lg"
      )}
    >
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
        aria-label={`جابه‌جایی ${label}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 4 — یادآوری‌ها: agency-configurable "N days after stage X, badge
// in stage Y" rules — for ANY registered pipeline (نمای کلی
// خدمت‌گیرنده، بانک اطلاعات مراقبان، خدمات مقطعی، and whatever gets
// registered later), not just خدمات مقطعی — see backend apps.reminders.
// Picking a pipeline populates the anchor/display stage dropdowns from
// THAT pipeline's own stages, since each has a different stage set.
// The rule list below groups everything by pipeline so an agency can
// see all its reminder policy in one place.
// ---------------------------------------------------------------------------

const REMINDER_COLOR_OPTIONS: { value: ReminderColor; label: string }[] = [
  { value: "red", label: "قرمز" },
  { value: "amber", label: "نارنجی" },
  { value: "blue", label: "آبی" },
]

function emptyRuleForm(pipelineKey: string): {
  pipeline_key: string; anchor_stage: string; display_stage: string
  days_threshold: string; label: string; color: ReminderColor
} {
  return { pipeline_key: pipelineKey, anchor_stage: "", display_stage: "", days_threshold: "7", label: "", color: "red" }
}

function RemindersTab() {
  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [pipelines, setPipelines] = useState<ReminderPipelineOption[]>([])
  const [rules, setRules] = useState<ReminderRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyRuleForm(""))
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return Promise.all([
        remindersService.pipelines(profile.id).then((rows) => {
          setPipelines(rows)
          if (rows.length > 0) setForm(emptyRuleForm(rows[0].key))
        }),
        remindersService.list(profile.id).then(setRules),
      ])
    }).finally(() => setLoading(false))
  }, [])

  const selectedPipeline = pipelines.find((p) => p.key === form.pipeline_key)

  function onPickPipeline(pipelineKey: string) {
    setForm(emptyRuleForm(pipelineKey))
  }

  async function toggleActive(rule: ReminderRule) {
    if (agencyId === null) return
    const updated = await remindersService.update(agencyId, rule.id, { is_active: !rule.is_active })
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)))
  }

  async function removeRule(rule: ReminderRule) {
    if (agencyId === null) return
    if (!window.confirm("این قانون یادآوری حذف شود؟")) return
    await remindersService.remove(agencyId, rule.id)
    setRules((prev) => prev.filter((r) => r.id !== rule.id))
  }

  async function createRule() {
    if (agencyId === null || !selectedPipeline) return
    setSaving(true); setError("")
    try {
      const created = await remindersService.create(agencyId, {
        pipeline_key: form.pipeline_key,
        anchor_stage: form.anchor_stage,
        display_stage: form.display_stage,
        days_threshold: Number(form.days_threshold),
        label: form.label,
        color: form.color,
      })
      setRules((prev) => [...prev, created])
      setForm(emptyRuleForm(form.pipeline_key))
      setShowForm(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "ثبت قانون یادآوری با خطا مواجه شد.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">قوانین یادآوری</h2>
            <p className="text-xs text-slate-500">
              مثال: «۷ روز بعد از اعزام، در مرحله‌ی پیگیری یادآوری تماس نشان بده» — برای هر فهرست مراحل جدا قابل تنظیم است.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> قانون جدید
          </Button>
        </div>

        {showForm && (
          <div className="mb-4 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <label className="space-y-1 block">
              <span className="text-xs text-slate-600">فهرست مراحل</span>
              <select
                value={form.pipeline_key}
                onChange={(e) => onPickPipeline(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                {pipelines.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-slate-600">مبنای شمارش روز (از ورود به این مرحله)</span>
                <select
                  value={form.anchor_stage}
                  onChange={(e) => setForm({ ...form, anchor_stage: e.target.value })}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                >
                  <option value="">انتخاب کنید</option>
                  {selectedPipeline?.stages.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-600">نمایش یادآوری در مرحله</span>
                <select
                  value={form.display_stage}
                  onChange={(e) => setForm({ ...form, display_stage: e.target.value })}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                >
                  <option value="">انتخاب کنید</option>
                  {selectedPipeline?.stages.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="text-xs text-slate-600">تعداد روز</span>
                <Input dir="ltr" value={form.days_threshold} onChange={(e) => setForm({ ...form, days_threshold: e.target.value })} />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-slate-600">متن یادآوری</span>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="موعد تماس با خدمت‌گیرنده" />
              </label>
            </div>
            <label className="space-y-1">
              <span className="text-xs text-slate-600">رنگ</span>
              <div className="flex gap-2">
                {REMINDER_COLOR_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: o.value })}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      form.color === o.value ? "border border-slate-900" : "border border-slate-200",
                      o.value === "red" && "bg-red-50 text-red-700",
                      o.value === "amber" && "bg-amber-50 text-amber-700",
                      o.value === "blue" && "bg-blue-50 text-blue-700",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={saving || !form.label || !form.days_threshold || !form.anchor_stage || !form.display_stage}
                onClick={createRule}
              >
                {saving ? "در حال ثبت..." : "ثبت قانون"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>انصراف</Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {rules.length === 0 && <p className="text-xs text-slate-400">هنوز قانونی ثبت نشده.</p>}
          {pipelines.map((pipeline) => {
            const pipelineRules = rules.filter((r) => r.pipeline_key === pipeline.key)
            if (pipelineRules.length === 0) return null
            return (
              <div key={pipeline.key}>
                <p className="mb-1.5 text-[11px] font-bold text-slate-500">{pipeline.label}</p>
                <div className="space-y-1.5">
                  {pipelineRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700">{rule.label}</p>
                        <p className="text-[11px] text-slate-500">
                          {rule.days_threshold} روز بعد از «{rule.anchor_stage_display}» — نمایش در «{rule.display_stage_display}»
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleActive(rule)}
                        className={cn(
                          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                          rule.is_active ? "bg-primary" : "bg-slate-300"
                        )}
                        title={rule.is_active ? "فعال" : "غیرفعال"}
                      >
                        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", rule.is_active ? "right-0.5" : "right-5")} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRule(rule)}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
