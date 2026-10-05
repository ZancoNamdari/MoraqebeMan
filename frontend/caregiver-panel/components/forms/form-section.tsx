"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * قالب باکسی فرم‌ها: هر بخش یک باکس با عنوان است که با زدن دکمه‌ی عنوانش
 * باز/بسته می‌شود. محتوای باکس بسته با `hidden` پنهان می‌ماند (حذف نمی‌شود)
 * تا state فرم و اعتبارسنجی مرورگر دست‌نخورده بماند.
 */
export function FormSection({
  title, defaultOpen = false, children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start text-base font-semibold text-foreground"
      >
        <span>{title}</span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <div className={cn("space-y-4 border-t p-4", !open && "hidden")}>{children}</div>
    </section>
  )
}
