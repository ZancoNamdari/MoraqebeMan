import { api } from "./api"
import type { AgencyCaregiverLink, AgencyDashboard, AgencyFamilyLink, AgencyProfile } from "@/types/agency"
import type { DashboardInsights, StaffDashboardData } from "@/types/dashboard"

// پروفایل آژانس تقریباً هیچ‌وقت عوض نمی‌شود ولی ~۱۸ صفحه در هر باز شدن آن را
// می‌گیرند؛ چند دقیقه در حافظه نگه می‌داریم و درخواست‌های هم‌زمان را یکی می‌کنیم.
const ME_TTL_MS = 5 * 60 * 1000
let meCache: { value: AgencyProfile; at: number } | null = null
let meInflight: Promise<AgencyProfile> | null = null

export const agencyService = {
  async me(): Promise<AgencyProfile> {
    if (meCache && Date.now() - meCache.at < ME_TTL_MS) return meCache.value
    if (!meInflight) {
      meInflight = api
        .get("/api/agencies/me/")
        .then(({ data }) => {
          meCache = { value: data as AgencyProfile, at: Date.now() }
          return meCache.value
        })
        .finally(() => {
          meInflight = null
        })
    }
    return meInflight
  },

  async updateProfile(payload: { company_name?: string; license_number?: string; admin_finance_access?: boolean }) {
    const { data } = await api.put("/api/agencies/me/", payload)
    meCache = null
    return data as AgencyProfile
  },

  async dashboard() {
    const { data } = await api.get("/api/agencies/me/dashboard/")
    return data as AgencyDashboard
  },

  async dashboardInsights() {
    const { data } = await api.get("/api/agencies/me/dashboard/insights/")
    return data as DashboardInsights
  },

  async staffDashboard() {
    const { data } = await api.get("/api/agencies/me/dashboard/staff/")
    return data as StaffDashboardData
  },

  async familyRoster() {
    const { data } = await api.get("/api/agencies/me/families/")
    return data as AgencyFamilyLink[]
  },

  async familyRequests() {
    const { data } = await api.get("/api/agencies/me/families/requests/")
    return data as AgencyFamilyLink[]
  },

  async decideFamilyRequest(linkId: number, decision: "approve" | "reject") {
    const { data } = await api.post(`/api/agencies/me/families/requests/${linkId}/${decision}/`)
    return data as AgencyFamilyLink
  },

  async caregiverRoster() {
    const { data } = await api.get("/api/agencies/me/caregivers/")
    return data as AgencyCaregiverLink[]
  },

  async caregiverRequests() {
    const { data } = await api.get("/api/agencies/me/caregivers/requests/")
    return data as AgencyCaregiverLink[]
  },

  async decideCaregiverRequest(linkId: number, decision: "approve" | "reject") {
    const { data } = await api.post(`/api/agencies/me/caregivers/requests/${linkId}/${decision}/`)
    return data as AgencyCaregiverLink
  },
}
