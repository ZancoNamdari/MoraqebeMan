// نوع‌های خدمتی که خانواده می‌تواند برای یک «خدمت‌گیرنده» درخواست کند.
// کلیدها دقیقاً با apps.caregivers.choices.ServiceType و زیرشاخه‌های آن یکی است.
export interface ServiceOption {
  key: string
  label: string
  description: string
  emoji: string
  subtypeLabel?: string
  subtypes?: [string, string][]
}

export const SERVICE_OPTIONS: ServiceOption[] = [
  {
    key: "salmandyar", label: "سالمندیار", emoji: "👵",
    description: "مراقبت و همراهی از سالمند",
  },
  {
    key: "madaryar", label: "مادریار", emoji: "👶",
    description: "نگهداری از نوزاد و کودک",
    subtypeLabel: "برای چه کسی؟",
    subtypes: [
      ["newborn", "نوزاد"],
      ["child", "کودک"],
      ["homework_helper", "کمک در درس و مشق"],
      ["housework_child", "کارهای خانه + کودک"],
    ],
  },
  {
    key: "nezafatchi", label: "امور منزل", emoji: "🏠",
    description: "نظافت، آشپزی و کارهای خانه",
    subtypeLabel: "چه نوع خدمتی؟",
    subtypes: [
      ["inside_home", "خدمات داخل خانه"],
      ["outside_home", "خدمات بیرون از خانه"],
      ["cooking", "آشپزی"],
    ],
  },
  {
    key: "parastar", label: "بهیار / پرستار", emoji: "🩺",
    description: "مراقبت پرستاری از بیمار",
    subtypeLabel: "چه سطحی؟",
    subtypes: [
      ["behyar", "بهیار"],
      ["specialized_nurse", "پرستار تخصصی"],
      ["nursing_specialist", "کارشناس پرستاری"],
    ],
  },
]

export function serviceLabel(type: string | null | undefined): string {
  return SERVICE_OPTIONS.find((s) => s.key === type)?.label ?? ""
}

export function subtypeLabel(type: string | null | undefined, sub: string | null | undefined): string {
  return SERVICE_OPTIONS.find((s) => s.key === type)?.subtypes?.find((x) => x[0] === sub)?.[1] ?? ""
}

/** عنوانِ مناسبِ «کسی که خدمت می‌گیرد»، بر اساس نوع خدمت (نقش‌محور). */
export function recipientNoun(type: string | null | undefined, sub?: string | null): string {
  if (type === "salmandyar") return "سالمند"
  if (type === "madaryar") return sub === "newborn" ? "نوزاد" : "کودک"
  if (type === "parastar") return "بیمار"
  return "خدمت‌گیرنده"
}

/** آیا سؤال‌های «شرایط جسمانی» (مخصوص سالمند/بیمار) برای این نوع خدمت معنا دارد؟ */
export function hasPhysicalCondition(type: string | null | undefined): boolean {
  return !type || type === "salmandyar" || type === "parastar"
}
