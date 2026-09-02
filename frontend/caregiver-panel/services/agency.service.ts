import { api } from "./api"

// Caregiver-panel only ever needs this one call — the rest of the
// agencies API (roster, approvals) belongs to agency-panel.
export const agencyService = {
  async joinAsCaregiver(agencyCode: string) {
    const { data } = await api.post("/api/agencies/join/caregiver/", { agency_code: agencyCode })
    return data as { id: number; status: string }
  },
}
