import { api } from "./api"
import type { FamilyProfile } from "@/types/family"

export const familyService = {
  async me(): Promise<FamilyProfile> {
    const { data } = await api.get("/api/families/me/")
    return data
  },

  async update(input: { display_name: string; province?: number | null; city?: number | null; address?: string }) {
    const { data } = await api.post("/api/families/me/", input)
    return data as FamilyProfile
  },
}
