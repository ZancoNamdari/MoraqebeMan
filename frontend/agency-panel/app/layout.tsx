import type { Metadata } from "next"
import { Cairo } from "next/font/google"
import "./globals.css"

// Self-hosted via next/font/google — downloaded and served from this
// app's own domain at build time, not fetched from Google at runtime.
// Third font tried here: Vazirmatn (rejected on sight), then Noto
// Sans Arabic (too generic-feeling), now Cairo — explicitly asked for
// something stylistically close to Yekan Bakh's clean, geometric,
// monoline character but genuinely free. Cairo is tagged "Geometric
// Sans" by font catalogers, is on Google Fonts under an OFL license,
// and its own Google Fonts description confirms explicit Farsi
// glyph support, not just Arabic. IRANSans and Yekan Bakh themselves
// remain commercially licensed and unavailable through
// next/font/google or any font host reachable from this environment.
const cairo = Cairo({
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
    <html lang="fa" dir="rtl" className={cairo.variable}>
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
