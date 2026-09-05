import type { Metadata } from "next"
import { Vazirmatn } from "next/font/google"
import "./globals.css"

// Self-hosted via next/font/google — matches the platform design
// system's own font requirement, found missing here (and in every
// other panel) during a visual-polish pass. globals.css already
// listed "Vazirmatn" in its fallback stack with no font ever loaded,
// so browsers silently skipped it for a generic system font.
const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
})

export const metadata: Metadata = {
  title: "مراقب من — پنل سوپریوزر",
  description: "مدیریت سراسری کاربران و نقش‌ها",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
