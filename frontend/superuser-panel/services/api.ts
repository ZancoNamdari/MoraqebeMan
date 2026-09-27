import axios from "axios"

// NEXT_PUBLIC_API_URL points at the Django backend — set in .env.local.
// Falls back to localhost:8000, matching docker-compose's backend port.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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

// On a 401, the token is dead (expired/invalid) — clear it and bounce
// to login rather than leaving the user stuck on a broken page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("access_token")
      if (window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)
