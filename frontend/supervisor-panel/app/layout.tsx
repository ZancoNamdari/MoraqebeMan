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

export const metadata: Metadata = {
  title: "پنل ناظر — مراقب من",
  description: "ابزار موقت ورود اطلاعات مراقبان",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${brandFont.variable}`}>
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
