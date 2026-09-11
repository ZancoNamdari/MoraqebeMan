import type { Metadata } from "next"
import { IBM_Plex_Sans_Arabic } from "next/font/google"
import "./globals.css"
import { VisitTracker } from "@/components/visit-tracker"

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vazirmatn",
  display: "swap",
})

export const metadata: Metadata = {
  title: "مراقب من",
  description: "خانواده و بیمار حساب‌های جداگانه دارند، به‌صورت امن به هم متصل می‌شوند، و مراقبان حرفه‌ای گزارش مراقبت ثبت می‌کنند — همه در یک جا.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={ibmPlexSansArabic.variable}>
      <body className="antialiased min-h-screen bg-background">
        <VisitTracker />
        {children}
      </body>
    </html>
  )
}
