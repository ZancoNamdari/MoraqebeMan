import type { Metadata } from "next"
import { Vazirmatn } from "next/font/google"
import "./globals.css"

// Vazirmatn — the platform font, self-hosted via next/font/google (downloaded at
// build time and served from this app's own domain, not fetched at runtime).
const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vazirmatn",
  display: "swap",
})

export const metadata: Metadata = {
  title: "پنل ناظر — مراقب من",
  description: "ابزار موقت ورود اطلاعات مراقبان",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
