import { api } from "./api"

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
}
