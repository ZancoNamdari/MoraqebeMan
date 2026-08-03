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
}
