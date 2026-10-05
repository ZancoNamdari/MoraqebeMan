// Transcribed directly from backend/apps/caregivers/choices.py — keep
// these in sync with that file if it changes. Each is [value, label].

export type Choice = [string, string]

// Service type/subtype — the new required step right after
// name/family/phone, before Form 1. A caregiver can hold several
// SERVICE_TYPE values at once (checkbox, not radio) — see
// CaregiverProfile.service_types' backend docstring.
export const SERVICE_TYPE: Choice[] = [
  ["salmandyar", "سالمندیار"],
  ["nezafatchi", "امور منزل"],
  ["madaryar", "مادریار"],
  ["behyar", "بهیار"],
]

// «کودک‌یار» دیگر نوع خدمت جدا نیست و کامل در مادریار ادغام شده
// (زیرشاخه‌های کودک / کمک‌کننده در درس و مشق / کارهای خانه + کودک).
// «پرستار» فعلاً غیرفعال است: در انتخاب نوع خدمت نشان داده نمی‌شود،
// ولی برچسبش برای مراقب‌های قبلاً ثبت‌شده در ALL_SERVICE_TYPE می‌ماند
// و فرم‌های SERVICE_SPECIFIC_FORMS.parastar برای فعال‌سازی مجدد دست‌نخورده‌اند.
export const INACTIVE_SERVICE_TYPE: Choice[] = [
  ["parastar", "پرستار"],
]

// برای جست‌وجوی برچسب (کارت‌ها، عنوان بخش‌ها)، نه برای انتخاب.
export const ALL_SERVICE_TYPE: Choice[] = [...SERVICE_TYPE, ...INACTIVE_SERVICE_TYPE]

export const NEZAFATCHI_SUBTYPE: Choice[] = [
  ["outside_home", "خدمات بیرون از خانه"],
  ["inside_home", "خدمات داخل خانه"],
  ["cooking", "آشپزی"],
]

// مادریار + کودک‌یار (ادغام‌شده). دوران بارداری / در شرف زایمان / پس از
// زایمان دیگر زیرشاخه نیستند؛ ترجیح مرحله زیر «نوزاد» پرسیده می‌شود
// (NEWBORN_STAGE_PREFERENCE در فرم ۲).
export const MADARYAR_SUBTYPE: Choice[] = [
  ["newborn", "نوزاد"],
  ["child", "کودک"],
  ["homework_helper", "کمک‌کننده در درس و مشق"],
  ["housework_child", "کارهای خانه + کودک"],
]

export const PARASTAR_SUBTYPE: Choice[] = [
  ["nursing_specialist", "کارشناس پرستاری"],
  ["specialized_nurse", "پرستار تخصصی"],
]

export const PARASTAR_SPECIALTY: Choice[] = [
  ["icu", "ICU کار"],
  ["wound_care", "زخم بستر کار"],
  ["pediatric", "کودکان کار"],
  ["midwifery", "مامایی"],
  ["emergency", "اورژانس"],
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

export const CHILD_ACCOMPANY_AT_WORK: Choice[] = [
  ["yes", "بله"],
  ["no", "خیر"],
  ["indifferent", "فرقی ندارد"],
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
  ["turk", "آذری/ترک"],
  ["kurd", "کرد"],
  ["lor", "لر"],
  ["gilak", "گیلک"],
  ["mazandarani", "مازندرانی"],
  ["baloch", "بلوچ"],
  ["arab", "عرب خوزستان"],
  ["turkmen", "ترکمن"],
  ["talesh", "تالشی"],
  ["tat", "تات"],
  ["armenian", "ارمنی"],
  ["assyrian", "آشوری"],
  ["jewish", "یهودی ایرانی"],
  ["qashqai", "قشقایی"],
  ["bakhtiari", "بختیاری"],
  ["other", "سایر"],
]

// زیرگروه (اهل کجا) هر قومیت اصلی — از backend/apps/caregivers/choices.py
// (ETHNICITY_SUBGROUPS) بازنویسی شده؛ هم‌گام نگه دارید.
export const ETHNICITY_SUBGROUPS: Record<string, Choice[]> = {
  fars: [
    ["tehrani", "تهرانی"],
    ["khorasani", "خراسانی"],
    ["isfahani", "اصفهانی"],
    ["shirazi", "شیرازی"],
    ["yazdi", "یزدی"],
    ["kermani", "کرمانی"],
    ["qomi", "قمی"],
    ["kashani", "کاشانی"],
    ["gilaki_neighbor", "گیلکی‌مجاور"],
    ["other", "سایر"],
  ],
  turk: [
    ["tabrizi", "تبریزی"],
    ["ardabili", "اردبیلی"],
    ["urmiaei", "ارومیه‌ای"],
    ["zanjani", "زنجانی"],
    ["qazvini", "قزوینی"],
    ["hamedani", "همدانی"],
    ["maraghei", "مراغه‌ای"],
    ["khoyi", "خویی"],
    ["mianei", "میانه‌ای"],
    ["other", "سایر"],
  ],
  kurd: [
    ["sanandaji", "سنندجی"],
    ["kermanshahi", "کرمانشاهی"],
    ["marivani", "مریوانی"],
    ["saqqezi", "سقزی"],
    ["baneh", "بانه‌ای"],
    ["mahabadi", "مهابادی"],
    ["ilami", "ایلامی"],
    ["other", "سایر"],
  ],
  lor: [
    ["lorestani", "لرستانی"],
    ["khorramabadi", "خرم‌آبادی"],
    ["boroujerdi", "بروجردی"],
    ["lak", "لک"],
    ["bakhtiari", "بختیاری"],
    ["mamasani", "ممسنی"],
    ["other", "سایر"],
  ],
  gilak: [
    ["rashti", "رشتی"],
    ["lahijani", "لاهیجانی"],
    ["fomani", "فومنی"],
    ["roudsari", "رودسری"],
    ["anzali", "انزلی‌ای"],
    ["other", "سایر"],
  ],
  mazandarani: [
    ["sari", "ساروی"],
    ["babol", "بابلی"],
    ["amol", "آملی"],
    ["ghaemshahr", "قائمشهری"],
    ["nowshahr", "نوشهری"],
    ["chalus", "چالوسی"],
    ["other", "سایر"],
  ],
  baloch: [
    ["zahedani", "زاهدانی"],
    ["saravani", "سراوانی"],
    ["chabahari", "چابهاری"],
    ["iranshahri", "ایرانشهری"],
    ["nikshahri", "نیکشهری"],
    ["other", "سایر"],
  ],
  arab: [
    ["ahvazi", "اهوازی"],
    ["abadani", "آبادانی"],
    ["khorramshahri", "خرمشهری"],
    ["shadegani", "شادگانی"],
    ["dezful_shushtar_arab", "دزفولی/شوشتریِ عرب‌مجاور"],
    ["other", "سایر"],
  ],
  turkmen: [
    ["gonbad", "گنبدی"],
    ["bandar_turkmen", "بندرترکمن"],
    ["aqqala", "آق‌قلا"],
    ["kalaleh", "کلاله"],
    ["other", "سایر"],
  ],
  talesh: [
    ["talesh_north", "تالش شمالی"],
    ["asalem", "اسالم"],
    ["masal", "ماسال"],
    ["surrounding_areas", "مناطق اطراف"],
    ["other", "سایر"],
  ],
  tat: [
    ["qazvin_takestan", "قزوین/تاکستان"],
    ["alborz_zanjan_areas", "برخی مناطق البرز و زنجان"],
    ["other", "سایر"],
  ],
  armenian: [
    ["tehran", "ارمنی‌های تهران"],
    ["isfahan", "ارمنی‌های اصفهان"],
    ["azerbaijan", "ارمنی‌های آذربایجان"],
    ["other", "سایر"],
  ],
  assyrian: [
    ["northwest", "شمال‌غرب"],
    ["tehran", "تهران"],
    ["other", "سایر"],
  ],
  jewish: [
    ["tehran", "تهران"],
    ["shiraz", "شیراز"],
    ["isfahan", "اصفهان"],
    ["other", "سایر"],
  ],
  qashqai: [
    ["shiraz", "شیراز"],
    ["firuzabad", "فیروزآباد"],
    ["kazerun", "کازرون"],
    ["nomadic_rural_fars", "مناطق کوچ‌نشین/روستایی فارس"],
    ["other", "سایر"],
  ],
  bakhtiari: [
    ["chaharmahal", "چهارمحال"],
    ["masjed_soleyman", "مسجدسلیمان"],
    ["izeh", "ایذه"],
    ["lordegan", "لردگان"],
    ["other", "سایر"],
  ],
}

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

// COLLABORATION_TYPE's wording depends on who the caregiver actually
// works for — "کارفرما" only makes sense for نظافت‌چی (a property/
// employer, no patient); every other type should name who they're
// caring for (سالمند/کودک/نوزاد/بیمار). "همراهی در بیمارستان" is
// dropped entirely when نظافت‌چی is the ONLY selected type — cleaning
// work has no hospital context (same pattern used elsewhere for
// نظافت‌چی-only gating).
export function getCollaborationTypeChoices(
  serviceTypes: string[],
  serviceSubtypes: Record<string, string[]> = {},
): Choice[] {
  const cleanerOnly = serviceTypes.length > 0 && serviceTypes.every((t) => t === "nezafatchi")
  const subjects: string[] = []
  if (serviceTypes.includes("salmandyar")) subjects.push("سالمند")
  if (serviceTypes.includes("madaryar")) {
    // مادریار شامل نوزاد و کودک است — واژه از روی زیرشاخه‌ی انتخابی.
    const subs = serviceSubtypes.madaryar ?? []
    const hasNewborn = subs.includes("newborn")
    const hasChild = subs.some((x) => x !== "newborn")
    if (hasNewborn && hasChild) subjects.push("نوزاد/کودک")
    else if (hasChild) subjects.push("کودک")
    else if (hasNewborn) subjects.push("نوزاد")
    else subjects.push("نوزاد/کودک")
  }
  if (serviceTypes.includes("parastar") || serviceTypes.includes("behyar")) subjects.push("بیمار")
  const subject = subjects.length > 0 ? subjects.join(" / ") : "کارفرما"
  return COLLABORATION_TYPE
    .filter((c) => !(cleanerOnly && c[0] === "hospital_companion"))
    .map((c) => (c[0] === "home_companion" ? [c[0], `همراهی در منزل ${subject}`] as Choice : c))
}

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
  ["lower_back_disc", "دیسک کمر"],
  ["blind", "نابینایی"],
  ["fracture", "شکستگی استخوان"],
  ["depression", "افسردگی"],
  ["needs_companionship", "تنها و نیازمند هم‌صحبتی (هم‌دم)"],
  ["speech_impairment", "اختلال گفتار و تکلم"],
  ["respiratory_problem", "مشکلات تنفسی"],
  ["restlessness", "بی‌قراری (مانند زوال عقل)"],
  ["incontinence", "بی‌اختیاری ادرار و مدفوع"],
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
  ["french", "فرانسوی"],
  ["german", "آلمانی"],
  ["russian", "روسی"],
  ["chinese", "چینی"],
  ["spanish", "اسپانیایی"],
  ["italian", "ایتالیایی"],
  ["urdu", "اردو"],
  ["pashto", "پشتو"],
  ["armenian", "ارمنی"],
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

// How well the caregiver handles the local language(s) they selected
// above — just understanding it, or being able to actually converse.
export const LOCAL_LANGUAGE_FLUENCY: Choice[] = [
  ["understand_only", "فقط متوجه می‌شود"],
  ["can_converse", "می‌تواند مکالمه کند"],
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
  // Only rendered once another field in the SAME service_specific_answers
  // bucket (identified by `key`) currently holds one of `oneOf` — a
  // scalar value is matched directly, an array value (e.g. a multi
  // field like indoor_activities) is matched by intersection. Lets a
  // field depend on an activity checkbox instead of a top-level
  // subtype (which showIf is limited to).
  showIfField?: { key: string; oneOf: string[] }
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
  ["traditional", "غذای سنتی"],
  ["simple_daily", "غذای ساده روزمره"],
  ["formal_ceremonial", "غذای مجلسی"],
  ["western", "غذای فرنگی"],
  ["diet_food", "غذای رژیمی"],
  ["baby_food", "غذای کودک"],
  ["vegetarian", "غذاهای گیاهی"],
  ["pastry_dessert", "شیرینی و دسر"],
  ["fast_food", "فست‌فود"],
  ["other", "سایر"],
]

// سرایداری / سرایداری خانوادگی / سرایداری مجردی — این یکی هنوز به‌عنوان
// یک دنباله واقعی پرسیده می‌شود (نه یک تسک‌لیست اضافی).
const JANITOR_RESIDENCY: Choice[] = [
  ["live_in", "اقامت در محل"],
  ["not_live_in", "بدون اقامت"],
  ["independent_room", "اتاق مستقل"],
  ["independent_unit", "واحد مستقل"],
]

const GENERAL_CLEANING_SKILL: Choice[] = [
  ["daily_cleaning", "نظافت روزمره"],
  ["deep_cleaning", "نظافت عمیق"],
  ["dusting", "گردگیری"],
  ["washing", "شست‌وشو"],
  ["sweeping", "جارو"],
  ["mopping", "تی‌کشیدن"],
  ["dishwashing", "شستن ظروف"],
  ["tidying", "مرتب‌سازی"],
  ["gathering_items", "جمع‌آوری وسایل"],
  ["bathroom_washing", "شست‌وشوی سرویس بهداشتی"],
  ["kitchen_washing", "شست‌وشوی آشپزخانه"],
]

const PROPERTY_SIZE_RANGE: Choice[] = [
  ["under_100", "تا ۱۰۰ متر"],
  ["100_200", "۱۰۰ تا ۲۰۰ متر"],
  ["200_400", "۲۰۰ تا ۴۰۰ متر"],
  ["over_400", "بالای ۴۰۰ متر"],
]

// Patient diagnoses/conditions a پرستار has cared for. wound_care/
// icu/pediatric/midwifery/emergency experience already have their
// own showIf-gated question tied to ParastarSpecialty, so they're
// not repeated here.
const PARASTAR_CONDITION_EXPERIENCE: Choice[] = [
  ["diabetes", "دیابت"],
  ["stroke", "سکته مغزی"],
  ["parkinsons", "پارکینسون"],
  ["alzheimers", "آلزایمر"],
  ["heart_disease", "بیماری قلبی"],
  ["ms", "ام‌اس (MS)"],
  ["hepatitis", "هپاتیت"],
  ["hiv_aids", "ایدز (HIV)"],
  ["cancer", "سرطان"],
  ["lung_disease", "بیماری ریوی"],
  ["osteoporosis_fracture", "پوکی استخوان / شکستگی"],
  ["femur_fracture", "شکستگی استخوان ران (فمور)"],
  ["pelvis_fracture", "شکستگی لگن"],
  ["paralysis", "فلج"],
  ["biliary_disease", "بیماری صفراوی"],
  ["vascular_stenosis", "تنگی عروق"],
  ["amputation", "قطع عضو"],
  ["dialysis", "دیالیز"],
  ["psp", "PSP (فلج فوق‌هسته‌ای پیش‌رونده)"],
  ["blind", "نابینایی"],
  ["infection_general", "عفونت عمومی"],
  ["skin_infection", "عفونت پوستی"],
  ["vaginal_infection", "عفونت واژینال"],
  ["infected_bleeding_wound", "زخم خونریزی‌دار و عفونی"],
  ["diabetic_foot_ulcer", "زخم پای دیابتی"],
  ["depression", "افسردگی"],
  ["post_hysterectomy", "پس از عمل برداشتن رحم"],
  ["post_miscarriage", "پس از سقط جنین"],
  ["post_ivf", "پس از IVF"],
  ["post_eye_surgery", "پس از عمل چشم"],
]

// Clinical procedures/skills a پرستار can perform. Injections
// already have their own universal bool (can_administer_injections),
// so not repeated here.
const PARASTAR_PROCEDURE_ABILITY: Choice[] = [
  ["tube_feeding_gavage", "تغذیه با گاواژ (لوله)"],
  ["oxygen_therapy", "اکسیژن‌درمانی"],
  ["catheter_care", "مراقبت از سوند"],
  ["pacemaker_patient_care", "مراقبت از بیمار دارای پیس‌میکر"],
  ["vital_signs_monitoring", "کنترل قند، فشار و اکسیژن خون"],
  ["insulin_injection", "تزریق انسولین"],
  ["iv_serum_therapy", "سرم‌تراپی"],
  ["wound_dressing", "پانسمان زخم"],
  ["suture_removal", "بخیه و کشیدن بخیه"],
  ["diaper_changing", "تغییر پوشک"],
  ["iodine_therapy", "یددرمانی"],
  ["immobile_patient_care", "مراقبت از بیمار بی‌حرکت"],
  ["patient_transfer", "جابه‌جایی بیمار"],
  ["appointment_accompaniment", "همراهی بیمار برای ویزیت و درمان"],
  ["physiotherapy_assistance", "فیزیوتراپی و کمک به انجام تمرینات تجویزشده"],
  ["dialysis_accompaniment", "دیالیز و همراهی بیمار دیالیزی"],
]

// Which age/patient groups this پرستار has experience caring for —
// a coarser, faster-to-answer complement to the diagnosis-level
// PARASTAR_CONDITION_EXPERIENCE list below.
const PARASTAR_PATIENT_GROUP: Choice[] = [
  ["elderly", "سالمند"],
  ["adult", "بزرگسال"],
  ["child", "کودک"],
  ["newborn", "نوزاد"],
  ["mother", "مادر"],
  ["post_op_patient", "بیمار بعد از عمل"],
  ["home_bound_patient", "بیمار بستری در منزل"],
  ["emergency_patient", "بیمار اورژانسی"],
  ["intensive_care_patient", "بیمار نیازمند مراقبت ویژه"],
]

// Shared between the two equipment multi-selects below — the
// document's own 3-tier "بدون تجربه/تجربه دارد/کاملاً مسلط" scale is
// approximated here as two independent multi-selects (has used it at
// all / is fully proficient with it) rather than one field per piece
// of equipment, to keep the question count manageable.
const PARASTAR_EQUIPMENT: Choice[] = [
  ["blood_glucose_meter", "دستگاه قند خون"],
  ["blood_pressure_meter", "فشارسنج"],
  ["pulse_oximeter", "پالس‌اکسی‌متر"],
  ["oxygen_device", "دستگاه اکسیژن"],
  ["suction_device", "دستگاه ساکشن"],
  ["iv_equipment", "تجهیزات سرم‌تراپی"],
  ["gavage_equipment", "تجهیزات گاواژ"],
  ["catheter_equipment", "تجهیزات سوند"],
  ["other_equipment", "سایر تجهیزات پزشکی"],
]

const PARASTAR_MEDICATION_TREATMENT_ABILITY: Choice[] = [
  ["medication_administration_per_order", "دارو دادن طبق دستور پزشک"],
  ["chemo_care_nursing_scope", "مراقبت پرستاری از بیمار شیمی‌درمانی/سرطانی طبق دستور مرکز درمانی"],
  ["post_treatment_care", "مراقبت بعد از درمان"],
]

const PARASTAR_WOUND_CARE_ABILITY: Choice[] = [
  ["surgical_wound_care", "مراقبت از زخم جراحی"],
  ["simple_dressing", "پانسمان ساده"],
  ["infected_wound_dressing", "پانسمان زخم عفونی"],
  ["open_wound_care", "مراقبت از زخم باز"],
  ["skin_care", "مراقبت از پوست"],
  ["urgent_referral_recognition", "تشخیص موارد نیازمند ارجاع فوری"],
]

const PARASTAR_MOTHER_CHILD_CARE_ABILITY: Choice[] = [
  ["pregnant_mother_care", "مراقبت از مادر باردار"],
  ["postpartum_care", "مراقبت پس از زایمان"],
  ["newborn_care", "مراقبت از نوزاد"],
  ["sick_child_care", "مراقبت از کودک بیمار"],
  ["child_emergency_care", "اورژانس کودک"],
  ["post_op_child_care", "مراقبت پس از عمل کودک"],
]

// زیرشاخه‌های کودک‌محور مادریار (همه‌ی زیرشاخه‌ها به‌جز نوزاد).
const CHILD_SUBTYPES = ["child", "homework_helper", "housework_child"]

// ترجیح مرحله‌ی همراهی با نوزاد — جایگزین زیرشاخه‌های قبلی
// دوران بارداری / در شرف زایمان / پس از زایمان.
const NEWBORN_STAGE_PREFERENCE: Choice[] = [
  ["pregnancy", "دوران بارداری (پیش از تولد نوزاد)"],
  ["labor", "در شرف زایمان"],
  ["postpartum", "پس از زایمان"],
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

export const LANGUAGE_LEVEL: Choice[] = [
  ["none", "هیچ"],
  ["basic", "مقدماتی"],
  ["intermediate", "متوسط"],
  ["fluent", "پیشرفته / روان"],
]

const CHILD_CONDITION: Choice[] = [
  ["autism", "اوتیسم"],
  ["physical_disability", "معلولیت جسمی"],
  ["speech_therapy_needed", "نیاز به گفتاردرمانی"],
  ["diaper_dependent_disability", "معلول حرکتی (پوشکی)"],
  ["none", "هیچ‌کدام — کودک عادی"],
]

const CHILD_SPECIAL_NEEDS_EXPERIENCE: Choice[] = [
  ["autism", "تجربه کار با کودک مبتلا به اوتیسم"],
  ["physical_disability", "تجربه کار با کودک دارای معلولیت جسمی"],
  ["speech_disorder", "تجربه کار با کودک دارای اختلال گفتار"],
  ["developmental_delay", "تجربه کار با کودک دارای تأخیر رشدی"],
  ["diaper_dependent", "تجربه کار با کودک معلول حرکتی (پوشکی)"],
  ["other", "سایر"],
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


export const PAY_BASIS: Choice[] = [
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

// "تجربه ندارم / تجربه دارم / آموزش دیده‌ام / کاملاً مسلط هستم" — per
// the سالمندیار redesign document's own explicit suggestion, used for
// the more sensitive personal-care tasks instead of a plain yes/no.
const CARE_EXPERIENCE_LEVEL: Choice[] = [
  ["none", "تجربه ندارم"],
  ["experienced", "تجربه دارم"],
  ["trained", "آموزش دیده‌ام"],
  ["fully_proficient", "کاملاً مسلط هستم"],
]

const ACCOMPANIMENT_TRANSPORT_METHOD: Choice[] = [
  ["on_foot", "پیاده"],
  ["public_transport", "حمل‌ونقل عمومی"],
  ["family_car", "خودرو خانواده"],
  ["personal_car", "خودرو شخصی"],
]

const VEHICLE_ABILITY: Choice[] = [
  ["owns_personal_car", "خودرو شخصی دارم"],
  ["has_driving_license", "گواهینامه دارم"],
  ["can_drive_family_car", "امکان رانندگی با خودروی خانواده را دارم"],
  ["can_use_car_for_accompaniment", "امکان استفاده از خودرو برای همراهی سالمند را دارم"],
  ["no_vehicle", "خودرو ندارم"],
]

export const SERVICE_SPECIFIC_FORMS: Record<string, {
  form2: ServiceSpecificField[]
  form3: ServiceSpecificField[]
  questionnaire: ServiceSpecificField[]
}> = {
  // سالمندیار predates this per-type JSON mechanism — most of its
  // questions were already promoted to real model fields (see the
  // hand-written {serviceTypes.includes("salmandyar") && ...} blocks
  // in the register page). These are the newer additions that don't
  // warrant their own migration, so they live here like every other
  // type's extra questions.
  salmandyar: {
    form2: [
      { key: "has_assistant", label: "آیا نیاز به نیروی کمکی برای انجام امور دارید؟", type: "bool" },
      { key: "night_wakefulness_ok", label: "آمادگی برای بیداری‌های شبانه مکرر", type: "bool" },
      { key: "toileting_hygiene_assistance_ok", label: "آمادگی برای کمک در طهارت و نظافت فردی سالمند", type: "bool" },
      { key: "bedpan_assistance_ok", label: "آیا مشکلی با کمک به سالمند نیازمند استفاده از لگن جهت امور شخصی دارید؟", type: "bool" },
      { key: "park_outing_accompaniment_ok", label: "آمادگی برای همراهی سالمند در پیاده‌روی و پارک", type: "bool" },
      // همدمی — فقط به معنای هم‌صحبتی و همراهی روحی/عاطفی در چارچوب
      // کار مراقبتی؛ صریح و شفاف پرسیده می‌شود.
      { key: "emotional_companionship_ok", label: "آمادگی برای همدمی و هم‌صحبتی با سالمند (گفتگو، همراهی در اوقات فراغت، حضور عاطفی در چارچوب کار مراقبتی)", type: "bool" },
      { key: "willing_to_relocate_other_cities", label: "آمادگی برای کار در شهرهای دیگر (محل کار دائم)", type: "bool" },
      { key: "ok_with_second_elderly_spouse_present", label: "آمادگی برای مراقبت در حضور همسر سالمند (زوج سالمند)", type: "bool" },
      // مراقبت شخصی — موارد حساس‌تر با مقیاس تجربه چهارسطحی به‌جای
      // بلی/خیر ساده (پیشنهاد صریح سند).
      { key: "grooming_assistance_level", label: "کمک به اصلاح و آراستگی سالمند", type: "choice", choices: CARE_EXPERIENCE_LEVEL },
      { key: "adult_diaper_changing_level", label: "تعویض پوشک بزرگسال", type: "choice", choices: CARE_EXPERIENCE_LEVEL },
      // غذا و تغذیه — توانایی اجرای رژیم، نه نوع رژیم سالمند (که از
      // سمت خانواده/پزشک گرفته می‌شود). ساده شد به یک بلی/خیر.
      { key: "dietary_execution_ok", label: "آیا توانایی تهیه و اجرای رژیم‌های غذایی خاص (کم‌نمک، دیابتی و مانند آن) را دارید؟", type: "bool" },
      // همراهی خارج از منزل — به‌جای فهرست فعالیت‌ها، همراهی برای
      // مراجعه به مراکز درمانی (نقطه حساس‌تر) به‌صورت بلی/خیر پرسیده
      // می‌شود؛ وسیله رفت‌وآمد همچنان جدا می‌ماند.
      { key: "medical_accompaniment_ok", label: "آیا آمادگی همراهی سالمند در مراجعه به مراکز درمانی را دارید؟", type: "bool" },
      { key: "accompaniment_transport_methods", label: "وسیله رفت‌وآمد هنگام همراهی", type: "multi", choices: ACCOMPANIMENT_TRANSPORT_METHOD },
      // ظاهر — به‌جای ارزش‌گذاری روی ظاهر، سازگاری با استاندارد
      // موردنظر خانواده پرسیده می‌شود (پیشنهاد صریح سند)
      { key: "appearance_standard_compliance_ok", label: "امکان رعایت استاندارد ظاهری و پوشش موردنظر خانواده", type: "bool" },
      { key: "short_nails_ok", label: "آمادگی برای کوتاه نگه‌داشتن ناخن در صورت درخواست خانواده", type: "bool" },
      { key: "specific_dress_code_ok", label: "آمادگی برای رعایت پوشش مشخص موردنظر خانواده", type: "bool" },
      { key: "no_specific_perfume_ok", label: "آمادگی برای عدم استفاده از عطر خاص در صورت درخواست خانواده", type: "bool" },
      // ماشین — جای یک بلی/خیر ساده، چند حالت کاربردی‌تر
      { key: "vehicle_abilities", label: "وضعیت خودرو و رانندگی", type: "multi", choices: VEHICLE_ABILITY },
    ],
    form3: [
      { key: "catheter_care_experience", label: "تجربه مراقبت از سالمند دارای سوند", type: "bool" },
      { key: "physiotherapy_assistance_experience", label: "تجربه همراهی/کمک در تمرینات فیزیوتراپی", type: "bool" },
      { key: "has_acrylic_nails", label: "ناخن کاشته‌شده دارد", type: "bool" },
      { key: "has_tattoo", label: "دارای تتو است", type: "bool" },
      // اگر دوره یا مهارتی داشتند که در چک‌لیست‌های بالا نبود.
      { key: "training_courses_other_detail", label: "دوره آموزشی دیگری هم گذرانده‌اید؟ (اگر در لیست بالا نبود)", type: "text" },
      { key: "caregiving_skills_other_detail", label: "مهارت مراقبتی دیگری هم دارید؟ (اگر در لیست بالا نبود)", type: "text" },
    ],
    // قبلاً خالی بود — سازگاری عمومی و اختصاصی سالمندیار طبق فرم ۱۵
    // سند، مثل Cleaner/Caregiverهای دیگر از ۱ تا ۵. مواردی که با
    // سازگاری عمومی (CAREGIVER_QUESTIONNAIRE) هم‌پوشانی داشتند یا به
    // اندازه کافی مشخص نبودند حذف شدند؛ بقیه به‌صورت سؤال واقعی
    // (نه صرفاً یک صفت) نوشته شدند.
    questionnaire: [
      { key: "kindness_level", label: "چقدر مهربان است؟", type: "score" },
      { key: "calmness_level", label: "چقدر آرام است؟", type: "score" },
      { key: "responsibility_level", label: "چقدر مسئولیت‌پذیر است؟", type: "score" },
      { key: "orderliness_level", label: "چقدر منظم است؟", type: "score" },
      { key: "punctuality_level", label: "چقدر وقت‌شناس است؟", type: "score" },
      { key: "attention_to_detail_level", label: "چقدر به جزئیات توجه می‌کند؟", type: "score" },
      { key: "communication_ability_level", label: "چقدر توانایی برقراری ارتباط دارد؟", type: "score" },
      { key: "harsh_conditions_tolerance_level", label: "چقدر تحمل شرایط دشوار را دارد؟", type: "score" },
      { key: "stress_management_level", label: "چقدر توانایی مدیریت استرس را دارد؟", type: "score" },
      // اختصاصی سالمندیار
      { key: "repeated_questions_patience_level", label: "چقدر در برابر تکرار سؤال‌های سالمند صبور است؟", type: "score" },
      { key: "restlessness_calmness_level", label: "چقدر در برابر بی‌قراری سالمند آرام می‌ماند؟", type: "score" },
      { key: "elderly_communication_ability_level", label: "چقدر توانایی ارتباط با سالمند را دارد؟", type: "score" },
      { key: "companionship_and_empathy_level", label: "چقدر توانایی ایجاد حس همراهی و همدلی دارد؟", type: "score" },
    ],
  },
  nezafatchi: {
    form2: [
      { key: "cleaning_frequency_preference", label: "تناوب ترجیحی نظافت", type: "choice", choices: CLEANING_FREQUENCY },
      { key: "one_time_jobs_ok", label: "آمادگی برای کارهای مقطعی (مانند نظافت پس از ساخت‌وساز یا اسباب‌کشی)", type: "bool" },
      { key: "brings_own_equipment", label: "وسایل نظافت را خودش می‌آورد", type: "bool" },
      // Concrete standard instead of an abstract 0/50/100 "taste/care"
      // score — a caregiver's cleaning standard is a real difference
      // in what they'll do, so it gets a specific, pickable answer.
      { key: "cleaning_standard_level", label: "سطح نظافتی که ارائه می‌دهد", type: "choice", choices: CLEANING_STANDARD_LEVEL },
      { key: "heavy_physical_work_ok", label: "توان بدنی برای کارهای نظافتی سنگین (زور بازو)", type: "bool" },
      // Property size, not a client age range — نظافت‌چی works for a
      // property/employer, not an elderly patient.
      { key: "preferred_property_size", label: "حداکثر متراژ محل مورد قبول برای نظافت", type: "choice", choices: PROPERTY_SIZE_RANGE },
      // محل ارائه خدمات — جایگزین سؤال سن/شرایط جسمی کارفرما که اینجا
      // موضوعیت ندارد. سؤال دوربین مداربسته دیگر اینجا تکرار نمی‌شود —
      // همان سؤال عمومی «مشکلی با دوربین مداربسته» در فرم ۲ کافی است.
      { key: "service_locations", label: "محل‌هایی که آمادگی ارائه خدمت در آن‌ها را دارد", type: "multi", choices: [
        ["home", "منزل (آپارتمان)"],
        ["villa", "ویلا"],
        ["company_office", "شرکت / دفتر"],
        ["clinic", "مطب / کلینیک"],
        ["warehouse", "انبار"],
        ["parking_building", "پارکینگ / ساختمان (سرایداری)"],
        ["yard", "حیاط"],
        ["other", "سایر"],
      ] },
      // اتباع بودن حالا در فرم ۱ (هویتی) به‌صورت عمومی برای همه نوع
      // خدمت پرسیده می‌شود، نه اینجا — رجوع کنید به identity.is_non_iranian_national.
      // زیرشاخه‌های واقعی نظافت‌چی فقط همین ۳ تاست؛ بقیه نقش‌ها
      // («پذیرایی»، «سرایداری»، «نظافت ویلا» و...) دیگر زیرشاخه‌های
      // مستقل نیستند، بلکه فعالیت‌هایی هستند که داخل خدمات داخل/خارج
      // از خانه چک می‌شوند.
      { key: "indoor_activities", label: "فعالیت‌های قابل انجام در داخل خانه", type: "multi", choices: [
        ["deep_cleaning", "خانه‌تکانی و نظافت عمیق"],
        ["hosting", "پذیرایی از مهمان"],
        ["cooking_help", "کمک در آشپزی"],
        ["laundry", "شست‌وشوی لباس"],
        ["plant_care", "رسیدگی به گل و گیاه"],
        ["furniture_moving", "جابه‌جایی وسایل"],
        ["villa_cleaning", "نظافت ویلا"],
      ], showIf: ["inside_home"] },
      { key: "outdoor_activities", label: "فعالیت‌های قابل انجام خارج از خانه", type: "multi", choices: [
        ["yard_cleaning", "نظافت حیاط"],
        ["parking_cleaning", "نظافت پارکینگ"],
        ["staircase_cleaning", "نظافت راه‌پله"],
        ["workplace_cleaning", "نظافت شرکت / دفتر / مطب / کلینیک"],
        ["janitor_family", "سرایداری خانوادگی"],
        ["janitor_single", "سرایداری مجردی"],
        ["shopping_errands", "خرید و انجام امور بیرون از منزل"],
      ], showIf: ["outside_home"] },
      { key: "fabric_type_recognition_ok", label: "آشنایی با مواد شوینده و تشخیص نوع پارچه", type: "bool", showIfField: { key: "indoor_activities", oneOf: ["laundry"] } },
      // Per the document's own explicit recommendation — this is a
      // more useful signal than asking height/weight directly.
      { key: "physical_limitation_for_moving", label: "محدودیت جسمی برای جابه‌جایی وسایل دارد", type: "bool", showIfField: { key: "indoor_activities", oneOf: ["furniture_moving"] } },
      { key: "client_facing_environment_ok", label: "آمادگی برای کار در محیط دارای ارباب‌رجوع", type: "bool", showIfField: { key: "outdoor_activities", oneOf: ["workplace_cleaning"] } },
      { key: "workplace_confidentiality_ok", label: "رعایت محرمانگی محیط کاری", type: "bool", showIfField: { key: "outdoor_activities", oneOf: ["workplace_cleaning"] } },
      // سرایداری / سرایداری خانوادگی / سرایداری مجردی
      { key: "janitor_residency", label: "وضعیت اقامت در محل سرایداری", type: "choice", choices: JANITOR_RESIDENCY, showIfField: { key: "outdoor_activities", oneOf: ["janitor_family", "janitor_single"] } },
      { key: "janitor_family_spouse_present", label: "امکان حضور همسر در محل سرایداری", type: "bool", showIfField: { key: "outdoor_activities", oneOf: ["janitor_family"] } },
      { key: "janitor_family_children_present", label: "امکان حضور فرزندان در محل سرایداری", type: "bool", showIfField: { key: "outdoor_activities", oneOf: ["janitor_family"] } },
      { key: "janitor_family_member_count", label: "تعداد اعضای خانواده", type: "text", showIfField: { key: "outdoor_activities", oneOf: ["janitor_family"] } },
      // آشپزی
      { key: "cooking_cuisines", label: "نوع غذاهایی که می‌تواند بپزد", type: "multi", choices: COOKING_CUISINE, showIf: ["cooking"] },
      { key: "cooking_skill_level", label: "سطح آشپزی", type: "choice", choices: COOKING_SKILL_LEVEL, showIf: ["cooking"] },
    ],
    form3: [
      // سوابق کار بر اساس محیط — form4's location-based experience,
      // kept as one multi-select instead of a separate scored field
      // per location (the role-specific forms already scope the
      // detailed skills per location).
      { key: "cleaning_work_locations_experience", label: "سابقه کار نظافتی در این محیط‌ها", type: "multi", choices: [
        ["home", "نظافت منزل"],
        ["company", "شرکت"],
        ["medical_office", "مطب"],
        ["office", "دفتر"],
        ["villa", "ویلا"],
        ["building", "ساختمان"],
        ["janitor", "سرایداری"],
        ["warehouse", "انبار"],
        ["full_housecleaning", "خانه‌تکانی"],
      ] },
      { key: "cleaning_experience", label: "مدت سابقه کار نظافتی", type: "choice", choices: EXPERIENCE_RANGE },
      // مهارت‌های عمومی — general cleaning + dishwashing skills that
      // apply across roles rather than being tied to one subtype
      // (folds the document's separate "ظروف" form into this list).
      { key: "general_cleaning_skills", label: "مهارت‌های عمومی نظافت", type: "multi", choices: GENERAL_CLEANING_SKILL },
      { key: "dishwashing_skills", label: "مهارت‌های ظرف‌شویی", type: "multi", choices: [
        ["hand_washing", "شستن ظروف با دست"],
        ["dishwasher_machine", "استفاده از ماشین ظرفشویی"],
        ["delicate_dishware", "شستن ظروف حساس"],
        ["party_dishware", "شستن ظروف مهمانی"],
        ["pot_scrubbing", "شست‌وشوی قابلمه"],
        ["sink_cleaning", "تمیز کردن سینک و اطراف آن"],
        ["dish_organizing", "مرتب‌سازی ظروف"],
      ] },
      { key: "cooking_experience", label: "سابقه آشپزی", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["cooking"] },
    ],
    // Reframed to measure compatibility with the actual working
    // conditions (per the confirmed request), not a vague personal
    // trait — e.g. "دقت و سلیقه" told you nothing actionable; "آمادگی
    // برای کار در شرایط دشوار" tells you whether to place this
    // caregiver in a demanding home.
    //
    // "سریع کار کردن" is kept separate from "دقیق کار کردن" per the
    // document's own note — someone fast is not necessarily thorough.
    questionnaire: [
      { key: "harsh_conditions_compatibility_level", label: "سازگاری با شرایط دشوار کاری (خانه بزرگ، وسایل شکستنی، حضور حیوان خانگی)", type: "score" },
      { key: "cleaning_chemicals_tolerance_level", label: "سازگاری با استفاده مستمر از مواد شوینده و بوهای تند", type: "score" },
      { key: "discipline_level", label: "انضباط و منظم بودن در کار", type: "score" },
      { key: "personal_cleanliness_level", label: "تمیزی و آراستگی ظاهری شخصی", type: "score" },
      { key: "punctuality_level", label: "وقت‌شناسی", type: "score" },
      { key: "work_cleanliness_precision_level", label: "دقت در تمیزکاری", type: "score" },
      { key: "responsibility_level", label: "مسئولیت‌پذیری", type: "score" },
      { key: "work_speed_level", label: "سرعت کار", type: "score" },
      { key: "attention_to_detail_level", label: "دقت در جزئیات", type: "score" },
      { key: "long_duration_work_tolerance_level", label: "توانایی کار طولانی‌مدت", type: "score" },
      { key: "physical_work_tolerance_level", label: "تحمل کار فیزیکی", type: "score" },
      { key: "flexibility_level", label: "انعطاف‌پذیری", type: "score" },
      { key: "hygiene_compliance_level", label: "رعایت بهداشت", type: "score" },
      { key: "trustworthiness_level", label: "امانت‌داری", type: "score" },
      { key: "respectful_behavior_level", label: "برخورد محترمانه", type: "score" },
      { key: "independent_work_ability_level", label: "توانایی کار مستقل", type: "score" },
      { key: "instruction_following_precision_level", label: "توانایی دریافت دستور و اجرای دقیق", type: "score" },
      { key: "household_privacy_respect_level", label: "رعایت حریم خصوصی منزل", type: "score" },
      // اختصاصی بر اساس فعالیت — معیارهای جسمی/نظم/تمیزی، نه پزشکی.
      { key: "food_hygiene_compliance_level", label: "رعایت بهداشت مواد غذایی", type: "score", showIf: ["cooking"] },
      { key: "hosting_etiquette_level", label: "ادب، ظاهر مرتب و برخورد مناسب هنگام پذیرایی", type: "score", showIfField: { key: "indoor_activities", oneOf: ["hosting"] } },
      { key: "workplace_protocol_compliance_level", label: "رعایت محرمانگی و پروتکل‌های محیط کاری", type: "score", showIfField: { key: "outdoor_activities", oneOf: ["workplace_cleaning"] } },
      { key: "janitor_reliability_level", label: "مسئولیت‌پذیری، استقلال و پیگیری در سرایداری", type: "score", showIfField: { key: "outdoor_activities", oneOf: ["janitor_family", "janitor_single"] } },
      { key: "villa_independent_responsibility_level", label: "استقلال کاری و مسئولیت‌پذیری در ویلاداری", type: "score", showIfField: { key: "indoor_activities", oneOf: ["villa_cleaning"] } },
    ],
  },
  // مادریار + کودک‌یار (ادغام‌شده). زیرشاخه‌ها: نوزاد / کودک /
  // کمک‌کننده در درس و مشق / کارهای خانه + کودک. مراحل بارداری، زایمان و
  // پس از زایمان زیر «نوزاد» با newborn_stage_preferences پرسیده می‌شوند و
  // فیلدهای وابسته‌شان با showIfField به آن گره خورده‌اند.
  madaryar: {
    form2: [
      // pay_basis moved to the universal WorkPreferences fields.
      // ── نوزاد ──────────────────────────────────────────────────────
      { key: "newborn_stage_preferences", label: "برای همراهی با نوزاد، ترجیح می‌دهید در کدام مرحله حضور داشته باشید؟", type: "multi", choices: NEWBORN_STAGE_PREFERENCE, showIf: ["newborn"] },
      { key: "night_shift_ok", label: "آمادگی برای شیفت شب نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "labor_accompaniment_ok", label: "آمادگی همراهی در زمان زایمان", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["labor"] } },
      { key: "readiness_for_off_hours_presence", label: "آمادگی حضور در ساعات غیراداری", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["labor"] } },
      { key: "preferred_pregnancy_stage", label: "مرحله ترجیحی بارداری برای همراهی", type: "choice", choices: PREGNANCY_STAGE, showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["pregnancy"] } },
      { key: "outside_home_accompaniment_ok", label: "آمادگی همراهی مادر باردار بیرون از منزل", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["pregnancy"] } },
      // ── کودک (سه زیرشاخه‌ی کودک‌محور) ───────────────────────────────
      { key: "accepted_child_age_ranges", label: "بازه سنی کودک قابل پذیرش", type: "multi", choices: CHILD_AGE_RANGE, showIf: CHILD_SUBTYPES },
      { key: "max_children_count", label: "حداکثر تعداد کودک قابل نگهداری هم‌زمان", type: "choice", choices: CHILDREN_COUNT_CAPACITY, showIf: CHILD_SUBTYPES },
      { key: "accepted_child_conditions", label: "ویژگی‌های خاص کودک قابل پذیرش", type: "multi", choices: CHILD_CONDITION, showIf: CHILD_SUBTYPES },
      // pay_basis moved to the universal WorkPreferences fields.
      // کودک + کارهای خانه و کودک — کارهای روزمره‌ی مراقبت از کودک
      // (کمک‌کننده در درس و مشق این کارها را بر عهده ندارد)
      { key: "daily_feeding_ok", label: "آمادگی غذا دادن به کودک", type: "bool", showIf: ["child", "housework_child"] },
      { key: "bathing_child_ok", label: "آمادگی حمام کردن کودک", type: "bool", showIf: ["child", "housework_child"] },
      { key: "dressing_child_ok", label: "آمادگی لباس پوشاندن کودک", type: "bool", showIf: ["child", "housework_child"] },
      { key: "putting_to_sleep_ok", label: "آمادگی خواباندن کودک", type: "bool", showIf: ["child", "housework_child"] },
      { key: "play_and_entertainment_ok", label: "آمادگی بازی و سرگرمی با کودک", type: "bool", showIf: ["child", "housework_child"] },
      { key: "outdoor_outings_ok", label: "آمادگی بردن کودک به پارک یا کلاس", type: "bool", showIf: ["child", "housework_child"] },
      { key: "diaper_changing_ok", label: "آمادگی برای تغییر پوشک", type: "bool", showIf: ["child", "housework_child"] },
      // کمک‌کننده در درس و مشق
      { key: "tutor_role_type", label: "نوع نقش تدریس", type: "choice", choices: TUTOR_ROLE_TYPE, showIf: ["homework_helper"] },
      { key: "tutoring_subjects", label: "دروس قابل تدریس", type: "multi", choices: TUTORING_SUBJECT, showIf: ["homework_helper"] },
      { key: "tutoring_subjects_other_detail", label: "سایر دروس (اگر «سایر» را انتخاب کردید، اینجا بنویسید)", type: "text", showIf: ["homework_helper"] },
      { key: "after_school_pickup_ok", label: "امکان رفتن دنبال کودک از مدرسه", type: "bool", showIf: ["homework_helper"] },
      // کارهای خانه + کودک
      { key: "household_tasks_capable", label: "کارهای خانه قابل انجام در کنار نگهداری کودک", type: "multi", choices: HOUSEHOLD_TASK_FOR_CHILDCARE, showIf: ["housework_child"] },
    ],
    form3: [
      // ── نوزاد ──────────────────────────────────────────────────────
      { key: "breastfeeding_support_training", label: "آموزش حمایت از شیردهی دیده است", type: "bool", showIf: ["newborn"] },
      { key: "newborn_care_experience", label: "سابقه مراقبت از نوزاد", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["newborn"] },
      { key: "weaning_support_experience", label: "تجربه کمک به از شیر/پوشک گرفتن نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "bottle_feeding_ok", label: "آمادگی شیر دادن با شیشه", type: "bool", showIf: ["newborn"] },
      { key: "burping_ok", label: "آمادگی آروغ‌گیری نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "soothing_newborn_ok", label: "آمادگی آرام کردن نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "newborn_bathing_ok", label: "آمادگی حمام نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "night_waking_readiness", label: "آمادگی برای بیدار شدن‌های شبانه مکرر", type: "bool", showIf: ["newborn"] },
      { key: "newborn_cpr_training", label: "دوره CPR نوزاد دیده است", type: "bool", showIf: ["newborn"] },
      { key: "newborn_first_aid_training", label: "دوره کمک‌های اولیه نوزاد دیده است", type: "bool", showIf: ["newborn"] },
      { key: "newborn_care_course", label: "دوره مراقبت از نوزاد گذرانده است", type: "bool", showIf: ["newborn"] },
      // دوران بارداری (ترجیح مرحله در فرم ۲ — showIfField به آن نگاه می‌کند)
      { key: "pregnancy_care_experience", label: "سابقه مراقبت از مادر باردار", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["pregnancy"] } },
      { key: "medical_visit_accompaniment_experience", label: "تجربه همراهی برای مراجعه پزشکی", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["pregnancy"] } },
      { key: "daily_support_experience", label: "تجربه کمک در امور روزمره مادر باردار", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["pregnancy"] } },
      { key: "housework_for_pregnant_mother_experience", label: "تجربه انجام امور منزل برای مادر باردار", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["pregnancy"] } },
      // در شرف زایمان
      { key: "labor_support_experience", label: "سابقه همراهی در زایمان", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["labor"] } },
      { key: "hospital_accompaniment_experience", label: "سابقه همراهی تا بیمارستان و حضور در آن", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["labor"] } },
      { key: "older_sibling_care_during_labor_experience", label: "تجربه مراقبت از فرزند بزرگ‌تر هنگام زایمان مادر", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["labor"] } },
      // پس از زایمان
      { key: "postpartum_care_experience", label: "سابقه مراقبت از مادر پس از زایمان", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["postpartum"] } },
      { key: "natural_birth_recovery_experience", label: "تجربه مراقبت پس از زایمان طبیعی", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["postpartum"] } },
      { key: "csection_recovery_experience", label: "تجربه مراقبت پس از سزارین", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["postpartum"] } },
      { key: "simultaneous_mother_newborn_care_experience", label: "تجربه مراقبت هم‌زمان از مادر و نوزاد", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["postpartum"] } },
      // ── کودک (سه زیرشاخه‌ی کودک‌محور) ───────────────────────────────
      { key: "childcare_experience", label: "سابقه مراقبت از کودک", type: "choice", choices: EXPERIENCE_RANGE, showIf: CHILD_SUBTYPES },
      { key: "preschool_experience", label: "سابقه کار در مهدکودک", type: "choice", choices: EXPERIENCE_RANGE, showIf: CHILD_SUBTYPES },
      { key: "currently_babysitting_elsewhere", label: "هم‌اکنون جای دیگری هم مشغول به کار هستید؟", type: "bool", showIf: CHILD_SUBTYPES },
      { key: "child_cpr_training", label: "آموزش کمک‌های اولیه/CPR کودک دیده است", type: "bool", showIf: CHILD_SUBTYPES },
      { key: "child_related_training_courses", label: "دوره‌های آموزشی مرتبط با کودک گذرانده‌شده", type: "multi", choices: CHILD_RELATED_TRAINING_COURSE, showIf: CHILD_SUBTYPES },
      { key: "child_related_training_courses_other_detail", label: "دوره دیگری هم گذرانده‌اید؟ (اختیاری)", type: "text", showIf: CHILD_SUBTYPES },
      { key: "has_speech_therapy_training", label: "آموزش یا تجربه گفتاردرمانی دارد", type: "bool", showIf: CHILD_SUBTYPES },
      // Separate from "accepted_child_conditions" above (willingness
      // to accept) — this is actual prior experience with each condition.
      { key: "child_special_needs_experience", label: "تجربه کار با کودکان دارای شرایط خاص", type: "multi", choices: CHILD_SPECIAL_NEEDS_EXPERIENCE, showIf: CHILD_SUBTYPES },
      { key: "child_special_needs_experience_other_detail", label: "اگر «سایر» را انتخاب کردید، توضیح دهید", type: "text", showIf: CHILD_SUBTYPES },
      { key: "has_visible_tattoo", label: "تتوی قابل مشاهده دارد", type: "bool", showIf: CHILD_SUBTYPES },
      { key: "has_acrylic_nails", label: "آیا ناخن کاشته‌شده دارید؟", type: "bool", showIf: CHILD_SUBTYPES },
      // کمک‌کننده در درس و مشق
      { key: "tutoring_experience", label: "سابقه تدریس خصوصی", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["homework_helper"] },
      { key: "speaks_without_accent", label: "بدون لهجه صحبت می‌کند", type: "bool", showIf: ["homework_helper"] },
      // کارهای خانه + کودک — کلید weaning_support_experience با فیلد نوزاد
      // یکی بود (در یک سطل ذخیره می‌شوند)، پس این‌جا child_ دارد.
      { key: "child_weaning_support_experience", label: "تجربه کمک به از شیر/پوشک گرفتن کودک", type: "bool", showIf: ["housework_child"] },
      { key: "cooking_skill_level", label: "سطح مهارت آشپزی", type: "choice", choices: COOKING_SKILL_LEVEL, showIf: ["housework_child"] },
      { key: "enjoys_cooking_at_home", label: "به آشپزی در منزل علاقه دارد", type: "bool", showIf: ["housework_child"] },
    ],
    questionnaire: [
      // ── نوزاد ──────────────────────────────────────────────────────
      { key: "gentleness_with_newborn_level", label: "لطافت و دقت در برخورد با نوزاد", type: "score", showIf: ["newborn"] },
      { key: "calmness_under_pressure_level", label: "آرامش در شرایط پراسترس (مثل لحظات زایمان)", type: "score", showIf: ["newborn"] },
      { key: "night_wakefulness_tolerance_level", label: "تحمل بیداری شبانه", type: "score", showIf: ["newborn"] },
      // Asked as the CAREGIVER's own comfort/compatibility with the
      // mother's situation — never a question about the caregiver's
      // own reproductive history.
      { key: "ivf_or_pregnancy_loss_history_compatibility_level", label: "سازگاری با همراهی مادرانی که سابقه IVF یا سقط جنین دارند", type: "score", showIf: ["newborn"] },
      // ── کودک (سه زیرشاخه‌ی کودک‌محور) ───────────────────────────────
      { key: "patience_with_children_level", label: "میزان صبر در برابر شیطنت و بازیگوشی کودک", type: "score", showIf: CHILD_SUBTYPES },
      { key: "creative_engagement_level", label: "توانایی سرگرم‌کردن و بازی کردن با کودک", type: "score", showIf: CHILD_SUBTYPES },
      { key: "kindness_level", label: "مهربانی", type: "score", showIf: CHILD_SUBTYPES },
      { key: "cheerfulness_level", label: "شادابی و سرزندگی", type: "score", showIf: CHILD_SUBTYPES },
      { key: "grooming_level", label: "آراستگی و مرتب بودن ظاهر", type: "score", showIf: CHILD_SUBTYPES },
      { key: "politeness_level", label: "ادب و نحوه برخورد", type: "score", showIf: CHILD_SUBTYPES },
    ],
  },
  parastar: {
    form2: [
      // شماره پروانه نظام پرستاری حالا در فرم ۱ (هویتی) پرسیده می‌شود.
      { key: "shift_rotation_ok", label: "آمادگی برای چرخش شیفت", type: "bool" },
      { key: "can_administer_injections", label: "توانایی تزریقات", type: "bool" },
      { key: "works_alongside_aide_ok", label: "آمادگی همکاری در کنار کمک‌بهیار", type: "bool" },
      { key: "hospital_surgery_accompaniment_ok", label: "آمادگی همراهی در بیمارستان حین عمل جراحی", type: "bool" },
      { key: "averse_hospitals_detail", label: "آیا بیمارستانی هست که قصد رفتن به آن را ندارید؟ (در صورت وجود، نام ببرید)", type: "text" },
      { key: "pre_surgery_shaving_ok", label: "آمادگی انجام اصلاح موی بدن قبل از عمل (شیو)", type: "bool" },
      { key: "special_patient_washing_ok", label: "آمادگی شست‌وشوی خاص بیمار", type: "bool" },
      // مراقبت‌های بیمارستانی و جراحی — همراهی حین عمل از قبل وجود
      // داشت؛ این‌ها مراحل دیگر همون مسیر هستند.
      { key: "ward_companion_ok", label: "آمادگی همراهی بیمار در بخش بیمارستان", type: "bool" },
      { key: "pre_op_care_ok", label: "آمادگی مراقبت قبل از عمل", type: "bool" },
      { key: "post_op_care_ok", label: "آمادگی مراقبت بعد از عمل", type: "bool" },
      { key: "discharge_and_home_transfer_ok", label: "آمادگی همراهی ترخیص و انتقال بیمار به منزل", type: "bool" },
      { key: "physiotherapy_assistance_ability", label: "توانایی کمک در فیزیوتراپی و تمرینات تجویزشده", type: "bool" },
      { key: "dialysis_accompaniment_ability", label: "توانایی همراهی بیمار دیالیزی", type: "bool" },
    ],
    form3: [
      { key: "nursing_degree_level", label: "مقطع تحصیلی پرستاری", type: "choice", choices: NURSING_DEGREE_LEVEL },
      { key: "years_of_clinical_experience", label: "سابقه کار بالینی", type: "choice", choices: EXPERIENCE_RANGE },
      // گروه بیمارانی که تجربه مراقبت از آن‌ها را دارد — جدا از
      // تخصص‌های ICU/زخم بستر/کودکان/مامایی/اورژانس که سابقه
      // اختصاصی خودشان را پایین‌تر دارند.
      { key: "patient_group_experience", label: "گروه بیمارانی که تجربه مراقبت از آن‌ها را دارد", type: "multi", choices: PARASTAR_PATIENT_GROUP },
      { key: "icu_experience", label: "سابقه کار در ICU", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["icu"] },
      { key: "wound_care_experience", label: "سابقه مراقبت از زخم بستر", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["wound_care"] },
      { key: "pediatric_nursing_experience", label: "سابقه پرستاری کودکان", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["pediatric"] },
      { key: "midwifery_experience", label: "سابقه مامایی", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["midwifery"] },
      { key: "emergency_nursing_experience", label: "سابقه کار در اورژانس", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["emergency"] },
      { key: "mother_child_care_abilities", label: "توانایی‌های مراقبت از مادر و کودک", type: "multi", choices: PARASTAR_MOTHER_CHILD_CARE_ABILITY, showIf: ["midwifery", "pediatric"] },
      { key: "patient_condition_experience", label: "تجربه مراقبت از بیماران با شرایط زیر", type: "multi", choices: PARASTAR_CONDITION_EXPERIENCE },
      { key: "clinical_procedures_ability", label: "توانایی انجام اقدامات بالینی زیر", type: "multi", choices: PARASTAR_PROCEDURE_ABILITY },
      { key: "medication_treatment_abilities", label: "توانایی‌های دارویی و درمانی", type: "multi", choices: PARASTAR_MEDICATION_TREATMENT_ABILITY },
      { key: "wound_care_abilities", label: "توانایی‌های زخم و پانسمان", type: "multi", choices: PARASTAR_WOUND_CARE_ABILITY },
      // تجهیزات پزشکی — تقریبی از مقیاس سه‌سطحی سند («بدون تجربه/
      // تجربه دارد/کاملاً مسلط») با دو چک‌لیست مستقل.
      { key: "medical_equipment_experience", label: "تجهیزات پزشکی که با آن‌ها کار کرده است", type: "multi", choices: PARASTAR_EQUIPMENT },
      { key: "medical_equipment_mastery", label: "تجهیزات پزشکی که کاملاً به آن‌ها مسلط است", type: "multi", choices: PARASTAR_EQUIPMENT },
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
      { key: "averse_hospitals_detail", label: "آیا بیمارستانی هست که قصد رفتن به آن را ندارید؟ (در صورت وجود، نام ببرید)", type: "text" },
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
