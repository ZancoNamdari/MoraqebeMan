import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { VisitTracker } from "@/components/visit-tracker"

// Self-hosted from app/fonts (works where Google Fonts is blocked). El Messiri is
// only for the «مراقب من» wordmark (class "font-brand").
const vazirmatn = localFont({
  src: "./fonts/Vazirmatn-Variable.woff2",
  weight: "100 900",
  variable: "--font-vazirmatn",
  display: "swap",
})
const brandFont = localFont({
  src: "./fonts/ElMessiri-Bold.woff2",
  weight: "700",
  variable: "--font-brand",
  display: "swap",
})

export const metadata: Metadata = {
  title: "مراقب من",
  description: "خانواده و بیمار حساب‌های جداگانه دارند، به‌صورت امن به هم متصل می‌شوند، و مراقبان حرفه‌ای گزارش مراقبت ثبت می‌کنند — همه در یک جا.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${brandFont.variable}`}>
      <body className="antialiased min-h-screen bg-background">
        <VisitTracker />
        {children}
      </body>
    </html>
  )
}
