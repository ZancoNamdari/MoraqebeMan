import { api } from "./api"
import type { User } from "@/types/user"

export const authService = {
  async login(username: string, password: string) {
    const { data } = await api.post("/api/auth/login/", { username, password })
    window.localStorage.setItem("access_token", data.tokens.access)
    window.localStorage.setItem("refresh_token", data.tokens.refresh)
    return data.user
  },

  async me() {
    const { data } = await api.get("/api/auth/me/")
    return data
  },

  logout() {
    window.localStorage.removeItem("access_token")
    window.localStorage.removeItem("refresh_token")
  },

  isLoggedIn(): boolean {
    if (typeof window === "undefined") return false
    return Boolean(window.localStorage.getItem("access_token"))
  },

  // The reset token is a real 32-character alphanumeric string sent
  // as plain SMS text (not a clickable link) — confirmed directly
  // against backend/apps/authentication/tasks.py rather than assumed,
  // since a link-based flow would need a completely different UI.
  async requestPasswordReset(phoneNumber: string) {
    await api.post("/api/auth/password-reset/", { phone_number: phoneNumber })
  },

  async confirmPasswordReset(phoneNumber: string, token: string, newPassword: string) {
    await api.post("/api/auth/password-reset/confirm/", {
      phone_number: phoneNumber,
      token,
      new_password: newPassword,
    })
  },

  // "خودم" tab of Settings — editing your own basic info and changing
  // your own password, regardless of which panel/role you are (both
  // backend endpoints are generic across every panel; see
  // apps.authentication.views.UpdateProfileView/ChangePasswordView).
  async updateOwnProfile(payload: { first_name?: string; last_name?: string; email?: string; phone_number?: string }) {
    const { data } = await api.patch("/api/auth/profile/", payload)
    return data as User
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await api.post("/api/auth/change-password/", {
      current_password: currentPassword,
      new_password: newPassword,
    })
    return data as { detail: string }
  },
}
