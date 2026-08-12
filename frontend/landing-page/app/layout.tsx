import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "مراقب من — پلتفرم مراقبت خانوادگی از سالمندان",
  description: "خانواده و بیمار حساب‌های جداگانه دارند، به‌صورت امن به هم متصل می‌شوند، و مراقبان حرفه‌ای گزارش مراقبت ثبت می‌کنند — همه در یک جا.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="antialiased min-h-screen bg-background">{children}</body>
    </html>
  )
}
