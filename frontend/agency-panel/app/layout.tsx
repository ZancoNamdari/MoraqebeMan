import type { Metadata } from "next"
import { Vazirmatn } from "next/font/google"
import "./globals.css"

// Self-hosted via next/font/google — downloaded and served from this
// app's own domain at build time, not fetched from Google at runtime.
// Landed back here after actually trying Noto Sans Arabic and Cairo
// too, then showing all four real candidates (plus IBM Plex Sans
// Arabic, Tajawal, Rubik) rendered side by side with real Persian
// sample text — Vazirmatn won on sight. Also genuinely the most
// widely-used Persian web font in practice (19M+ users, used by
// Telegram), not just a subjective pick.
const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
})

export const metadata: Metadata = {
  title: "مراقب من — پنل آژانس",
  description: "مدیریت خانواده‌ها و مراقبان زیرمجموعه آژانس شما",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
