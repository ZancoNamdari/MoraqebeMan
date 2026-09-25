import { Activity } from "lucide-react"

export default function CaregiverActivityPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <Activity className="mb-4 h-12 w-12 text-slate-300" />
      <h1 className="text-lg font-bold text-slate-900">فعالیت</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        این بخش به‌زودی تکمیل می‌شود.
      </p>
    </div>
  )
}
