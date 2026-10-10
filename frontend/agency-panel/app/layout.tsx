import type { Metadata } from "next"
import { Vazirmatn } from "next/font/google"
import "./globals.css"
import { PersianDigitsProvider } from "@/components/persian-digits-provider"

// Vazirmatn — the platform font, self-hosted via next/font/google (downloaded at
// build time and served from this app's own domain, not fetched at runtime).
const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vazirmatn",
  display: "swap",
})

// Title order deliberately consistent across every panel (panel name
// first, brand last) — every panel except landing-page follows this,
// since landing-page is the platform's own homepage rather than a
// sub-tool within it.
export const metadata: Metadata = {
  title: "پنل آژانس — مراقب من",
  description: "مدیریت خانواده‌ها و مراقبان زیرمجموعه آژانس شما",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="antialiased min-h-screen bg-background">
        <PersianDigitsProvider />
        {children}
      </body>
    </html>
  )
}
