import { GitMerge } from "lucide-react"

export default function MatchingPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <GitMerge className="mb-4 h-12 w-12 text-slate-300" />
      <h1 className="text-lg font-bold text-slate-900">فرآیند تطبیق</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        این بخش به‌زودی تکمیل می‌شود — نمای کاریزی (Kanban) از مراحل خدمت‌گیرندگان.
      </p>
    </div>
  )
}
