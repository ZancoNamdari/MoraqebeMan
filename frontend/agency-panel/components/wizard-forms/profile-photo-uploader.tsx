"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"

// آدرس فایل ممکن است نسبی (/media/...) باشد؛ باید روی دامنه‌ی API باز شود، نه دامنه‌ی پنل.
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return ""
  if (/^https?:\/\//.test(path)) return path
  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${path}`
}

interface PhotoUpload {
  file: string | null
  status: "pending" | "approved" | "rejected"
  rejection_reason: string
}

const STATUS_LABEL = { pending: "در انتظار تأیید", approved: "تأیید شده", rejected: "رد شده" } as const
const STATUS_CLASS = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
} as const

// عکس را قبل از ارسال کوچک و فشرده می‌کند (حداکثر ۸۰۰ پیکسل، JPEG) تا آپلود سریع
// باشد و حجمش از سقف سرور (۵ مگابایت) رد نشود. اگر مرورگر نتواند، فایل اصلی می‌رود.
async function shrinkImage(file: File, maxSide = 800): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85))
    if (!blob) return file
    return new File([blob], "profile.jpg", { type: "image/jpeg" })
  } catch {
    return file
  }
}

// آپلود/تعویض عکس پروفایل مراقب. با «canApprove» دکمه‌ی تأیید هم نشان داده می‌شود
// (سمت سرور فقط مالک/سرپرست آژانس یا ادمین اجازه‌ی تأیید دارد).
export function ProfilePhotoUploader({ userId, canApprove = false, stacked = false }: { userId: number; canApprove?: boolean; stacked?: boolean }) {
  const [photo, setPhoto] = useState<PhotoUpload | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!userId) return
    api.get(`/api/caregivers/${userId}/profile-photo/`).then((r) => setPhoto(r.data)).catch(() => {})
  }, [userId])

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    e.target.value = ""
    if (!picked) return
    setBusy(true); setError("")
    setPreview(URL.createObjectURL(picked))
    try {
      const body = new FormData()
      body.append("file", await shrinkImage(picked))
      const { data } = await api.post(`/api/caregivers/${userId}/profile-photo/`, body, { headers: { "Content-Type": "multipart/form-data" } })
      setPhoto(data)
      setPreview(null)
    } catch (err: any) {
      setPreview(null)
      setError(err?.response?.data?.detail || "آپلود عکس با خطا مواجه شد.")
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove() {
    setBusy(true); setError("")
    try {
      const { data } = await api.post(`/api/caregivers/${userId}/documents/personal_photo/approve/`)
      setPhoto(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "تأیید عکس با خطا مواجه شد.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={stacked ? "flex w-44 flex-col items-center gap-3 text-center" : "flex items-center gap-4"}>
      <div className={`flex ${stacked ? "h-32 w-32" : "h-24 w-24"} shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-muted text-3xl`}>
        {preview || photo?.file ? <img src={preview ?? mediaUrl(photo?.file)} alt="عکس پروفایل" className="h-full w-full object-cover" /> : "👤"}
      </div>
      <div className={stacked ? "flex flex-col items-center space-y-2" : "space-y-2"}>
        {photo && (
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[photo.status]}`}>{STATUS_LABEL[photo.status]}</span>
        )}
        {photo?.status === "rejected" && photo.rejection_reason && (
          <p className="text-xs text-rose-700">دلیل رد: {photo.rejection_reason}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "در حال ارسال..." : photo ? "تغییر عکس" : "انتخاب عکس"}
          </Button>
          {canApprove && photo?.status === "pending" && (
            <Button type="button" size="sm" disabled={busy} onClick={handleApprove}>تأیید عکس</Button>
          )}
        </div>
        <p className="text-[11px] leading-5 text-muted-foreground">{stacked ? "فقط عکس تأییدشده به خانواده نمایش داده می‌شود." : "عکس واضح از چهره، با پس‌زمینه ساده. فقط عکس تأییدشده به خانواده نمایش داده می‌شود."}</p>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
