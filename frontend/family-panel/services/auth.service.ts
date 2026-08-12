import { api } from "./api"

export const authService = {
  async login(username: string, password: string) {
    const { data } = await api.post("/api/auth/login/", { username, password })
    window.localStorage.setItem("access_token", data.tokens.access)
    window.localStorage.setItem("refresh_token", data.tokens.refresh)
    return data.user
  },

  /** Passwordless login, step 1 — no username, no password, just the
   * phone number. Always resolves; the backend deliberately doesn't
   * reveal whether the number is actually registered. */
  async requestOtpLogin(phoneNumber: string) {
    const { data } = await api.post("/api/auth/otp-login/request/", { phone_number: phoneNumber })
    return data as { detail: string }
  },

  /** Passwordless login, step 2 — the SMS code. This is the actual
   * login; on success it stores tokens the same way login() does. */
  async verifyOtpLogin(phoneNumber: string, code: string) {
    const { data } = await api.post("/api/auth/otp-login/verify/", { phone_number: phoneNumber, code })
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
}
