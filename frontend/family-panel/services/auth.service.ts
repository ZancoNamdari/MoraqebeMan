import { api } from "./api"
import type { User } from "@/types/user"

// «من کیستم» (/api/auth/me/) بین همه‌ی صفحه‌ها مشترک است. قبلاً هر صفحه در هر
// کلیک دوباره آن را صدا می‌زد و تا برگشتن جواب، صفحه‌ی خالی نشان می‌داد — یعنی
// قبل از شروع به گرفتن داده‌ی خودِ صفحه، یک رفت‌وبرگشت اضافه به سرور.
// حالا نتیجه چند دقیقه نگه داشته می‌شود و درخواست‌های هم‌زمان یکی می‌شوند.
const ME_TTL_MS = 5 * 60 * 1000
let meCache: { user: User; at: number } | null = null
let meInflight: Promise<User> | null = null

export const authService = {
  /** کاربر ذخیره‌شده (اگر هست) بدون هیچ درخواستی؛ برای رندر آنی صفحه‌ها. */
  peekMe(): { user: User; fresh: boolean } | null {
    if (!meCache) return null
    return { user: meCache.user, fresh: Date.now() - meCache.at < ME_TTL_MS }
  },

  async meCached(): Promise<User> {
    if (meCache && Date.now() - meCache.at < ME_TTL_MS) return meCache.user
    if (!meInflight) {
      meInflight = authService
        .me()
        .then((u: User) => {
          meCache = { user: u, at: Date.now() }
          return u
        })
        .finally(() => {
          meInflight = null
        })
    }
    return meInflight
  },

  clearMeCache() {
    meCache = null
    meInflight = null
  },

  async login(username: string, password: string) {
    const { data } = await api.post("/api/auth/login/", { username, password })
    authService.clearMeCache()
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
    authService.clearMeCache()
    window.localStorage.setItem("access_token", data.tokens.access)
    window.localStorage.setItem("refresh_token", data.tokens.refresh)
    return data.user
  },

  async me() {
    const { data } = await api.get("/api/auth/me/")
    return data
  },

  logout() {
    authService.clearMeCache()
    window.localStorage.removeItem("access_token")
    window.localStorage.removeItem("refresh_token")
  },

  isLoggedIn(): boolean {
    if (typeof window === "undefined") return false
    return Boolean(window.localStorage.getItem("access_token"))
  },
}
