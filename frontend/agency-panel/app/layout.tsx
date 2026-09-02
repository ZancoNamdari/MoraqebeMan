import type { Metadata } from "next"
import { Vazirmatn } from "next/font/google"
import "./globals.css"

// Self-hosted via next/font/google — downloaded and served from this
// app's own domain at build time, not fetched from Google at runtime.
// Matches the platform's own design-system requirement for this
// font; found missing here (and in every other panel) during a
// visual-polish pass — globals.css already listed "Vazirmatn" in its
// font-family fallback stack, but with no actual font file ever
// loaded, browsers silently skipped that name and fell back to
// whatever generic system font each OS happened to have, which is
// exactly the inconsistent, unpolished look this fixes.
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
