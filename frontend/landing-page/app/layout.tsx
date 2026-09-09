import type { Metadata } from "next"
import { IBM_Plex_Sans_Arabic } from "next/font/google"
import "./globals.css"

// Self-hosted via next/font/google — downloaded and served from this
// app's own domain at build time, not fetched from Google at runtime.
// Switched from Vazirmatn to IBM Plex Sans Arabic to match the final
// font chosen for agency-panel, for platform-wide visual consistency
// across every panel.
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vazirmatn",
  display: "swap",
})

export const metadata: Metadata = {
  title: "مراقب من — پلتفرم مراقبت خانوادگی از سالمندان",
  description: "خانواده و بیمار حساب‌های جداگانه دارند، به‌صورت امن به هم متصل می‌شوند، و مراقبان حرفه‌ای گزارش مراقبت ثبت می‌کنند — همه در یک جا.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={ibmPlexSansArabic.variable}>
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
