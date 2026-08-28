import type { Metadata } from "next"
import { Vazirmatn } from "next/font/google"
import "./globals.css"

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
})

export const metadata: Metadata = {
  title: "مراقب من — پنل ادمین",
  description: "بررسی و تأیید پروفایل مراقبان، مدیریت مسدودسازی",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
