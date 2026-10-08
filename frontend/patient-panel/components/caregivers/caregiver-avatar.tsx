"use client"

import { cn } from "@/lib/utils"

export function caregiverPhotoSrc(url: string | null) {
  if (!url) return null
  return /^https?:\/\//.test(url) ? url : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${url}`
}

export function CaregiverAvatar({ url, name, gender, className }: { url: string | null; name: string; gender?: string; className?: string }) {
  const src = caregiverPhotoSrc(url)
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-200 to-rose-300 text-2xl", className)}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : (gender === "male" ? "👨" : "👩")}
    </div>
  )
}
