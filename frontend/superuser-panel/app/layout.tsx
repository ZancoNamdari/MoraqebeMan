import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "مراقب من — پنل سوپریوزر",
  description: "مدیریت سراسری کاربران و نقش‌ها",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
