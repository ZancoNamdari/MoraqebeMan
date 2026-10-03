// Transcribed directly from backend/apps/caregivers/choices.py — keep
// these in sync with that file if it changes. Each is [value, label].

export type Choice = [string, string]

// Service type/subtype — the new required step right after
// name/family/phone, before Form 1. A caregiver can hold several
// SERVICE_TYPE values at once (checkbox, not radio) — see
// CaregiverProfile.service_types' backend docstring.
export const SERVICE_TYPE: Choice[] = [
  ["salmandyar", "سالمندیار"],
  ["koodakyar", "کودک‌یار"],
  ["nezafatchi", "نظافت‌چی"],
  ["madaryar", "مادریار"],
  ["parastar", "پرستار"],
  ["behyar", "بهیار"],
]

export const KOODAKYAR_SUBTYPE: Choice[] = [
  ["homework_tutor", "پرستار درس و مشق"],
  ["live_in_housework_childcare", "پرستار شبانه‌روزی کارهای خانه و بچه"],
]

export const NEZAFATCHI_SUBTYPE: Choice[] = [
  ["outside_home", "خدمات بیرون از خانه"],
  ["inside_home", "خدمات داخل خانه"],
  ["cooking", "آشپزی"],
]

export const MADARYAR_SUBTYPE: Choice[] = [
  ["newborn", "نوزاد"],
  ["pregnancy", "دوران بارداری"],
  ["labor", "در شرف زایمان"],
]

export const PARASTAR_SUBTYPE: Choice[] = [
  ["nursing_specialist", "کارشناس پرستاری"],
  ["specialized_nurse", "پرستار تخصصی"],
]

export const PARASTAR_SPECIALTY: Choice[] = [
  ["icu", "ICU کار"],
  ["wound_care", "زخم بستر کار"],
  ["pediatric", "کودکان کار"],
  ["other", "سایر"],
]

export const BEHYAR_SUBTYPE: Choice[] = [
  ["aide_helper", "کمک بهیار"],
  ["nurse_helper", "کمک پرستار"],
  ["behyar", "بهیار"],
]

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
  ["lower_back_disc", "دیسک کمر"],
  ["psychological_issues", "مشکلات روحی و روانی"],
  ["other", "سایر"],
]

export const CLEANING_WILLINGNESS: Choice[] = [
  ["none", "نظافت را انجام نمی‌دهد"],
  ["light", "نظافت سبک انجام می‌دهد"],
  ["heavy", "نظافت سنگین انجام می‌دهد"],
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

// Generic on purpose — this is the one Form 2 field every service
// type shares (it drives daily_work_hours/max_commute_time's own
// conditional display below), so its wording must never lean on
// سالمند-only language the way it used to ("همراه سالمند در
// بیمارستان/منزل") — a کودک‌یار or نظافت‌چی answers this exact same
// list with their own job in mind.
export const COLLABORATION_TYPE: Choice[] = [
  ["daily", "کار روزانه (رفت‌وآمد)"],
  ["night", "کار شبانه"],
  ["live_in", "کار شبانه‌روزی (مقیم)"],
  ["hospital_companion", "همراهی در بیمارستان"],
  ["home_companion", "همراهی در منزل کارفرما"],
  ["short_term", "همکاری موقت (چند روزه)"],
  ["long_term", "همکاری بلندمدت"],
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
  ["rehab_center", "مرکز توانبخشی"],
  ["family_member_care", "نگهداری از عضو خانواده"],
  ["cleaning_services", "خدمات نظافت"],
  ["other", "سایر"],
]

export const PATIENTS_CARED_FOR_COUNT: Choice[] = [
  ["one", "۱ نفر"],
  ["2_to_5", "۲ تا ۵ نفر"],
  ["6_to_10", "۶ تا ۱۰ نفر"],
  ["11_to_20", "۱۱ تا ۲۰ نفر"],
  ["over_20", "بیش از ۲۰ نفر"],
]

export const NIGHT_STAY_UNTIL: Choice[] = [
  ["up_to_10pm", "تا ۱۰ شب"],
  ["up_to_midnight", "تا ۱۲ شب"],
  ["up_to_2am", "تا ۲ بامداد"],
  ["until_morning", "تا صبح"],
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
  ["diaper_dependent", "پوشکی"],
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

/** The patient's own 12-question compatibility questionnaire — same
 * field/axis structure as family-panel and patient-panel already
 * use, needed here so a supervisor can see the patient's actual
 * answers (via the new supervisor-facing endpoint) next to a
 * caregiver's flexibility breakdown, for the matching comparison.
 *
 * meal_time_strictness, medication_timing_priority, and
 * willingness_to_express_opinion were resolved 2026-08-23 from a
 * generic INTENSITY_SCALE placeholder to their real, question-specific
 * option sets — see docs/MATCHING.md. */
export const PATIENT_QUESTIONNAIRE_LABELS: Record<string, { label: string; axis: string; choices: Choice[] }> = {
  religious_beliefs_priority: { label: "اهمیت باورهای دینی", axis: "محور عقیدتی-مناسکی", choices: [["strongly_agree", "کاملاً موافقم"], ["somewhat_agree", "تاحدی موافق"], ["somewhat_disagree", "تاحدی مخالف"], ["strongly_disagree", "کاملاً مخالف"]] },
  new_treatment_openness: { label: "باز بودن به درمان جدید", axis: "محور عقیدتی-مناسکی", choices: [["very_high", "خیلی زیاد"], ["moderate", "نسبتاً"], ["low", "کم"], ["none", "اصلاً"]] },
  caregiver_as_family_member: { label: "مراقب به عنوان عضو خانواده", axis: "محور جمع‌گرایی", choices: [["yes", "بله"], ["no", "خیر"], ["partially", "تاحدی"]] },
  respectful_disagreement_acceptance: { label: "پذیرش نظرات مخالف با احترام", axis: "محور جمع‌گرایی", choices: [["fully_accept", "کاملاً می‌پذیرم"], ["mostly_accept", "نسبتاً می‌پذیرم"], ["reluctantly_accept", "به سختی می‌پذیرم"], ["reject", "قطعاً رد می‌کنم"]] },
  privacy_comfort_with_caregiver: { label: "راحتی در حضور مراقب", axis: "محور حریم خصوصی", choices: [["yes", "بله"], ["no", "خیر"], ["partially", "تاحدی"]] },
  noise_smell_sensitivity: { label: "حساسیت به صدا و بو", axis: "محور سبک زندگی", choices: [["very_high", "خیلی زیاد"], ["moderate", "نسبتاً"], ["low", "کم"], ["none", "اصلاً"]] },
  meal_time_strictness: { label: "سختی در رعایت زمان وعده غذایی", axis: "محور سبک زندگی", choices: [["very_strict", "بسیار مهم است و باید دقیقاً رعایت شود"], ["moderately_strict", "نسبتاً مهم است، کمی تأخیر قابل قبول است"], ["flexible", "چندان مهم نیست، انعطاف‌پذیر است"], ["not_important", "اهمیتی ندارد"]] },
  special_diet_preference: { label: "ترجیح داشتن رژیم خاص", axis: "محور سبک زندگی", choices: [["yes", "بله"], ["no", "خیر"], ["partially", "تاحدی"]] },
  medication_timing_priority: { label: "اهمیت زمان‌بندی داروها", axis: "محور جهت‌گیری زمانی", choices: [["very_strict", "بسیار مهم است و باید دقیقاً رعایت شود"], ["moderately_strict", "نسبتاً مهم است، کمی تأخیر قابل قبول است"], ["flexible", "چندان مهم نیست، انعطاف‌پذیر است"], ["not_important", "اهمیتی ندارد"]] },
  accent_customs_annoyance: { label: "آزردگی از لهجه یا رسوم متفاوت مراقب", axis: "محور تفاوت فرهنگی/نسلی", choices: [["not_at_all", "اصلاً"], ["slightly", "کمی"], ["a_lot", "زیاد"], ["very_much", "خیلی زیاد"]] },
  cultural_respect_expectation: { label: "انتظار احترام فرهنگی", axis: "محور تفاوت فرهنگی/نسلی", choices: [["yes", "بله"], ["no", "خیر"], ["partially", "تاحدی"]] },
  willingness_to_express_opinion: { label: "آمادگی برای بیان نظر", axis: "محور انعطاف‌پذیری کلی", choices: [["very_willing", "همیشه نظر خود را بیان می‌کند"], ["somewhat_willing", "بیشتر مواقع نظر خود را می‌گوید"], ["rarely_willing", "به‌ندرت نظر خود را بیان می‌کند"], ["not_willing", "تمایلی به بیان نظر ندارد"]] },
}

/** Which caregiver questionnaire section corresponds to which patient
 * axis — a best-effort content mapping (matching section titles/
 * themes), not a numeric formula. "محور جهت‌گیری زمانی" and "محور
 * انعطاف‌پذیری کلی" are deliberately left unmapped: no caregiver
 * section corresponds to them cleanly enough to show side by side
 * without implying a false precision. */
export const PATIENT_AXIS_TO_CAREGIVER_SECTION: Record<string, string> = {
  "محور عقیدتی-مناسکی": "عقیدتی و مناسکی",
  "محور جمع‌گرایی": "ارزش‌های بنیادین و مرزهای حرفه‌ای",
  "محور حریم خصوصی": "ارزش‌های بنیادین و مرزهای حرفه‌ای",
  "محور سبک زندگی": "سبک زندگی و محیط کاری",
  "محور تفاوت فرهنگی/نسلی": "انعطاف‌پذیری فرهنگی",
}

// ============================================================
// Per-service-type extra questions for Form 2 (work preferences),
// Form 3 (experience/skills) and the compatibility questionnaire.
// سالمندیار has no entry here — its questions are the common fields
// already built into those forms. For every OTHER selected service
// type, the wizard renders one extra section per form built from
// this schema; a caregiver with several types gets several sections
// stacked, one per type (not merged/deduplicated), per the confirmed
// requirement. Answers are stored server-side as a flat
// {field: value} dict per type, nested under a service_specific_answers
// JSON column — not a real column per field — so this schema is the
// only place these questions are defined; keep it in sync with the
// matching comment in backend/apps/caregivers/choices.py (which only
// defines the fixed choice lists, not the schema itself).
// ============================================================

export type ServiceFieldType = "choice" | "multi" | "bool" | "text" | "score"

export interface ServiceSpecificField {
  key: string
  label: string
  type: ServiceFieldType
  choices?: Choice[]
  // Only rendered once one of these subtype/specialty values is
  // present in that service type's own serviceSubtypes entry; omit
  // to always show once the service type itself is selected.
  showIf?: string[]
}

export const SCORE_OPTIONS: Choice[] = [
  ["0", "هیچ‌وجه"],
  ["50", "تا حدی"],
  ["100", "کاملاً"],
]

const CHILD_AGE_RANGE: Choice[] = [
  ["infant", "نوزاد و شیرخوار (۰ تا ۲ سال)"],
  ["toddler", "کودک نوپا (۲ تا ۵ سال)"],
  ["school_age", "سن مدرسه (۶ تا ۱۲ سال)"],
  ["teen", "نوجوان (۱۳ تا ۱۸ سال)"],
]

const CHILDREN_COUNT_CAPACITY: Choice[] = [
  ["one", "۱ کودک"],
  ["two", "۲ کودک"],
  ["three_plus", "۳ کودک یا بیشتر"],
]

const TUTORING_SUBJECT: Choice[] = [
  ["math", "ریاضی"],
  ["science", "علوم"],
  ["literature", "ادبیات فارسی"],
  ["english", "زبان انگلیسی"],
  ["quran", "قرآن و دینی"],
  ["other", "سایر"],
]

const CLEANING_FREQUENCY: Choice[] = [
  ["daily", "روزانه"],
  ["every_other_day", "یک روز در میان"],
  ["weekly", "هفته‌ای یک‌بار"],
  ["biweekly", "هر دو هفته یک‌بار"],
]

const CLEANING_STANDARD_LEVEL: Choice[] = [
  ["light", "نظافت سطحی و روزمره (گردگیری، جمع و جور کردن)"],
  ["standard", "نظافت کامل هفتگی (حمام، آشپزخانه، شیشه‌ها)"],
  ["deep", "نظافت عمقی و تخصصی (شستشوی موکت/مبل، ضدعفونی کامل)"],
]

const COOKING_CUISINE: Choice[] = [
  ["iranian", "غذای ایرانی"],
  ["fast_food", "فست‌فود"],
  ["diet_food", "غذای رژیمی"],
  ["other", "سایر"],
]

const PREGNANCY_STAGE: Choice[] = [
  ["early", "اوایل بارداری"],
  ["mid", "اواسط بارداری"],
  ["late", "اواخر بارداری"],
]

const NURSING_DEGREE_LEVEL: Choice[] = [
  ["associate", "کاردانی"],
  ["bachelor", "کارشناسی"],
  ["master_plus", "کارشناسی ارشد و بالاتر"],
]

const LANGUAGE_LEVEL: Choice[] = [
  ["none", "هیچ"],
  ["basic", "مقدماتی"],
  ["intermediate", "متوسط"],
  ["fluent", "پیشرفته / روان"],
]

const CHILD_CONDITION: Choice[] = [
  ["autism", "اوتیسم"],
  ["physical_disability", "معلولیت جسمی"],
  ["speech_therapy_needed", "نیاز به گفتاردرمانی"],
  ["diaper_dependent_disability", "وابسته به پوشک به دلیل معلولیت"],
  ["none", "هیچ‌کدام — کودک عادی"],
]

const TUTOR_ROLE_TYPE: Choice[] = [
  ["private_teacher", "معلم خصوصی (تدریس کامل درس)"],
  ["academic_mentor", "مربی و پشتیبان درسی (کمک درسی عمومی)"],
  ["homework_helper_only", "فقط کمک در تمرین و تکالیف"],
]

const HOUSEHOLD_TASK_FOR_CHILDCARE: Choice[] = [
  ["cooking", "آشپزی"],
  ["house_cleaning", "نظافت منزل"],
  ["shopping", "خرید مایحتاج"],
  ["laundry_ironing", "شست‌وشو و اتو"],
]

const CHILD_RELATED_TRAINING_COURSE: Choice[] = [
  ["child_psychology", "روانشناسی کودک"],
  ["child_first_aid", "کمک‌های اولیه کودک"],
  ["child_rearing", "تربیت کودک"],
  ["special_needs_training", "آموزش ویژه (اوتیسم و نیازهای خاص)"],
]

const NAIL_STYLE: Choice[] = [
  ["short_bare", "کوتاه و بدون لاک"],
  ["short_polished", "کوتاه با لاک ساده"],
  ["long_polished", "بلند و لاک‌شده"],
]

const PAY_BASIS: Choice[] = [
  ["hourly", "ساعتی"],
  ["shift", "شیفتی"],
  ["daily", "روزانه"],
  ["monthly", "ماهانه"],
]

const COOKING_SKILL_LEVEL: Choice[] = [
  ["weak", "ضعیف"],
  ["average", "متوسط"],
  ["good", "خوب"],
  ["excellent", "عالی"],
]

export const SERVICE_SPECIFIC_FORMS: Record<string, {
  form2: ServiceSpecificField[]
  form3: ServiceSpecificField[]
  questionnaire: ServiceSpecificField[]
}> = {
  koodakyar: {
    // Fields with no showIf apply to BOTH کودک‌یار subtypes
    // (homework_tutor and live_in_housework_childcare) — only the
    // ones that are clearly specific to one subtype are gated.
    form2: [
      { key: "accepted_child_age_ranges", label: "بازه سنی کودک قابل پذیرش", type: "multi", choices: CHILD_AGE_RANGE },
      { key: "max_children_count", label: "حداکثر تعداد کودک قابل نگهداری هم‌زمان", type: "choice", choices: CHILDREN_COUNT_CAPACITY },
      { key: "accepted_child_conditions", label: "ویژگی‌های خاص کودک قابل پذیرش", type: "multi", choices: CHILD_CONDITION },
      { key: "pay_basis", label: "مبنای دریافت حقوق", type: "choice", choices: PAY_BASIS },
      // Family-composition acceptance — these ask the CAREGIVER's own
      // willingness to work in that household situation, not
      // anything about her own family.
      { key: "ok_with_single_father", label: "تمایل به کار نزد پدر مجرد", type: "bool" },
      { key: "ok_with_single_mother", label: "تمایل به کار نزد مادر تنها (بدون همسر)", type: "bool" },
      { key: "ok_with_father_absent_at_home", label: "تمایل به کار در خانواده‌ای که پدر در ساعات کاری در منزل نیست", type: "bool" },
      { key: "ok_with_grandparent_or_relative_at_home", label: "تمایل به کار در خانواده‌ای که پدربزرگ/مادربزرگ یا یکی از اقوام هم در منزل حضور دارد", type: "bool" },
      { key: "ok_with_home_camera", label: "تمایل به کار در منزلی که دوربین مداربسته دارد", type: "bool" },
      { key: "pets_dog_ok", label: "مشکلی با حضور سگ در منزل ندارد", type: "bool" },
      { key: "pets_cat_ok", label: "مشکلی با حضور گربه در منزل ندارد", type: "bool" },
      { key: "travel_domestic_ok", label: "آمادگی سفر همراه خانواده در داخل ایران", type: "bool" },
      { key: "travel_international_ok", label: "آمادگی سفر همراه خانواده به خارج از کشور", type: "bool" },
      // homework_tutor only
      { key: "tutor_role_type", label: "نوع نقش تدریس", type: "choice", choices: TUTOR_ROLE_TYPE, showIf: ["homework_tutor"] },
      { key: "tutoring_subjects", label: "دروس قابل تدریس", type: "multi", choices: TUTORING_SUBJECT, showIf: ["homework_tutor"] },
      { key: "after_school_pickup_ok", label: "امکان رفتن دنبال کودک از مدرسه", type: "bool", showIf: ["homework_tutor"] },
      { key: "after_school_care_ok", label: "آمادگی نگهداری کودک بعد از ساعت مدرسه (after school care)", type: "bool", showIf: ["homework_tutor"] },
      // live_in_housework_childcare only
      { key: "household_tasks_capable", label: "کارهای خانه قابل انجام در کنار نگهداری کودک", type: "multi", choices: HOUSEHOLD_TASK_FOR_CHILDCARE, showIf: ["live_in_housework_childcare"] },
      { key: "diaper_changing_ok", label: "آمادگی برای تغییر پوشک", type: "bool", showIf: ["live_in_housework_childcare"] },
    ],
    form3: [
      { key: "childcare_experience", label: "سابقه مراقبت از کودک", type: "choice", choices: EXPERIENCE_RANGE },
      { key: "preschool_experience", label: "سابقه کار در مهدکودک", type: "choice", choices: EXPERIENCE_RANGE },
      { key: "currently_babysitting_elsewhere", label: "هم‌اکنون جای دیگری هم بچه‌داری می‌کند", type: "bool" },
      { key: "child_cpr_training", label: "آموزش کمک‌های اولیه/CPR کودک دیده است", type: "bool" },
      { key: "child_related_training_courses", label: "دوره‌های آموزشی مرتبط با کودک گذرانده‌شده", type: "multi", choices: CHILD_RELATED_TRAINING_COURSE },
      { key: "has_speech_therapy_training", label: "آموزش یا تجربه گفتاردرمانی دارد", type: "bool" },
      { key: "english_level", label: "میزان تسلط به زبان انگلیسی", type: "choice", choices: LANGUAGE_LEVEL },
      { key: "arabic_level", label: "میزان تسلط به زبان عربی", type: "choice", choices: LANGUAGE_LEVEL },
      { key: "has_visible_tattoo", label: "تتوی قابل مشاهده دارد", type: "bool" },
      { key: "nail_style", label: "وضعیت ناخن", type: "choice", choices: NAIL_STYLE },
      // homework_tutor only
      { key: "tutoring_experience", label: "سابقه تدریس خصوصی", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["homework_tutor"] },
      { key: "speaks_without_accent", label: "بدون لهجه صحبت می‌کند", type: "bool", showIf: ["homework_tutor"] },
      // live_in_housework_childcare only
      { key: "weaning_support_experience", label: "تجربه کمک به از شیر/پوشک گرفتن کودک", type: "bool", showIf: ["live_in_housework_childcare"] },
      { key: "cooking_skill_level", label: "سطح مهارت آشپزی", type: "choice", choices: COOKING_SKILL_LEVEL, showIf: ["live_in_housework_childcare"] },
      { key: "enjoys_cooking_at_home", label: "به آشپزی در منزل علاقه دارد", type: "bool", showIf: ["live_in_housework_childcare"] },
    ],
    questionnaire: [
      { key: "patience_with_children_level", label: "میزان صبر در برابر شیطنت و بازیگوشی کودک", type: "score" },
      { key: "creative_engagement_level", label: "توانایی سرگرم‌کردن و بازی کردن با کودک", type: "score" },
      { key: "kindness_level", label: "مهربانی", type: "score" },
      { key: "cheerfulness_level", label: "شادابی و سرزندگی", type: "score" },
      { key: "grooming_level", label: "آراستگی و مرتب بودن ظاهر", type: "score" },
      { key: "politeness_level", label: "ادب و نحوه برخورد", type: "score" },
    ],
  },
  nezafatchi: {
    form2: [
      { key: "cleaning_frequency_preference", label: "تناوب ترجیحی نظافت", type: "choice", choices: CLEANING_FREQUENCY },
      { key: "brings_own_equipment", label: "وسایل نظافت را خودش می‌آورد", type: "bool" },
      // Concrete standard instead of an abstract 0/50/100 "taste/care"
      // score — a caregiver's cleaning standard is a real difference
      // in what they'll do, so it gets a specific, pickable answer.
      { key: "cleaning_standard_level", label: "سطح نظافتی که ارائه می‌دهد", type: "choice", choices: CLEANING_STANDARD_LEVEL },
      { key: "cooking_cuisines", label: "نوع غذاهایی که می‌تواند بپزد", type: "multi", choices: COOKING_CUISINE, showIf: ["cooking"] },
    ],
    form3: [
      { key: "cleaning_experience", label: "سابقه کار نظافتی", type: "choice", choices: EXPERIENCE_RANGE },
      { key: "cooking_experience", label: "سابقه آشپزی", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["cooking"] },
    ],
    // Reframed to measure compatibility with the actual working
    // conditions (per the confirmed request), not a vague personal
    // trait — e.g. "دقت و سلیقه" told you nothing actionable; "آمادگی
    // برای کار در شرایط دشوار" tells you whether to place this
    // caregiver in a demanding home.
    questionnaire: [
      { key: "harsh_conditions_compatibility_level", label: "سازگاری با شرایط دشوار کاری (خانه بزرگ، وسایل شکستنی، حضور حیوان خانگی)", type: "score" },
      { key: "cleaning_chemicals_tolerance_level", label: "سازگاری با استفاده مستمر از مواد شوینده و بوهای تند", type: "score" },
    ],
  },
  madaryar: {
    form2: [
      { key: "pay_basis", label: "مبنای دریافت حقوق", type: "choice", choices: PAY_BASIS },
      { key: "night_shift_ok", label: "آمادگی برای شیفت شب نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "labor_accompaniment_ok", label: "آمادگی همراهی در زمان زایمان", type: "bool", showIf: ["labor"] },
      { key: "preferred_pregnancy_stage", label: "مرحله ترجیحی بارداری برای همراهی", type: "choice", choices: PREGNANCY_STAGE, showIf: ["pregnancy"] },
    ],
    form3: [
      { key: "breastfeeding_support_training", label: "آموزش حمایت از شیردهی دیده است", type: "bool" },
      { key: "newborn_care_experience", label: "سابقه مراقبت از نوزاد", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["newborn"] },
      { key: "weaning_support_experience", label: "تجربه کمک به از شیر/پوشک گرفتن نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "labor_support_experience", label: "سابقه همراهی در زایمان", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["labor"] },
    ],
    questionnaire: [
      { key: "gentleness_with_newborn_level", label: "لطافت و دقت در برخورد با نوزاد", type: "score" },
      { key: "calmness_under_pressure_level", label: "آرامش در شرایط پراسترس (مثل لحظات زایمان)", type: "score" },
      // Asked as the CAREGIVER's own comfort/compatibility with the
      // mother's situation — never a question about the caregiver's
      // own reproductive history.
      { key: "ivf_or_pregnancy_loss_history_compatibility_level", label: "سازگاری با همراهی مادرانی که سابقه IVF یا سقط جنین دارند", type: "score" },
    ],
  },
  parastar: {
    form2: [
      { key: "nursing_license_number", label: "شماره پروانه نظام پرستاری", type: "text" },
      { key: "shift_rotation_ok", label: "آمادگی برای چرخش شیفت", type: "bool" },
      { key: "can_administer_injections", label: "توانایی تزریقات", type: "bool" },
    ],
    form3: [
      { key: "nursing_degree_level", label: "مقطع تحصیلی پرستاری", type: "choice", choices: NURSING_DEGREE_LEVEL },
      { key: "years_of_clinical_experience", label: "سابقه کار بالینی", type: "choice", choices: EXPERIENCE_RANGE },
      { key: "icu_experience", label: "سابقه کار در ICU", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["icu"] },
      { key: "wound_care_experience", label: "سابقه مراقبت از زخم بستر", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["wound_care"] },
      { key: "pediatric_nursing_experience", label: "سابقه پرستاری کودکان", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["pediatric"] },
    ],
    questionnaire: [
      { key: "clinical_judgement_confidence_level", label: "اعتماد به قضاوت بالینی خودش", type: "score" },
      { key: "emergency_stress_tolerance_level", label: "تحمل استرس در شرایط اورژانسی", type: "score" },
    ],
  },
  behyar: {
    form2: [
      { key: "physical_tasks_comfort", label: "آمادگی برای کارهای فیزیکی (جابجایی و بلند کردن بیمار)", type: "bool" },
      { key: "shift_rotation_ok", label: "آمادگی برای چرخش شیفت", type: "bool" },
    ],
    form3: [
      { key: "aide_training_certificate", label: "گواهی آموزشی کمک‌بهیاری/بهیاری دارد", type: "bool" },
      { key: "years_of_hospital_experience", label: "سابقه کار بیمارستانی", type: "choice", choices: EXPERIENCE_RANGE },
    ],
    questionnaire: [
      { key: "physical_stamina_level", label: "استقامت فیزیکی برای کارهای سخت", type: "score" },
    ],
  },
}
