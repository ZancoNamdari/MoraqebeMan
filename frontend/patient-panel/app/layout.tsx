import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"

// Fonts are self-hosted from app/fonts (no download from Google at build or
// dev time, so they also work where Google Fonts is blocked).
// Vazirmatn is the platform font; Rubik is used only for the
// «مراقب من» wordmark (class "font-brand").
const vazirmatn = localFont({
  src: "./fonts/Vazirmatn-Variable.woff2",
  weight: "100 900",
  variable: "--font-vazirmatn",
  display: "swap",
})
const brandFont = localFont({
  src: "./fonts/Rubik-Bold.woff2",
  weight: "700",
  variable: "--font-brand",
  display: "swap",
})

// Title order deliberately consistent across every panel (panel name
// first, brand last) — every panel except landing-page follows this,
// since landing-page is the platform's own homepage rather than a
// sub-tool within it.
export const metadata: Metadata = {
  title: "پنل من — مراقب من",
  description: "پروفایل، پرسشنامه سازگاری، و مدیریت دسترسی خانواده شما",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${brandFont.variable}`}>
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
