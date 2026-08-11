import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "مراقب من — پنل من",
  description: "پروفایل، پرسشنامه سازگاری، و مدیریت دسترسی خانواده شما",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
