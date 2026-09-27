"use client"

/**
 * Per-user appearance preferences — accent color, font size, dark mode,
 * and sidebar icon order. Deliberately client-side/localStorage only,
 * per the confirmed requirement ("har kas wase khodesh customize kone
 * app ro" — every person customizes the app for themselves): this is a
 * personal browser preference, not an agency-wide policy, so it never
 * touches the backend and never needs syncing across devices.
 *
 * Every CSS variable touched here already exists in globals.css's
 * :root block — this only overrides their VALUES at runtime, the same
 * variables every component already renders with.
 */

export type AccentKey = "blue" | "pink" | "green" | "purple" | "slate"

export const ACCENT_PRESETS: { key: AccentKey; label: string; primary: string; primaryForeground: string; primaryStrong: string }[] = [
  { key: "blue", label: "آبی (پیش‌فرض)", primary: "#2563EB", primaryForeground: "#ffffff", primaryStrong: "#1E40AF" },
  { key: "pink", label: "صورتی گرم", primary: "#FFC5C5", primaryForeground: "#7A2E2E", primaryStrong: "#E88A8A" },
  { key: "green", label: "سبز", primary: "#059669", primaryForeground: "#ffffff", primaryStrong: "#047857" },
  { key: "purple", label: "بنفش", primary: "#7C3AED", primaryForeground: "#ffffff", primaryStrong: "#5B21B6" },
  { key: "slate", label: "خاکستری", primary: "#334155", primaryForeground: "#ffffff", primaryStrong: "#1E293B" },
]

export type FontScaleKey = "sm" | "md" | "lg"

export const FONT_SCALE_PRESETS: { key: FontScaleKey; label: string; percent: number }[] = [
  { key: "sm", label: "کوچک", percent: 93.75 },
  { key: "md", label: "معمولی (پیش‌فرض)", percent: 100 },
  { key: "lg", label: "بزرگ", percent: 112.5 },
]

export interface ThemePrefs {
  accent: AccentKey
  fontScale: FontScaleKey
  darkMode: boolean
  sidebarOrder: string[] // NAV_ITEMS hrefs, in the order the user wants them
}

const STORAGE_KEY = "moraqebeman.agency-panel.theme-prefs"

export const DEFAULT_THEME_PREFS: ThemePrefs = {
  accent: "blue",
  fontScale: "md",
  darkMode: false,
  sidebarOrder: [],
}

export function getSavedThemePrefs(): ThemePrefs {
  if (typeof window === "undefined") return DEFAULT_THEME_PREFS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_THEME_PREFS
    return { ...DEFAULT_THEME_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_THEME_PREFS
  }
}

export function saveThemePrefs(prefs: ThemePrefs) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Private-window/storage-blocked — the preference just won't
    // persist across reloads; the app still works fine without it.
  }
}

export function applyThemePrefs(prefs: ThemePrefs) {
  if (typeof document === "undefined") return
  const root = document.documentElement

  const accent = ACCENT_PRESETS.find((a) => a.key === prefs.accent) ?? ACCENT_PRESETS[0]
  root.style.setProperty("--primary", accent.primary)
  root.style.setProperty("--primary-foreground", accent.primaryForeground)
  root.style.setProperty("--ring", accent.primary)
  root.style.setProperty("--brand-pink", accent.primary)
  root.style.setProperty("--brand-pink-strong", accent.primaryStrong)

  const scale = FONT_SCALE_PRESETS.find((f) => f.key === prefs.fontScale) ?? FONT_SCALE_PRESETS[1]
  root.style.fontSize = `${scale.percent}%`

  root.classList.toggle("dark", prefs.darkMode)
}
