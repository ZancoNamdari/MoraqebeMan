import { api } from "./api"
import type { ManagedUser, UserRole } from "@/types/user_management"

export const userManagementService = {
  async list(params: { search?: string; role?: UserRole | "" } = {}) {
    const { data } = await api.get("/api/auth/users/", {
      params: {
        search: params.search || undefined,
        role: params.role || undefined,
      },
    })
    return data as ManagedUser[]
  },

  async changeRole(userId: number, role: UserRole) {
    const { data } = await api.patch(`/api/auth/users/${userId}/role/`, { role })
    return data as ManagedUser
  },
}
