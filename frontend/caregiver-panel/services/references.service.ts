import { api } from "./api"

export interface Reference {
  id?: number
  full_name: string
  occupation: string
  relation_type: string
  acquaintance_duration: string
  phone_number: string
  callable_for_inquiry: boolean
}

export const referencesService = {
  async list(): Promise<Reference[]> {
    const { data } = await api.get("/api/caregivers/me/references/")
    return data
  },

  async saveAll(references: Reference[]): Promise<Reference[]> {
    // PUT replaces the entire set at once — there's no per-item
    // add/remove/edit on the backend, only "here is the full list
    // now," matching CaregiverReferenceListSerializer's own docs.
    const payload = references.map(({ id, ...rest }) => rest)
    const { data } = await api.put("/api/caregivers/me/references/", { references: payload })
    return data
  },
}
