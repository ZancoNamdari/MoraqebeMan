import type { Metadata } from "next"
import { IBM_Plex_Sans_Arabic } from "next/font/google"
import "./globals.css"

// Self-hosted via next/font/google — downloaded and served from this
// app's own domain at build time, not fetched from Google at runtime.
// Fourth font tried here: Vazirmatn was actually chosen after a
// side-by-side comparison of four real candidates, deployed, then
// rejected again after being seen in the full app rather than a small
// comparison card — a genuinely different context that can change how
// a font reads. IBM Plex Sans Arabic won a second, four-way visual
// comparison against the other candidates from round one.
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vazirmatn",
  display: "swap",
})

export const metadata: Metadata = {
  title: "مراقب من — پنل آژانس",
  description: "مدیریت خانواده‌ها و مراقبان زیرمجموعه آژانس شما",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={ibmPlexSansArabic.variable}>
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
