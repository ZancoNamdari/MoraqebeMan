"use client"

import { cn } from "@/lib/utils"

export function caregiverPhotoSrc(url: string | null) {
  if (!url) return null
  return /^https?:\/\//.test(url) ? url : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${url}`
}

export function CaregiverAvatar({ url, name, className }: { url: string | null; name: string; gender?: string; className?: string }) {
  const src = caregiverPhotoSrc(url)
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e9ecef]", className)}>
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 24 24" className="h-3/5 w-3/5 text-[#adb5bd]" fill="currentColor" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
        </svg>
      )}
    </div>
  )
}
