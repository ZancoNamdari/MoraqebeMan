import { BarChart3 } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <BarChart3 className="mb-4 h-12 w-12 text-slate-300" />
      <h1 className="text-lg font-bold text-slate-900">تحلیل</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        این بخش به‌زودی تکمیل می‌شود — گزارش‌ها و آمار عملکرد آژانس.
      </p>
    </div>
  )
}
