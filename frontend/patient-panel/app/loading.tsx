import { Skeleton } from "@/components/ui/skeleton"

// Next نمایش این فایل را بلافاصله بعد از کلیک روی سایدبار نشان می‌دهد
// (قبل از آنکه کد و داده‌ی صفحه‌ی مقصد برسد)، پس کلیک «فوری» حس می‌شود.
export default function PanelLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}
