// Transcribed directly from backend/apps/caregivers/choices.py — keep
// these in sync with that file if it changes. Each is [value, label].

export type Choice = [string, string]

export const GENDER: Choice[] = [
  ["female", "زن"],
  ["male", "مرد"],
]

export const MARITAL_STATUS: Choice[] = [
  ["single", "مجرد"],
  ["married", "متأهل"],
  ["divorced", "مطلقه"],
  ["widowed", "همسر فوت شده"],
]

export const CHILDREN_COUNT: Choice[] = [
  ["none", "بدون فرزند"],
  ["one", "۱"],
  ["two", "۲"],
  ["three", "۳"],
  ["four_or_more", "۴ یا بیشتر"],
]

export const MILITARY_STATUS: Choice[] = [
  ["not_served", "مشمول (هنوز به خدمت نرفته)"],
  ["in_service", "در حال خدمت"],
  ["completed", "پایان خدمت"],
  ["permanent_exemption", "معافیت دائم"],
  ["temporary_exemption", "معافیت موقت"],
]

export const HEIGHT_RANGE: Choice[] = [
  ["under_150", "کمتر از ۱۵۰"],
  ["150_160", "۱۵۰–۱۶۰"],
  ["160_170", "۱۶۰–۱۷۰"],
  ["170_180", "۱۷۰–۱۸۰"],
  ["over_180", "بالاتر از ۱۸۰"],
]

export const WEIGHT_RANGE: Choice[] = [
  ["under_50", "کمتر از ۵۰"],
  ["50_60", "۵۰–۶۰"],
  ["60_70", "۶۰–۷۰"],
  ["70_80", "۷۰–۸۰"],
  ["80_90", "۸۰–۹۰"],
  ["over_90", "بالاتر از ۹۰"],
]

export const ETHNICITY: Choice[] = [
  ["fars", "فارس"],
  ["azeri_turk", "ترک آذری"],
  ["kurd", "کرد"],
  ["lor", "لر"],
  ["gilak", "گیلک"],
  ["mazandarani", "مازندرانی"],
  ["baloch", "بلوچ"],
  ["arab", "عرب"],
  ["turkmen", "ترکمن"],
  ["other", "سایر"],
]

export const CHRONIC_DISEASE_TYPE: Choice[] = [
  ["diabetes", "دیابت"],
  ["blood_pressure", "فشار خون"],
  ["heart_disease", "بیماری قلبی"],
  ["asthma", "آسم"],
  ["joint_disease", "بیماری‌های مفصلی"],
  ["spine_disease", "بیماری‌های ستون فقرات"],
  ["neurological_disease", "بیماری عصبی"],
  ["other", "سایر"],
]

export const MEDICATION_TYPE: Choice[] = [
  ["blood_pressure_medication", "داروی فشار خون"],
  ["diabetes_medication", "داروی دیابت"],
  ["heart_medication", "داروی قلب"],
  ["neurological_medication", "داروی اعصاب"],
  ["other", "سایر"],
]

export const EMERGENCY_CONTACT_RELATION: Choice[] = [
  ["spouse", "همسر"],
  ["father", "پدر"],
  ["mother", "مادر"],
  ["child", "فرزند"],
  ["sister", "خواهر"],
  ["brother", "برادر"],
  ["other", "سایر"],
]

export const COLLABORATION_TYPE: Choice[] = [
  ["daily", "مراقبت روزانه"],
  ["night", "مراقبت شبانه"],
  ["live_in", "مراقبت شبانه‌روزی (مقیم)"],
  ["hospital_companion", "همراه سالمند در بیمارستان"],
  ["home_companion", "همراه سالمند در منزل"],
  ["short_term", "مراقبت موقت (چند روزه)"],
  ["long_term", "مراقبت بلندمدت"],
]

export const WORK_STATUS: Choice[] = [
  ["full_time", "تمام‌وقت"],
  ["part_time", "پاره‌وقت"],
  ["both", "هر دو مورد"],
]

export const FAMILY_PRESENCE_PREFERENCE: Choice[] = [
  ["prefer_present", "ترجیح می‌دهم عضوی از خانواده در منزل حضور داشته باشد"],
  ["prefer_absent", "ترجیح می‌دهم خانواده در ساعات کاری خارج از منزل باشند"],
  ["no_preference", "برایم اولویت ندارد"],
]

export const ACCEPTED_GENDER: Choice[] = [
  ["female_only", "فقط خانم"],
  ["male_only", "فقط آقا"],
  ["no_preference", "تفاوتی ندارد"],
]

export const ACCEPTED_AGE_RANGE: Choice[] = [
  ["60_70", "۶۰ تا ۷۰ سال"],
  ["70_80", "۷۰ تا ۸۰ سال"],
  ["over_80", "بالای ۸۰ سال"],
  ["no_preference", "تفاوتی ندارد"],
]

export const OFFERED_SERVICE: Choice[] = [
  ["companionship", "هم‌صحبتی و همراهی سالمند"],
  ["walking", "پیاده‌روی و همراهی سالمند"],
  ["medication_reminder", "یادآوری زمان مصرف دارو"],
  ["shopping", "خرید مایحتاج منزل"],
  ["simple_meal_prep", "تهیه غذای ساده"],
  ["light_cleaning", "نظافت سبک محیط سالمند"],
  ["bathing_help", "کمک در استحمام"],
  ["housework_help", "کمک در امور منزل"],
  ["mobility_help", "کمک در جابجایی سالمند"],
  ["doctor_visits", "همراهی در مراجعه به پزشک"],
  ["family_housework", "انجام امور منزل خانواده سالمند"],
  ["hospital_care", "مراقبت در بیمارستان"],
  ["all", "همه موارد"],
]

export const ACCEPTED_PHYSICAL_CONDITION: Choice[] = [
  ["independent", "سالمند مستقل"],
  ["low_mobility", "سالمند کم‌توان (همراهی در راه رفتن)"],
  ["limited_mobility_bedridden", "سالمند دارای محدودیت حرکتی (روی تخت)"],
  ["bedridden_diaper", "سالمند بستری در منزل (پوشکی)"],
  ["alzheimers", "سالمند مبتلا به آلزایمر"],
  ["parkinsons", "سالمند مبتلا به پارکینسون"],
  ["hospital_companion_needed", "سالمند نیازمند همراهی بیمارستانی"],
  ["no_preference", "تفاوتی ندارد"],
]

export const LIFTING_CAPACITY: Choice[] = [
  ["up_to_30kg", "تا ۳۰ کیلوگرم"],
  ["up_to_50kg", "تا ۵۰ کیلوگرم"],
  ["over_50kg", "بیش از ۵۰ کیلوگرم"],
  ["cannot_lift", "امکان جابجایی فیزیکی ندارم"],
]

export const SERVICE_LOCATION: Choice[] = [
  ["patient_home", "منزل سالمند"],
  ["hospital", "بیمارستان"],
  ["no_preference", "تفاوتی ندارد"],
]

export const MAX_COMMUTE_TIME: Choice[] = [
  ["up_to_60", "تا ۶۰ دقیقه"],
  ["up_to_90", "تا ۹۰ دقیقه"],
  ["over_90", "بیش از ۹۰ دقیقه"],
]

export const WEEKDAY: Choice[] = [
  ["saturday", "شنبه"],
  ["sunday", "یکشنبه"],
  ["monday", "دوشنبه"],
  ["tuesday", "سه‌شنبه"],
  ["wednesday", "چهارشنبه"],
  ["thursday", "پنجشنبه"],
  ["friday", "جمعه"],
  ["all_days", "هرروز"],
]

export const SHIFT: Choice[] = [
  ["morning", "صبح"],
  ["afternoon", "عصر"],
  ["night", "شب"],
  ["24h", "شبانه‌روزی"],
]

export const COMMUTE_METHOD: Choice[] = [
  ["personal_car", "خودرو شخصی"],
  ["motorcycle", "موتورسیکلت"],
  ["public_transport", "حمل‌ونقل عمومی"],
  ["online_taxi", "تاکسی اینترنتی"],
]

export const SMOKING_STATUS: Choice[] = [
  ["none", "استعمال نمی‌کنم"],
  ["occasional", "گهگاه استعمال می‌کنم"],
  ["regular", "به‌صورت منظم استعمال می‌کنم"],
]

export const EXPERIENCE_RANGE: Choice[] = [
  ["none", "ندارم"],
  ["under_1_year", "کمتر از ۱ سال"],
  ["1_to_5_years", "بین ۱ تا ۵ سال"],
  ["over_5_years", "بیش از ۵ سال"],
]

export const PREVIOUS_WORKPLACE: Choice[] = [
  ["patient_home", "منزل سالمند"],
  ["hospital", "بیمارستان"],
  ["nursing_home", "خانه سالمندان"],
  ["rehab_center", "مرکز توانبخشی"],
  ["care_company", "شرکت خدمات مراقبتی"],
  ["family_member_care", "نگهداری از عضو خانواده"],
]

export const PATIENTS_CARED_FOR_COUNT: Choice[] = [
  ["one", "۱ نفر"],
  ["2_to_5", "۲ تا ۵ نفر"],
  ["6_to_10", "۶ تا ۱۰ نفر"],
  ["11_to_20", "۱۱ تا ۲۰ نفر"],
  ["over_20", "بیش از ۲۰ نفر"],
]

export const SPECIAL_CONDITION_EXPERIENCE: Choice[] = [
  ["alzheimers", "آلزایمر"],
  ["dementia", "زوال عقل"],
  ["parkinsons", "پارکینسون"],
  ["stroke", "سکته مغزی"],
  ["wheelchair", "ویلچرنشین"],
  ["bedridden", "سالمند بستری"],
  ["diabetes", "دیابت"],
  ["heart_disease", "بیماری قلبی"],
  ["severe_osteoporosis", "پوکی استخوان شدید"],
  ["cancer", "سرطان"],
  ["hospital_care", "مراقبت بیمارستانی"],
  ["none", "هیچ‌کدام"],
]

export const EDUCATION_LEVEL: Choice[] = [
  ["under_diploma", "زیر دیپلم"],
  ["diploma", "دیپلم"],
  ["associate", "کاردانی"],
  ["bachelor", "کارشناسی"],
  ["master", "کارشناسی ارشد"],
  ["phd", "دکتری"],
]

export const TRAINING_COURSE: Choice[] = [
  ["elderly_care", "مراقبت از سالمند"],
  ["first_aid", "کمک‌های اولیه"],
  ["cpr", "احیای قلبی ریوی (CPR)"],
  ["vital_signs", "کنترل علائم حیاتی"],
  ["alzheimers_dementia", "آلزایمر و زوال عقل"],
  ["parkinsons", "پارکینسون"],
  ["personal_hygiene", "بهداشت فردی سالمند"],
  ["nutrition", "تغذیه سالمندان"],
  ["safe_transfer", "جابجایی ایمن سالمند"],
  ["hospital_care", "مراقبت بیمارستانی"],
  ["none", "هیچ‌کدام"],
]

export const COMMUNICATION_SKILL: Choice[] = [
  ["effective_communication", "برقراری ارتباط مؤثر با سالمند"],
  ["conflict_management", "مدیریت تعارض"],
  ["patience", "صبوری و آرامش در شرایط دشوار"],
  ["entertainment_skills", "ایجاد سرگرمی برای سالمند"],
  ["emotional_support", "همراهی عاطفی سالمند"],
]

export const CAREGIVING_SKILL: Choice[] = [
  ["blood_pressure", "اندازه‌گیری فشار خون"],
  ["blood_sugar", "اندازه‌گیری قند خون"],
  ["medication_reminder", "یادآوری مصرف دارو"],
  ["walking_assistance", "کمک به راه رفتن"],
  ["bed_to_wheelchair_transfer", "انتقال از تخت به ویلچر"],
  ["walker_use", "استفاده از واکر"],
  ["wheelchair_use", "استفاده از ویلچر"],
  ["bathing_assistance", "کمک در استحمام"],
  ["dressing_assistance", "کمک در لباس پوشیدن"],
  ["feeding_assistance", "کمک در تغذیه"],
]

export const PHYSICAL_ABILITY: Choice[] = [
  ["weak", "ضعیف"],
  ["moderate", "متوسط"],
  ["good", "خوب"],
  ["very_good", "بسیار خوب"],
]

export const MOBILITY_ASSISTANCE_ABILITY: Choice[] = [
  ["unlimited", "بدون محدودیت"],
  ["wheelchair_assist", "جابجایی با کمک ویلچر"],
  ["walker_assist", "جابجایی با واکر"],
  ["bed_transfer_assist", "کمک در انتقال از تخت"],
  ["needs_second_person", "نیاز به کمک نفر دوم"],
]

export const HOUSEHOLD_SKILL: Choice[] = [
  ["iranian_cooking", "آشپزی ایرانی"],
  ["elderly_diet", "رژیم غذایی سالمندان"],
  ["light_cleaning", "نظافت سبک منزل"],
  ["shopping", "خرید مایحتاج"],
  ["medication_management", "مدیریت داروها"],
]

export const FOREIGN_LANGUAGE: Choice[] = [
  ["english", "انگلیسی"],
  ["arabic", "عربی"],
  ["turkish", "ترکی استانبولی"],
  ["other", "سایر"],
]

export const LOCAL_LANGUAGE: Choice[] = [
  ["azeri", "ترکی آذری"],
  ["kurdish", "کردی"],
  ["lori", "لری"],
  ["gilaki", "گیلکی"],
  ["mazandarani", "مازندرانی"],
  ["baluchi", "بلوچی"],
  ["arabic", "عربی"],
  ["turkmen", "ترکمنی"],
  ["yazdi", "یزدی"],
  ["shirazi", "شیرازی"],
  ["isfahani", "اصفهانی"],
  ["other", "سایر"],
]

export const REFERENCE_RELATION_TYPE: Choice[] = [
  ["family", "خانواده"],
  ["friends", "دوستان"],
  ["former_colleague", "همکار سابق"],
  ["trusted_acquaintance", "آشنای مورد اعتماد"],
]

export const ACQUAINTANCE_DURATION: Choice[] = [
  ["under_1_year", "کمتر از ۱ سال"],
  ["1_to_5_years", "بین ۱ تا ۵ سال"],
  ["over_5_years", "بیش از ۵ سال (مدت زمان زیادی)"],
]

// Looks up the Persian label for a stored choice value (or values, for
// multi-select JSON fields) — the review screen shows "زن" not
// "female", "بله" not "true".
export function labelForValue(choices: Choice[], value: string | null | undefined): string {
  if (!value) return "—"
  return choices.find(([v]) => v === value)?.[1] || value
}

export function labelsForValues(choices: Choice[], values: string[] | null | undefined): string {
  if (!values || values.length === 0) return "—"
  return values.map((v) => labelForValue(choices, v)).join("، ")
}

export function yesNoLabel(value: boolean | null | undefined): string {
  if (value === true) return "بله"
  if (value === false) return "خیر"
  return "—"
}

/** Gender-appropriate avatar — matches the identical helper already
 * used in family-panel, patient-panel, and caregiver-panel. */
export function patientAvatar(gender: string | null | undefined): string {
  if (gender === "male") return "👴"
  if (gender === "female") return "👵"
  return "🧓"
}
