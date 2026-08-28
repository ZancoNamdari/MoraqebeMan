import { api } from "./api"

export interface MyWorkPreferences {
  terms_accepted: boolean
  terms_accepted_at: string | null
  accepted_gender?: string
  accepted_age_ranges?: string[]
  accepted_physical_conditions?: string[]
  available_shifts?: string[]
  [key: string]: unknown
}

export const workPreferencesService = {
  async me(): Promise<MyWorkPreferences | null> {
    try {
      const { data } = await api.get("/api/caregivers/me/work-preferences/")
      return data
    } catch (err: any) {
      if (err?.response?.status === 404) return null
      throw err
    }
  },

  async acceptTerms(existing: MyWorkPreferences | null) {
    // PUT on this endpoint is a full replace, not a partial patch —
    // so if a supervisor already filled in other fields for this
    // caregiver, they're sent back unchanged here alongside the new
    // terms_accepted flag; if nothing exists yet, safe defaults are
    // used so the required fields elsewhere in this form don't fail
    // validation for a request that's only trying to do one thing.
    const payload = {
      accepted_gender: "no_preference",
      accepted_age_ranges: [],
      accepted_physical_conditions: [],
      available_shifts: [],
      ...existing,
      terms_accepted: true,
    }
    const { data } = await api.put("/api/caregivers/me/work-preferences/", payload)
    return data as MyWorkPreferences
  },
}
