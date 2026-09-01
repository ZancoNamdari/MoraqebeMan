import { api } from "./api"

export interface MyIdentityProfile {
  full_name: string
  father_name?: string
  birth_certificate_number?: string
  birth_certificate_issue_place?: string
  birth_date?: string | null
  gender?: string
  marital_status?: string
  children_count?: string
  military_status?: string
  height_range?: string
  weight_range?: string
  ethnicities?: string[]
  has_chronic_disease?: boolean | null
  chronic_disease_types?: string[]
  takes_permanent_medication?: boolean | null
  medication_types?: string[]
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  landline_phone?: string
  province?: number | null
  city?: number | null
  district?: number | null
  postal_code?: string
  full_address?: string
}

export const identityService = {
  async me(): Promise<MyIdentityProfile | null> {
    try {
      const { data } = await api.get("/api/caregivers/me/identity/")
      return data
    } catch (err: any) {
      if (err?.response?.status === 404) return null
      throw err
    }
  },

  async save(payload: MyIdentityProfile) {
    const { data } = await api.put("/api/caregivers/me/identity/", payload)
    return data as MyIdentityProfile
  },
}
