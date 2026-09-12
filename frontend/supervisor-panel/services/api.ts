import axios from "axios"

// NEXT_PUBLIC_API_URL points at the Django backend — set in .env.local.
// Falls back to localhost:8000, matching docker-compose's backend port.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Must match next.config.ts's basePath exactly — used below because
// window.location operates on the real browser URL, which Next.js's
// own basePath handling does NOT auto-prefix (that only applies to
// next/link and next/navigation calls). Without this, comparing
// against a bare "/login" would never match once this app is mounted
// under a path prefix, and redirecting to a bare "/login" would send
// the browser to a URL that doesn't exist under this routing setup.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ""

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
})

// Attach the supervisor's JWT to every request. Token lives in
// localStorage — acceptable for a temporary 2-day internal tool used
// by one supervisor account, not a public-facing product surface.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Real bug fix: previously, ANY 401 (including a simply-expired
// access token, which happens routinely mid-session on a long form
// like the caregiver questionnaire) immediately wiped the token and
// forced a full re-login — even though a still-valid refresh_token
// was sitting right there in localStorage the whole time. This is
// what was actually causing "it crashes and kicks me out" during
// long sessions on the server.
//
// Fix: on a 401, try exchanging the refresh_token for a new access
// token first, and only fall back to a forced logout if that refresh
// itself fails (meaning the refresh token is ALSO dead — a genuine
// "you must log in again" situation, not a routine expiry).
//
// isRefreshing + failedQueue below exist specifically to handle the
// realistic case where several requests are in flight at once when
// the access token expires (e.g. a page loading multiple resources
// together) — without this, each one would independently kick off
// its own refresh call, wasting requests and risking race conditions
// where an early refresh invalidates a later one still in progress.
let isRefreshing = false
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (token) p.resolve(token)
    else p.reject(error)
  })
  failedQueue = []
}

function redirectToLogin() {
  window.localStorage.removeItem("access_token")
  window.localStorage.removeItem("refresh_token")
  if (window.location.pathname !== `${BASE_PATH}/login`) {
    window.location.href = `${BASE_PATH}/login`
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (typeof window === "undefined" || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = window.localStorage.getItem("refresh_token")
    if (!refreshToken) {
      redirectToLogin()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Another request already triggered a refresh — wait for it
      // to finish instead of starting a second, redundant one.
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh/`, { refresh: refreshToken })
      window.localStorage.setItem("access_token", data.access)
      processQueue(null, data.access)
      originalRequest.headers.Authorization = `Bearer ${data.access}`
      return api(originalRequest)
    } catch (refreshError) {
      // The refresh token itself is dead — this IS a genuine
      // "you must log in again" case, not a routine expiry.
      processQueue(refreshError, null)
      redirectToLogin()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
