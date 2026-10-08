"use client"

import type { PublicTraitProfile } from "@/types/caregiver-public"

function levelLabel(p: number) {
  if (p >= 67) return "تمایل زیاد"
  if (p >= 34) return "متعادل"
  return "تمایل کمتر"
}

export function TraitView({ profiles }: { profiles: PublicTraitProfile[] }) {
  if (!profiles?.length) return null
  return (
    <div className="space-y-4">
      {profiles.map((p) => (
        <div key={p.id} className="rounded-lg border border-border p-3">
          <p className="mb-3 text-sm font-semibold text-foreground">{p.title}</p>
          <div className="space-y-2.5">
            {p.traits.map((t) => (
              <div key={t.key}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span>{t.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{levelLabel(t.percent)} · {t.percent}٪</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${t.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        این نتیجه سبک کار و برخورد مراقب را نشان می‌دهد، نه توان یا ضعف او؛ همه‌ی گزینه‌های پرسشنامه درست و حرفه‌ای بودند.
      </p>
    </div>
  )
}
