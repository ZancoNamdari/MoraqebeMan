import type { Metadata } from "next"
import { Vazirmatn } from "next/font/google"
import "./globals.css"

// Self-hosted via next/font/google — same fix already applied to
// every other panel; this one was missed in that earlier pass.
// globals.css already listed "Vazirmatn" in its font-family fallback
// stack with no font ever actually loaded, so browsers were silently
// falling back to generic system fonts here specifically, even after
// every other panel was fixed.
const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
})

export const metadata: Metadata = {
  title: "مراقب من — پلتفرم مراقبت خانوادگی از سالمندان",
  description: "خانواده و بیمار حساب‌های جداگانه دارند، به‌صورت امن به هم متصل می‌شوند، و مراقبان حرفه‌ای گزارش مراقبت ثبت می‌کنند — همه در یک جا.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
