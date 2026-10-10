// زبان و گویش خدمت‌گیرنده — دو سطحی: اول زبان، بعد گویش/منطقه.
// کلیدهای سطح اول با «زبان محلی» مراقبان (LOCAL_LANGUAGE) یکی است
// تا بعداً تطبیق ساده‌ای ممکن باشد. مقدار ذخیره‌شده: "kurdish" یا "kurdish:sorani"
// یا "other:متن آزاد".
export interface LanguageOption {
  key: string
  label: string
  dialects?: [string, string][]
  dialectQuestion?: string
}

export const LANGUAGES: LanguageOption[] = [
  {
    key: "persian", label: "فارسی", dialectQuestion: "کدام لهجه / شهر؟",
    dialects: [
      ["tehrani", "تهرانی (معیار)"], ["mashhadi", "مشهدی / خراسانی"], ["isfahani", "اصفهانی"],
      ["shirazi", "شیرازی"], ["yazdi", "یزدی"], ["kermani", "کرمانی"], ["dari", "دری (افغانستان)"],
    ],
  },
  {
    key: "azeri", label: "ترکی آذربایجانی", dialectQuestion: "از کدام منطقه؟",
    dialects: [
      ["tabrizi", "تبریز و آذربایجان شرقی"], ["urmia", "ارومیه و آذربایجان غربی"], ["ardabil", "اردبیل"],
      ["zanjan", "زنجان"], ["qazvin_hamedan", "قزوین و همدان"], ["tehran_qom", "تهران و قم (ترک‌زبان)"],
    ],
  },
  {
    key: "kurdish", label: "کردی", dialectQuestion: "کدام کردی؟ (کجا)",
    dialects: [
      ["sorani", "سورانی (سنندج، مهاباد، بانه، سقز)"],
      ["kurmanji", "کرمانجی (شمال خراسان، قوچان، بجنورد، ارومیه)"],
      ["kalhori", "کلهری (کرمانشاه، ایلام، اسلام‌آباد غرب)"],
      ["hawrami", "هورامی (پاوه، اورامانات)"],
      ["laki", "لکی (لرستان، نورآباد، کرمانشاه)"],
      ["feyli", "فیلی (ایلام، خانقین)"],
    ],
  },
  {
    key: "lori", label: "لری", dialectQuestion: "کدام لری؟ (کجا)",
    dialects: [
      ["bakhtiari", "بختیاری (چهارمحال، شمال خوزستان)"],
      ["khorramabadi", "لری خرم‌آباد و لرستان"],
      ["mamasani", "ممسنی و کهگیلویه و بویراحمد"],
      ["boyerahmadi", "بویراحمدی (یاسوج)"],
      ["dezfuli_shushtari", "دزفولی / شوشتری"],
    ],
  },
  {
    key: "gilaki", label: "گیلکی", dialectQuestion: "کدام منطقه‌ی گیلان؟",
    dialects: [
      ["rashti", "رشتی (بیه‌پس)"], ["lahijani", "لاهیجان و لنگرود (بیه‌پیش)"],
      ["talysh", "تالشی (تالش، آستارا)"], ["rudbari", "رودباری و الموت"],
    ],
  },
  {
    key: "mazandarani", label: "مازندرانی", dialectQuestion: "کدام شهر؟",
    dialects: [
      ["sari", "ساری و شرق مازندران"], ["amoli", "آمل و بابل"], ["tonekaboni", "تنکابنی / غرب مازندران"],
      ["gorgani", "گرگانی / گلستان"],
    ],
  },
  {
    key: "baluchi", label: "بلوچی", dialectQuestion: "کدام بلوچی؟",
    dialects: [["rakhshani", "راجی / سرحدی (سراوان، خاش)"], ["coastal", "ساحلی (چابهار، کنارک)"], ["makrani", "مکرانی (ایرانشهر، سرباز)"]],
  },
  {
    key: "arabic", label: "عربی", dialectQuestion: "کدام لهجه؟",
    dialects: [["khuzestani", "خوزستانی (اهواز، آبادان)"], ["bushehri", "ساحلی (بوشهر، هرمزگان)"], ["khorasani", "عربی خراسان"]],
  },
  { key: "turkmen", label: "ترکمنی" },
  { key: "other", label: "سایر" },
]

// مقدارهای قدیمی (کد دو حرفی) → کلید جدید
const LEGACY: Record<string, string> = {
  fa: "persian", az: "azeri", ku: "kurdish", lr: "lori", gl: "gilaki", mz: "mazandarani", ar: "arabic", bl: "baluchi",
}

export function parseLanguage(value: string | null | undefined): { lang: string; dialect: string; other: string } {
  const v = (value || "").trim()
  if (!v) return { lang: "", dialect: "", other: "" }
  const [head, ...rest] = v.split(":")
  const tail = rest.join(":")
  const lang = LEGACY[head] ?? head
  if (lang === "other") return { lang, dialect: "", other: tail }
  if (LANGUAGES.some((l) => l.key === lang)) return { lang, dialect: tail, other: "" }
  return { lang: "other", dialect: "", other: v } // متن آزادِ قدیمی
}

export function serializeLanguage(lang: string, dialect: string, other: string): string {
  if (!lang) return ""
  if (lang === "other") return other ? `other:${other}` : "other"
  return dialect ? `${lang}:${dialect}` : lang
}

export function languageLabel(value: string | null | undefined): string {
  const { lang, dialect, other } = parseLanguage(value)
  if (!lang) return ""
  if (lang === "other") return other || "سایر"
  const l = LANGUAGES.find((x) => x.key === lang)
  const d = l?.dialects?.find((x) => x[0] === dialect)?.[1]
  return d ? `${l!.label} — ${d}` : l?.label ?? ""
}
