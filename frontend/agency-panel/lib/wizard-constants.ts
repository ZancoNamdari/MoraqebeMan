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

// زیرشاخه‌هایی که سوالاتشان باکس جداگانه می‌گیرد (به‌جای یک باکس مشترک
// برای کل نقش). ترتیب مهم است: سوالی که مشترک بین چند زیرشاخه است در
// اولین زیرشاخه‌ی انتخاب‌شده از این فهرست می‌آید.
export const SPLIT_SUBTYPE_BOXES: Record<string, Choice[]> = {
  nezafatchi: [["cooking", "آشپزی"]],
  madaryar: MADARYAR_SUBTYPE,
}

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

export const NATIONALITY_COUNTRY: Choice[] = [
  ["afghanistan", "افغانستان"],
  ["pakistan", "پاکستان"],
  ["iraq", "عراق"],
  ["syria", "سوریه"],
  ["lebanon", "لبنان"],
  ["turkmenistan", "ترکمنستان"],
  ["azerbaijan", "آذربایجان"],
  ["tajikistan", "تاجیکستان"],
  ["turkey", "ترکیه"],
  ["other", "سایر"],
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
  ["arab", "عرب"],
  ["turkmen", "ترکمن"],
  ["talesh", "تالشی"],
  ["armenian", "ارمنی"],
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
  armenian: [
    ["tehran", "ارمنی‌های تهران"],
    ["isfahan", "ارمنی‌های اصفهان"],
    ["azerbaijan", "ارمنی‌های آذربایجان"],
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

// نوع همکاری — برای همه‌ی نقش‌ها یکسان، دو سطح:
//   بلندمدت ⇒ شبانه‌روزی / روزانه / شبانه / ماهانه
//   کوتاه‌مدت (مقطعی) ⇒ ساعتی / بیمارستان / شیفتی
// کلید گروه و زیرگروه هر دو در collaboration_types ذخیره می‌شوند؛ روز/ساعت هر
// زیرگروه در collaboration_schedule (هم‌گام با backend: choices.CollaborationMode).
export const COLLABORATION_GROUP: Choice[] = [
  ["long_term", "بلندمدت"],
  ["short_term", "کوتاه‌مدت (مقطعی)"],
]
export const COLLABORATION_LONG_TERM: Choice[] = [
  ["live_in", "شبانه‌روزی (مقیم)"],
  ["daily", "روزانه"],
  ["night", "شبانه"],
  ["monthly", "ماهانه"],
]
export const COLLABORATION_SHORT_TERM: Choice[] = [
  ["hourly", "ساعتی"],
  ["hospital_companion", "بیمارستان"],
  ["shift", "شیفتی"],
]
// برای نمایش برچسب‌ها (پروفایل / بررسی)
export const COLLABORATION_TYPE: Choice[] = [
  ...COLLABORATION_GROUP, ...COLLABORATION_LONG_TERM, ...COLLABORATION_SHORT_TERM,
]
// زیرگروه‌هایی که «روز + بازه‌ی ساعت» می‌پرسند؛ shift «روز + شیفت»؛ monthly «تاریخ مدنظر».
export const COLLABORATION_DAYS_HOURS = ["daily", "night", "hourly", "hospital_companion"]

// بازه‌ی حقوق درخواستی (ماهانه) — هم‌گام با backend: RequestedSalaryRange.
export const REQUESTED_SALARY_RANGE: Choice[] = [
  ["under_10", "تا ۱۰ میلیون تومان"],
  ["10_15", "۱۰ تا ۱۵ میلیون تومان"],
  ["15_20", "۱۵ تا ۲۰ میلیون تومان"],
  ["20_25", "۲۰ تا ۲۵ میلیون تومان"],
  ["25_30", "۲۵ تا ۳۰ میلیون تومان"],
  ["30_40", "۳۰ تا ۴۰ میلیون تومان"],
  ["over_40", "بیش از ۴۰ میلیون تومان"],
  ["negotiable", "توافقی"],
]

export const WORK_STATUS: Choice[] = [
  ["full_time", "تمام‌وقت"],
  ["part_time", "پاره‌وقت"],
  ["both", "هر دو مورد"],
]

export const FAMILY_PRESENCE_PREFERENCE: Choice[] = [
  ["prefer_present", "ترجیح می‌دهم عضوی از خانواده در منزل حضور داشته باشد"],
  ["prefer_absent", "ترجیح می‌دهم خانواده در ساعات کاری خارج از منزل باشند"],
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
  ["personal_care", "کمک در طهارت و انجام امور شخصی"],
  ["all", "همه موارد"],
]

// فقط این ۳ خدمت در فرم ثبت سالمندیار انتخاب می‌شود؛ OFFERED_SERVICE کامل
// برای نمایش برچسب مقادیر قدیمی نگه داشته شده است.
export const OFFERED_SERVICE_PICK: Choice[] = [
  ["mobility_help", "کمک در جابجایی سالمند"],
  ["light_cleaning", "نظافت محیط سالمند"],
  ["personal_care", "کمک در طهارت و انجام امور شخصی"],
]

export const MOBILITY_ASSIST_LEVEL: Choice[] = [
  ["walking_support", "همراهی و کمک در راه رفتن (با عصا یا واکر)"],
  ["bed_chair_transfer", "جابجایی از تخت به صندلی یا ویلچر"],
  ["full_transfer", "جابجایی کامل سالمند بستری یا سنگین‌وزن"],
]

export const CLEANING_LEVEL_PICK: Choice[] = [
  ["light", "نظافت سبک (گردگیری، مرتب کردن، نظافت اتاق سالمند)"],
  ["heavy", "نظافت سنگین (شست‌وشوی کامل، حمام، آشپزخانه)"],
]

export const ACCEPTED_PHYSICAL_CONDITION_PICK: Choice[] = [
  ["limited_mobility_bedridden", "سالمند دارای محدودیت حرکتی"],
  ["bedridden_diaper", "سالمند پوشکی"],
  ["alzheimers", "سالمند مبتلا به آلزایمر"],
  ["hospital_companion_needed", "سالمند نیازمند همراهی بیمارستانی"],
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
  // صفت شخصیتی که این سوال موقعیتی می‌سنجد (برای تحلیل بعدی).
  trait?: string
  // Only rendered once another field in the SAME service_specific_answers
  // bucket (identified by `key`) currently holds one of `oneOf` — a
  // scalar value is matched directly, an array value (e.g. a multi
  // field like indoor_activities) is matched by intersection. Lets a
  // field depend on an activity checkbox instead of a top-level
  // subtype (which showIf is limited to).
  showIfField?: { key: string; oneOf: string[] }
  // "env" ⇒ در باکس «شرایط محیط کار — مخصوص <نقش>» فرم ۲ نمایش داده می‌شود،
  // نه در «سوالات مخصوص <نقش>».
  group?: "env"
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

const CLEANING_STANDARD_LEVEL: Choice[] = [
  ["light", "نظافت سطحی و روزمره (گردگیری، جمع و جور کردن)"],
  ["standard", "نظافت کامل (حمام، آشپزخانه، شیشه‌ها)"],
  ["deep", "نظافت عمقی و تخصصی (شستشوی موکت/مبل، ضدعفونی کامل)"],
]

const COOKING_CUISINE: Choice[] = [
  ["iranian", "غذای ایرانی"],
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


// ── فرم ۳ کودک‌یار: تحصیلات، مهارت‌ها و ویژگی‌های جانبی ─────────────────
const CHILD_EDUCATION_FIELD: Choice[] = [
  ["early_childhood", "آموزش و پرورش پیش‌دبستانی / خردسالان"],
  ["elementary_education", "آموزش ابتدایی"],
  ["child_psychology", "روانشناسی کودک"],
  ["special_education", "آموزش و توانبخشی کودکان استثنایی"],
  ["child_nursing_health", "پرستاری یا بهداشت کودک"],
  ["other", "سایر رشته‌های مرتبط با کودک"],
]

const CHILD_EDUCATION_LEVEL: Choice[] = [
  ["diploma", "دیپلم یا کاردانی"],
  ["bachelor", "کارشناسی (یا دانشجوی کارشناسی)"],
  ["master_plus", "کارشناسی ارشد و بالاتر"],
]

const PSYCHOLOGY_EDUCATION_LEVEL: Choice[] = [
  ["none", "ندارم"],
  ["short_course", "دوره یا کارگاه کوتاه‌مدت"],
  ["student", "دانشجوی روانشناسی"],
  ["bachelor", "کارشناسی روانشناسی"],
  ["master_plus", "کارشناسی ارشد یا دکتری روانشناسی"],
]

const CRAFTS_WITH_CHILDREN_EXPERIENCE: Choice[] = [
  ["none", "ندارم"],
  ["occasionally", "گاهی با کودکان کاردستی ساخته‌ام"],
  ["regularly", "به‌طور منظم با کودکان کاردستی می‌سازم"],
  ["professional", "به‌صورت حرفه‌ای (کلاس یا مربیگری)"],
]

const CHILD_ENTERTAINMENT_METHOD: Choice[] = [
  ["storytelling", "قصه‌گویی و نمایش"],
  ["music_instrument", "نواختن ساز یا آموزش موسیقی"],
  ["singing", "آواز و ریتم‌بازی"],
  ["painting", "نقاشی و رنگ‌آمیزی"],
  ["sports_games", "ورزش و بازی‌های حرکتی"],
  ["board_puzzle_games", "بازی‌های فکری، پازل و لگو"],
  ["robotics_computer", "رباتیک یا کار با رایانه"],
  ["outdoor_play", "بازی در پارک و فضای باز"],
  ["other", "سایر"],
]

const VALUED_EXTRA_QUALITY: Choice[] = [
  ["artistic", "هنرمند (نقاشی، موسیقی، نمایش و...)"],
  ["well_read", "با سواد و اهل مطالعه"],
  ["crafts", "آشنا به کاردستی و ساخت‌وساز"],
  ["good_taste", "خوش‌سلیقه"],
]

// ── فرم ۳ نوزادیار ───────────────────────────────────────────────────
const MULTIPLES_NEWBORN_EXPERIENCE: Choice[] = [
  ["none", "ندارم"],
  ["twins", "دوقلو"],
  ["triplets_plus", "سه‌قلو یا بیشتر"],
]

const MIDWIFERY_DEGREE: Choice[] = [
  ["none", "ندارم"],
  ["student", "دانشجوی مامایی"],
  ["associate", "کاردانی مامایی"],
  ["bachelor", "کارشناسی مامایی"],
  ["master_plus", "کارشناسی ارشد مامایی و بالاتر"],
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
      { key: "toileting_hygiene_assistance_ok", label: "آمادگی برای کمک در طهارت و نظافت فردی سالمند", type: "bool" },
      // همدمی — فقط به معنای هم‌صحبتی و همراهی روحی/عاطفی در چارچوب
      // کار مراقبتی؛ صریح و شفاف پرسیده می‌شود.
      { key: "emotional_companionship_ok", label: "آمادگی برای همدمی و هم‌صحبتی با سالمند (گفتگو، همراهی در اوقات فراغت، حضور عاطفی در چارچوب کار مراقبتی)", type: "bool" },
      // شرایط محیط کار مخصوص سالمندیار — «آیا مشکلی دارید؟» (true = مشکل دارد).
      { key: "env_own_rest_space_needed", label: "برای کار شبانه، به اتاق/محل استراحت جداگانه نیاز دارم", type: "bool", group: "env" },
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
      // ── سوال‌های موقعیتی (غیرمستقیم) سالمندیار — در بخش آخرِ پرسشنامه. صفت‌ها مستقیم پرسیده نمی‌شوند،
      // همه‌ی گزینه‌ها درست و حرفه‌اند (سبک متفاوت). مقدارها a/b/c؛ اثر هر گزینه روی پارامترها در lib/trait-model-salmandyar.ts.
      { key: "scenario_emp_1", label: "سالمند از دوری فرزندانش دلتنگ است و گریه می‌کند. چه می‌کنید؟", type: "choice", choices: [["a", "کنارش می‌نشینم و با دقت گوش می‌دهم تا دلش سبک شود"], ["b", "از خاطرات خوش او می‌پرسم تا حالش بهتر شود"], ["c", "با فرزندانش تماس تلفنی یا تصویری ترتیب می‌دهم"]], trait: "empathy" },
      { key: "scenario_emp_2", label: "سالمند می‌گوید «دیگر به درد هیچ‌کس نمی‌خورم». چه می‌کنید؟", type: "choice", choices: [["a", "به ارزش و تجربه‌هایش اشاره می‌کنم"], ["b", "از او می‌خواهم یکی از تجربه‌هایش را به من یاد بدهد"], ["c", "کار ساده‌ای را با هم انجام می‌دهیم تا احساس مفید بودن کند"]], trait: "empathy" },
      { key: "scenario_emp_3", label: "سالمند بعد از یک سقوط خفیف خجالت‌زده است. چه می‌کنید؟", type: "choice", choices: [["a", "آرام بررسی‌اش می‌کنم و می‌گویم اتفاق عادی است"], ["b", "بی‌سروصدا کمک می‌کنم و بعد با خانواده هماهنگ می‌کنم"], ["c", "در خلوت علت را با هم بررسی می‌کنیم تا تکرار نشود"]], trait: "empathy" },
      { key: "scenario_dig_1", label: "سالمند می‌خواهد خودش لباس بپوشد، اما کند است و وقت‌تان تنگ است. چه می‌کنید؟", type: "choice", choices: [["a", "صبر می‌کنم و فقط در بخش‌های دشوار کمک می‌کنم"], ["b", "لباس‌ها را طوری آماده می‌کنم که خودش راحت بپوشد"], ["c", "از او می‌پرسم چقدر کمک بخواهد"]], trait: "dignity" },
      { key: "scenario_dig_2", label: "برای کمک در حمام یا امور شخصی سالمند چه می‌کنید؟", type: "choice", choices: [["a", "قبل از شروع توضیح می‌دهم چه می‌کنم و اجازه می‌گیرم"], ["b", "حریم او را با پوشش مناسب و بستن در رعایت می‌کنم"], ["c", "هر کاری را که خودش می‌تواند انجام دهد به خودش می‌سپارم"]], trait: "dignity" },
      { key: "scenario_dig_3", label: "سالمند دوست دارد غذا را به روش خودش بخورد، حتی اگر کمی بریزد. چه می‌کنید؟", type: "choice", choices: [["a", "اجازه می‌دهم و اطراف را برای تمیزی آماده می‌کنم"], ["b", "ظرف و قاشق مناسب و سبک برایش فراهم می‌کنم"], ["c", "کنارش می‌مانم و فقط در صورت نیاز کمک می‌کنم"]], trait: "dignity" },
      { key: "scenario_pat_1", label: "سالمند برای بار پنجم همان سوال را می‌پرسد. چه می‌کنید؟", type: "choice", choices: [["a", "با همان لحن آرام دوباره جواب می‌دهم"], ["b", "یک یادداشت یا تقویم کوچک برایش می‌گذارم"], ["c", "سوال را به یک گفتگوی دلنشین درباره‌ی همان موضوع تبدیل می‌کنم"]], trait: "patience" },
      { key: "scenario_pat_2", label: "سالمند عصرها بی‌قرار می‌شود و مدام می‌خواهد جایی برود. چه می‌کنید؟", type: "choice", choices: [["a", "با او قدم می‌زنم و صحبت می‌کنم"], ["b", "محیط را آرام می‌کنم (نور کم، موسیقی ملایم)"], ["c", "او را به یک کار آشنا و دلپذیر مشغول می‌کنم"]], trait: "patience" },
      { key: "scenario_pat_3", label: "سالمند غذا خوردن را بسیار آهسته انجام می‌دهد. چه می‌کنید؟", type: "choice", choices: [["a", "بدون عجله کنارش می‌مانم"], ["b", "در همین فاصله گفتگوی دلنشینی را شروع می‌کنم"], ["c", "محیط را آرام می‌کنم تا راحت غذا بخورد"]], trait: "patience" },
      { key: "scenario_calm_1", label: "سالمند ناگهان رنگ‌پریده می‌شود و سرگیجه دارد. چه می‌کنید؟", type: "choice", choices: [["a", "او را می‌نشانم یا می‌خوابانم، علائم را بررسی می‌کنم و تماس لازم را می‌گیرم"], ["b", "آرام او را نگه می‌دارم و همزمان از دیگران کمک می‌خواهم"], ["c", "طبق دستور مراقبتی که از پزشک یا خانواده دارم عمل می‌کنم"]], trait: "calmness" },
      { key: "scenario_calm_2", label: "سالمند هنگام غذا خوردن دچار سرفه‌ی شدید و گیر کردن غذا می‌شود. چه می‌کنید؟", type: "choice", choices: [["a", "طبق آموزش کمک‌های اولیه عمل می‌کنم و با اورژانس تماس می‌گیرم"], ["b", "آرام و قاطع او را حمایت می‌کنم و کمک می‌خواهم"], ["c", "ابتدا مطمئن می‌شوم راه تنفسش باز است و بعد کمک می‌گیرم"]], trait: "calmness" },
      { key: "scenario_calm_3", label: "برق می‌رود یا آب از جایی نشت می‌کند و سالمند مضطرب است. چه می‌کنید؟", type: "choice", choices: [["a", "اول سالمند را آرام می‌کنم و در جای امن می‌نشانم"], ["b", "مشکل را کنترل می‌کنم و همزمان به او توضیح می‌دهم"], ["c", "به خانواده خبر می‌دهم و راه‌حل موقتی پیدا می‌کنم"]], trait: "calmness" },
      { key: "scenario_att_1", label: "متوجه می‌شوید سالمند امروز کمتر از همیشه غذا خورده است. چه می‌کنید؟", type: "choice", choices: [["a", "یادداشت می‌کنم و علتش را از خودش می‌پرسم"], ["b", "به خانواده یا پرستار اطلاع می‌دهم"], ["c", "در وعده‌ی بعد با غذای موردعلاقه‌اش امتحان می‌کنم"]], trait: "attentiveness" },
      { key: "scenario_att_2", label: "کبودی یا قرمزی جدیدی روی پوست سالمند می‌بینید. چه می‌کنید؟", type: "choice", choices: [["a", "بررسی و ثبت می‌کنم و به خانواده اطلاع می‌دهم"], ["b", "از او می‌پرسم دردی دارد یا نه"], ["c", "فشار روی آن ناحیه را کم می‌کنم و موضوع را اطلاع می‌دهم"]], trait: "attentiveness" },
      { key: "scenario_att_3", label: "موقع دادن قرص‌ها متوجه می‌شوید ظاهر یکی از آن‌ها با همیشه فرق دارد. چه می‌کنید؟", type: "choice", choices: [["a", "قبل از دادن از خانواده یا داروساز می‌پرسم"], ["b", "با برچسب و برنامه‌ی دارویی دوباره تطبیق می‌دهم"], ["c", "آن را کنار می‌گذارم و موضوع را گزارش می‌کنم"]], trait: "attentiveness" },
      { key: "scenario_adh_1", label: "سالمند از خوردن دارو سر باز می‌زند. چه می‌کنید؟", type: "choice", choices: [["a", "دلیلش را می‌پرسم و با توضیح قانعش می‌کنم"], ["b", "زمان یا روش دیگری (در حد مجاز) پیشنهاد می‌دهم"], ["c", "با مهربانی ولی روشن می‌گویم لازم است و در صورت اصرار به خانواده خبر می‌دهم"]], trait: "adherence" },
      { key: "scenario_adh_2", label: "سالمند رژیم غذایی تجویز شده (مثلاً کم‌نمک) را رعایت نمی‌کند و غذای ممنوع می‌خواهد. چه می‌کنید؟", type: "choice", choices: [["a", "مقدار کم یا جایگزین مجاز پیشنهاد می‌کنم"], ["b", "با احترام توضیح می‌دهم چرا ممنوع است"], ["c", "موضوع را با خانواده یا پزشک هماهنگ می‌کنم"]], trait: "adherence" },
      { key: "scenario_firm_1", label: "خانواده دستوری می‌دهند که به نظر شما با شرایط سالمند همخوانی ندارد. چه می‌کنید؟", type: "choice", choices: [["a", "محترمانه نگرانی‌ام را می‌گویم و راهنمایی می‌خواهم"], ["b", "پیشنهاد می‌کنم با پزشک مشورت کنیم"], ["c", "تا روشن شدن موضوع، رویه‌ی ایمن‌تر را اجرا می‌کنم و اطلاع می‌دهم"]], trait: "firmness" },
      { key: "scenario_firm_2", label: "سالمند اصرار دارد در هوای سرد بدون لباس گرم بیرون برود. چه می‌کنید؟", type: "choice", choices: [["a", "با مهربانی ولی روشن می‌گویم برای سلامتش لازم است لباس بپوشد"], ["b", "یک گزینه‌ی دیگر (لباس سبک ولی گرم) پیشنهاد می‌کنم"], ["c", "همراهش می‌روم و مدت بیرون ماندن را کوتاه نگه می‌دارم"]], trait: "firmness" },
      { key: "scenario_comp_1", label: "عصر می‌خواهید سالمند را سرگرم کنید. چه پیشنهاد می‌دهید؟", type: "choice", choices: [["a", "درباره‌ی خاطرات و عکس‌های قدیمی صحبت می‌کنیم"], ["b", "بازی یا کتاب و روزنامه‌خوانی می‌کنیم"], ["c", "در حیاط یا بیرون قدم می‌زنیم"]], trait: "companionship" },
      { key: "scenario_comp_2", label: "سالمند میل به گفتگو ندارد و ساکت است. چه می‌کنید؟", type: "choice", choices: [["a", "کنارش می‌نشینم بدون اصرار"], ["b", "کار آرامی را با هم انجام می‌دهیم (مثلاً چای یا مرتب کردن)"], ["c", "آهنگ یا برنامه‌ی موردعلاقه‌اش را می‌گذارم"]], trait: "companionship" },
      { key: "scenario_hyg_1", label: "قبل و بعد از مراقبت از سالمند، برای بهداشت خودتان چه می‌کنید؟", type: "choice", choices: [["a", "دست‌هایم را قبل و بعد از هر مراقبت کامل می‌شویم"], ["b", "در صورت نیاز از دستکش و ضدعفونی‌کننده استفاده می‌کنم"], ["c", "وسایل مراقبتی او را جدا نگه می‌دارم و تمیز می‌کنم"]], trait: "hygiene" },
      { key: "scenario_hyg_2", label: "ملحفه یا لباس سالمند خیس یا کثیف شده است. چه می‌کنید؟", type: "choice", choices: [["a", "سریع و با رعایت حریم او تعویض می‌کنم"], ["b", "پوست را تمیز و خشک می‌کنم و مراقب سلامت پوستش هستم"], ["c", "وسایل را جدا و با روش درست ضدعفونی می‌کنم"]], trait: "hygiene" },
      { key: "scenario_inc_1", label: "سالمند متوجه نشده که لباسش بر اثر ریزش ادرار خیس شده است. چه می‌کنید؟", type: "choice", choices: [["a", "بدون هیچ شرمندگی و با لحن عادی کمک می‌کنم لباسش را عوض کند"], ["b", "حریم او را حفظ می‌کنم، سریع تعویض می‌کنم و پوست را تمیز و خشک می‌کنم"], ["c", "بعد از تعویض، درباره‌ی ریزش ادرار با خانواده یا پرستار مشورت می‌کنم تا راه‌حل مناسبی پیدا شود"]], trait: "dignity" },
      { key: "scenario_inc_2", label: "سالمند دچار اجابت مزاج غیرارادی شده و خجالت‌زده است. چه می‌کنید؟", type: "choice", choices: [["a", "آرام و بدون قضاوت اطمینان می‌دهم که اتفاق عادی است و کمک می‌کنم"], ["b", "با دستکش و روش بهداشتی، ناحیه را تمیز و ضدعفونی می‌کنم و از پوست مراقبت می‌کنم"], ["c", "خونسردی خودم را حفظ می‌کنم و بدون جلب توجه دیگران کار را انجام می‌دهم"]], trait: "dignity" },
      { key: "scenario_inc_3", label: "سالمند از ترس اینکه به دستشویی نرسد، از نوشیدن آب خودداری می‌کند. چه می‌کنید؟", type: "choice", choices: [["a", "درباره‌ی ترسش صحبت می‌کنم و ساعت‌های منظم دستشویی را با هم تنظیم می‌کنیم"], ["b", "مسیر دستشویی را ایمن و نزدیک نگه می‌دارم و هر وقت لازم بود همراهش می‌روم"], ["c", "اهمیت نوشیدن آب را آرام توضیح می‌دهم و با خانواده یا پزشک هماهنگ می‌کنم"]], trait: "dignity" },
      { key: "scenario_inc_4", label: "سالمند می‌گوید «خودم می‌توانم» و اجازه نمی‌دهد در امور بهداشتی و تعویض لباس کمکش کنید. چه می‌کنید؟", type: "choice", choices: [["a", "با احترام توضیح می‌دهم و فقط در حدی که قبول کند کمک می‌کنم"], ["b", "اجازه می‌دهم خودش اقدام کند، کنارش آماده می‌مانم و بعد مرتب می‌کنم"], ["c", "با خانواده یا پرستار مشورت می‌کنم تا روش قابل‌قبولی پیدا شود"]], trait: "dignity" },
      { key: "scenario_inc_5", label: "بعد از تعویض پوشک بزرگسال، پوست ناحیه‌ی لگن سالمند قرمز و تحریک‌شده است. چه می‌کنید؟", type: "choice", choices: [["a", "پوست را تمیز و خشک می‌کنم و کرم محافظ را طبق دستور می‌زنم"], ["b", "ناحیه را بررسی و ثبت می‌کنم و به خانواده یا پزشک گزارش می‌دهم"], ["c", "دفعات تعویض را بیشتر می‌کنم و اجازه می‌دهم پوست هوا بخورد"]], trait: "hygiene" },
      { key: "scenario_resp_1", label: "پایان شیفت است و متوجه می‌شوید یکی از کارهای مراقبتی ناتمام مانده. چه می‌کنید؟", type: "choice", choices: [["a", "همان لحظه جبران می‌کنم و خبر می‌دهم"], ["b", "با نفر بعدی یا خانواده دقیق هماهنگ می‌کنم"], ["c", "در گزارش پایان شیفت ثبت و پیگیری می‌کنم"]], trait: "responsibility" },
      { key: "scenario_resp_2", label: "سالمند می‌خواهد تنها از پله پایین برود. چه می‌کنید؟", type: "choice", choices: [["a", "توضیح می‌دهم و همراهش می‌روم"], ["b", "دستگیره یا وسیله‌ی کمکی پیشنهاد می‌کنم"], ["c", "کنارش می‌مانم و مسیر ایمن را نشان می‌دهم"]], trait: "responsibility" },
      { key: "scenario_trust_1", label: "سالمند مقداری پول یا جواهر را در دسترس می‌گذارد و فراموش می‌کند. چه می‌کنید؟", type: "choice", choices: [["a", "به او یادآوری می‌کنم و در جای امنش می‌گذارم"], ["b", "موضوع را به خانواده گزارش می‌دهم"], ["c", "از قبل با خانواده درباره‌ی قاعده‌ی نگهداری آن هماهنگ می‌کنم"]], trait: "trustworthiness" },
      { key: "scenario_trust_2", label: "سالمند از شما می‌خواهد درباره‌ی بیماری‌اش به کسی چیزی نگویید. چه می‌کنید؟", type: "choice", choices: [["a", "توضیح می‌دهم چه چیزهایی برای ایمنی باید به پزشک یا خانواده گفته شود"], ["b", "محرمانگی بقیه‌ی اطلاعات را رعایت می‌کنم"], ["c", "با او توافق می‌کنم که فقط اطلاعات لازم منتقل شود"]], trait: "trustworthiness" },
      { key: "scenario_comm_1", label: "فرزند سالمند تلفنی از وضعیت او می‌پرسد. چه می‌کنید؟", type: "choice", choices: [["a", "گزارش کوتاه، صادقانه و منظم می‌دهم"], ["b", "با نکات مثبت شروع می‌کنم و بعد نگرانی‌ها را می‌گویم"], ["c", "می‌پرسم کدام جزئیات برایشان مهم‌تر است"]], trait: "communication" },
      { key: "scenario_comm_2", label: "پزشک هنگام ویزیت سوالی درباره‌ی وضعیت چند روز اخیر سالمند می‌پرسد. چه می‌کنید؟", type: "choice", choices: [["a", "از دفتر یادداشت روزانه پاسخ می‌دهم"], ["b", "آنچه خودم دیده‌ام را دقیق و بی‌کم‌وکاست می‌گویم"], ["c", "اگر مطمئن نیستم صادقانه می‌گویم و پیگیری می‌کنم"]], trait: "communication" },
      { key: "scenario_punc_1", label: "شیفت شما ساعت ۷ صبح شروع می‌شود و مسیر ممکن است شلوغ باشد. معمولاً چه می‌کنید؟", type: "choice", choices: [["a", "زودتر از زمان لازم حرکت می‌کنم"], ["b", "شب قبل مسیر را بررسی می‌کنم"], ["c", "اگر احتمال تأخیر باشد، همان لحظه خبر می‌دهم"]], trait: "punctuality" },
      { key: "scenario_punc_2", label: "زمان دارو یا غذای سالمند نزدیک است و او مشغول کار دیگری است. چه می‌کنید؟", type: "choice", choices: [["a", "برای زمان دارو یادآور یا ساعت تنظیم می‌کنم"], ["b", "کارها را طوری می‌چینم که دارو سر وقت داده شود"], ["c", "اگر ناچار جابه‌جا شود، با خانواده یا طبق دستور پزشک هماهنگ می‌کنم"]], trait: "punctuality" },
      { key: "scenario_adapt_1", label: "سالمند امروز حال و حوصله‌ی برنامه‌ی معمول را ندارد. چه می‌کنید؟", type: "choice", choices: [["a", "برنامه را سبک‌تر می‌کنم"], ["b", "فعالیت جایگزینی پیشنهاد می‌دهم"], ["c", "کارهای ضروری را انجام می‌دهم و بقیه را به بعد می‌سپارم"]], trait: "adaptability" },
      { key: "scenario_adapt_2", label: "خانواده برنامه‌ی مراقبت را تغییر می‌دهند. چه می‌کنید؟", type: "choice", choices: [["a", "با آرامش برنامه‌ی جدید را می‌پذیرم و یاد می‌گیرم"], ["b", "جزئیات تغییر را می‌پرسم و با روش خودم هماهنگ می‌کنم"], ["c", "سالمند را هم از تغییر آگاه و آماده می‌کنم"]], trait: "adaptability" },
      { key: "scenario_res_1", label: "شب سختی بوده و سالمند چند بار بیدار شده است. صبح چه می‌کنید؟", type: "choice", choices: [["a", "یک استراحت کوتاه برنامه‌ریزی می‌کنم و ادامه می‌دهم"], ["b", "آرامش خودم را حفظ می‌کنم و در صورت امکان کمک می‌گیرم"], ["c", "کارهای سنگین‌تر را در ساعات پرانرژی‌تر انجام می‌دهم"]], trait: "resilience" },
      { key: "scenario_res_2", label: "جابه‌جایی سالمند سنگین است و شما خسته‌اید. چه می‌کنید؟", type: "choice", choices: [["a", "از وسیله‌ی کمکی و روش صحیح بلند کردن استفاده می‌کنم"], ["b", "از دیگران کمک می‌گیرم"], ["c", "کار را مرحله‌به‌مرحله و با استراحت انجام می‌دهم"]], trait: "resilience" },
      { key: "scenario_punc_3", label: "سالمند به ساعت مشخصی برای بیدار شدن و صبحانه عادت دارد. چه می‌کنید؟", type: "choice", choices: [["a", "زمان بیدارباش و صبحانه را دقیق رعایت می‌کنم"], ["b", "از شب قبل کارها را آماده می‌کنم تا صبح سر وقت باشد"], ["c", "اگر شرایط خاصی بود با خانواده هماهنگ می‌کنم"]], trait: "punctuality" },
      { key: "scenario_res_3", label: "چند روز پشت‌سر هم شیفت سنگین داشته‌اید و خسته‌اید. چه می‌کنید؟", type: "choice", choices: [["a", "برای استراحت و تغذیه برنامه می‌چینم تا بتوانم ادامه دهم"], ["b", "درباره‌ی تقسیم کار با آژانس یا خانواده صحبت می‌کنم"], ["c", "روی کارهای مهم تمرکز می‌کنم و کارهای کم‌اهمیت را عقب می‌اندازم"]], trait: "resilience" },
    ],
  },
  nezafatchi: {
    form2: [
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
      { key: "newborn_stage_preferences", label: "برای همراهی با مادر نوزاد، ترجیح می‌دهید در کدام مرحله حضور داشته باشید؟", type: "multi", choices: NEWBORN_STAGE_PREFERENCE, showIf: ["newborn"] },
      { key: "night_shift_ok", label: "آمادگی برای شیفت شب نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "labor_accompaniment_ok", label: "آمادگی همراهی در زمان زایمان", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["labor"] } },
      { key: "readiness_for_off_hours_presence", label: "آمادگی حضور در ساعات غیراداری", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["labor"] } },
      { key: "preferred_pregnancy_stage", label: "مرحله ترجیحی بارداری برای همراهی", type: "choice", choices: PREGNANCY_STAGE, showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["pregnancy"] } },
      { key: "outside_home_accompaniment_ok", label: "آمادگی همراهی مادر باردار بیرون از منزل", type: "bool", showIf: ["newborn"], showIfField: { key: "newborn_stage_preferences", oneOf: ["pregnancy"] } },
      // ── کودک (سه زیرشاخه‌ی کودک‌محور) ───────────────────────────────
      { key: "accepted_child_age_ranges", label: "بازه سنی کودک قابل پذیرش", type: "multi", choices: CHILD_AGE_RANGE, showIf: CHILD_SUBTYPES },
      { key: "max_children_count", label: "حداکثر تعداد کودک قابل نگهداری هم‌زمان", type: "choice", choices: CHILDREN_COUNT_CAPACITY, showIf: CHILD_SUBTYPES },
      { key: "multiples_care_ok", label: "آیا مشکلی با مراقبت از ۲ یا چند قلو ندارید؟", type: "bool", showIf: CHILD_SUBTYPES, showIfField: { key: "max_children_count", oneOf: ["two", "three_plus"] } },
      { key: "accepted_child_conditions", label: "ویژگی‌های خاص کودک قابل پذیرش", type: "multi", choices: CHILD_CONDITION, showIf: CHILD_SUBTYPES },
      // pay_basis moved to the universal WorkPreferences fields.
      // کودک + کارهای خانه و کودک — کارهای روزمره‌ی مراقبت از کودک
      // (کمک‌کننده در درس و مشق این کارها را بر عهده ندارد)
      { key: "daily_feeding_ok", label: "آمادگی غذا دادن به کودک", type: "bool", showIf: ["child", "housework_child"] },
      { key: "bathing_child_ok", label: "آمادگی حمام کردن کودک", type: "bool", showIf: ["child", "housework_child"] },
      { key: "putting_to_sleep_ok", label: "آمادگی خواباندن کودک", type: "bool", showIf: ["child", "housework_child"] },
      { key: "play_and_entertainment_ok", label: "آمادگی بازی و سرگرمی با کودک", type: "bool", showIf: ["child", "housework_child"] },
      { key: "outdoor_outings_ok", label: "آمادگی بردن کودک به پارک یا کلاس", type: "bool", showIf: ["child", "housework_child"] },
      { key: "diaper_changing_ok", label: "آمادگی برای تغییر پوشک", type: "bool", showIf: ["child", "housework_child"] },
      // کمک‌کننده در درس و مشق
      { key: "tutor_role_type", label: "نوع نقش تدریس", type: "choice", choices: TUTOR_ROLE_TYPE, showIf: ["homework_helper"] },
      { key: "tutoring_subjects", label: "دروس قابل تدریس", type: "multi", choices: TUTORING_SUBJECT, showIf: ["homework_helper"] },
      { key: "tutoring_levels", label: "مقطع قابل تدریس", type: "multi", choices: [["primary", "ابتدایی"], ["secondary", "متوسطه"]], showIf: ["homework_helper"] },
      { key: "tutoring_subjects_other_detail", label: "سایر دروس (اگر «سایر» را انتخاب کردید، اینجا بنویسید)", type: "text", showIf: ["homework_helper"] },
      { key: "after_school_pickup_ok", label: "امکان رفتن دنبال کودک از مدرسه", type: "bool", showIf: ["homework_helper"] },
      // کارهای خانه + کودک
      { key: "household_tasks_capable", label: "کارهای خانه قابل انجام در کنار نگهداری کودک", type: "multi", choices: HOUSEHOLD_TASK_FOR_CHILDCARE, showIf: ["housework_child"] },
    ],
    form3: [
      // ── نوزاد ──────────────────────────────────────────────────────
      { key: "newborn_care_experience", label: "سابقه مراقبت از نوزاد", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["newborn"] },
      { key: "weaning_support_experience", label: "تجربه کمک به از شیر/پوشک گرفتن نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "bottle_feeding_ok", label: "آمادگی شیر دادن با شیشه", type: "bool", showIf: ["newborn"] },
      { key: "burping_ok", label: "آمادگی آروغ‌گیری نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "soothing_newborn_ok", label: "آمادگی آرام کردن نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "newborn_bathing_ok", label: "آمادگی حمام نوزاد", type: "bool", showIf: ["newborn"] },
      { key: "night_waking_readiness", label: "آمادگی برای بیدار شدن‌های شبانه مکرر", type: "bool", showIf: ["newborn"] },
      { key: "newborn_first_aid_training", label: "دوره کمک‌های اولیه نوزاد دیده است", type: "bool", showIf: ["newborn"] },
      { key: "multiples_newborn_experience", label: "تجربه‌ی مراقبت از نوزاد دوقلو یا چندقلو", type: "choice", choices: MULTIPLES_NEWBORN_EXPERIENCE, showIf: ["newborn"] },
      { key: "newborn_specialized_work_experience", label: "سابقه‌ی کار تخصصی با نوزاد (مثلاً مراکز مراقبت از نوزاد، بخش نوزادان یا نوزادیار حرفه‌ای)", type: "choice", choices: EXPERIENCE_RANGE, showIf: ["newborn"] },
      { key: "midwifery_university_degree", label: "مدرک دانشگاهی مامایی", type: "choice", choices: MIDWIFERY_DEGREE, showIf: ["newborn"] },
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
      { key: "preschool_experience", label: "سابقه کار در مهدکودک یا کودکیار آموزشی", type: "choice", choices: EXPERIENCE_RANGE, showIf: CHILD_SUBTYPES },
      { key: "child_related_education_field", label: "رشته‌ی تحصیلیِ مرتبط با کودک (اگر دارید)", type: "multi", choices: CHILD_EDUCATION_FIELD, showIf: CHILD_SUBTYPES },
      { key: "child_related_education_level", label: "مقطع تحصیلی در این رشته", type: "choice", choices: CHILD_EDUCATION_LEVEL, showIf: CHILD_SUBTYPES, showIfField: { key: "child_related_education_field", oneOf: ["early_childhood", "elementary_education", "child_psychology", "special_education", "child_nursing_health", "other"] } },
      { key: "psychology_education", label: "تحصیلات یا آموزش روانشناسی", type: "choice", choices: PSYCHOLOGY_EDUCATION_LEVEL, showIf: CHILD_SUBTYPES },
      { key: "crafts_with_children_experience", label: "تجربه‌ی ساختن کاردستی همراه با کودک", type: "choice", choices: CRAFTS_WITH_CHILDREN_EXPERIENCE, showIf: CHILD_SUBTYPES },
      { key: "child_entertainment_methods", label: "برای سرگرم کردن یا آموزش دادن به کودک، چه کارهایی را خوب بلدید یا قبلاً انجام داده‌اید؟", type: "multi", choices: CHILD_ENTERTAINMENT_METHOD, showIf: CHILD_SUBTYPES },
      { key: "child_entertainment_detail", label: "یکی از کارهایی را که برای کودکان انجام داده‌اید (مثلاً کلاس نقاشی، ساز، ورزش) کوتاه بنویسید", type: "text", showIf: CHILD_SUBTYPES },
      { key: "valued_extra_qualities", label: "ویژگی‌های جانبیِ مورد توجه خانواده‌ها", type: "multi", choices: VALUED_EXTRA_QUALITY, showIf: CHILD_SUBTYPES },
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
      // ── سوال‌های موقعیتی (غیرمستقیم) نوزادیار — در بخش آخرِ پرسشنامه؛ اثر گزینه‌ها در lib/trait-model-newborn.ts.
      // همه‌ی گزینه‌ها درست‌اند (سبک متفاوت). هیچ سوالی درباره‌ی سابقه‌ی شخصیِ خودِ مراقب نیست.
      { key: "scenario_nb_gent_1", label: "نوزاد هنگام تعویض پوشک بدخلق است و دست‌وپا می‌زند. چه می‌کنید؟", type: "choice", choices: [["a", "با لمس آرام و صحبت ملایم ادامه می‌دهم"], ["b", "لحظه‌ای مکث می‌کنم و بعد با آرامش ادامه می‌دهم"], ["c", "حواسش را با لالایی یا اسباب‌بازی نرم پرت می‌کنم"]], showIf: ["newborn"], trait: "gentleness" },
      { key: "scenario_nb_gent_2", label: "برای حمام نوزاد چه می‌کنید؟", type: "choice", choices: [["a", "همه چیز را از قبل می‌چینم تا حین حمام او را رها نکنم"], ["b", "دمای آب را با دماسنج یا آرنج امتحان می‌کنم و آرام حمام می‌دهم"], ["c", "حمام را کوتاه و آرام انجام می‌دهم و با او حرف می‌زنم"]], showIf: ["newborn"], trait: "gentleness" },
      { key: "scenario_nb_gent_3", label: "هنگام بغل کردن نوزادِ خواب‌آلود چه می‌کنید؟", type: "choice", choices: [["a", "سر و گردن را کامل حمایت می‌کنم و آهسته جابه‌جا می‌کنم"], ["b", "قبل از بلند کردن آرام صدایش می‌کنم تا نترسد"], ["c", "او را نزدیک بدنم و در وضعیت راحت نگه می‌دارم"]], showIf: ["newborn"], trait: "gentleness" },
      { key: "scenario_nb_calm_1", label: "نوزاد ساعتی است بی‌وقفه گریه می‌کند. چه می‌کنید؟", type: "choice", choices: [["a", "نیازهای معمول (شیر، پوشک، گاز) را بررسی می‌کنم و آرام می‌مانم"], ["b", "روش‌های آرام‌سازی (قنداق، لالایی، حرکت ملایم) را یکی‌یکی امتحان می‌کنم"], ["c", "اگر ادامه پیدا کرد به مادر یا پزشک خبر می‌دهم"]], showIf: ["newborn"], trait: "calmness" },
      { key: "scenario_nb_calm_2", label: "نوزاد تب دارد و مادر مضطرب است. چه می‌کنید؟", type: "choice", choices: [["a", "آرام می‌مانم، دما را اندازه می‌گیرم و با پزشک تماس می‌گیرم"], ["b", "مادر را آرام می‌کنم و کارها را بین خودمان تقسیم می‌کنیم"], ["c", "طبق دستور پزشک اطفال عمل می‌کنم"]], showIf: ["newborn"], trait: "calmness" },
      { key: "scenario_nb_calm_3", label: "هنگام شیر خوردن، نوزاد دچار سرفه یا خفگی خفیف می‌شود. چه می‌کنید؟", type: "choice", choices: [["a", "فوراً او را در وضعیت مناسب می‌گیرم و کمک می‌خواهم"], ["b", "آرام می‌مانم و طبق آموزش‌هایم عمل می‌کنم"], ["c", "پس از رفع خطر به مادر و پزشک اطلاع می‌دهم"]], showIf: ["newborn"], trait: "calmness" },
      { key: "scenario_nb_night_1", label: "سومین شب پشت‌سر هم شیفت شبانه شماست. چه می‌کنید؟", type: "choice", choices: [["a", "در ساعات خواب نوزاد استراحت کوتاه می‌کنم"], ["b", "غذا و نوشیدنی مناسب آماده می‌کنم تا هوشیار بمانم"], ["c", "با مادر درباره‌ی تقسیم ساعت‌های بیداری صحبت می‌کنم"]], showIf: ["newborn"], trait: "night_endurance" },
      { key: "scenario_nb_night_2", label: "ساعت ۳ بامداد نوزاد بیدار می‌شود و شما خسته‌اید. چه می‌کنید؟", type: "choice", choices: [["a", "با همان آرامش و لطافت همیشگی به او رسیدگی می‌کنم"], ["b", "سریع نیازش را می‌سنجم تا زودتر دوباره بخوابد"], ["c", "نور کم و محیط ساکت را حفظ می‌کنم تا هر دو زودتر آرام شویم"]], showIf: ["newborn"], trait: "night_endurance" },
      { key: "scenario_nb_night_3", label: "برای روز بعد از یک شب بی‌خوابی چه می‌کنید؟", type: "choice", choices: [["a", "قبل از شروع شیفت بعد خواب کافی می‌کنم"], ["b", "کارهای حساس را در ساعاتی که هوشیارترم انجام می‌دهم"], ["c", "از مادر یا خانواده می‌خواهم ساعاتی را شریک شوند"]], showIf: ["newborn"], trait: "night_endurance" },
      { key: "scenario_nb_pat_1", label: "نوزاد شیر نمی‌خورد و سرش را کنار می‌کشد. چه می‌کنید؟", type: "choice", choices: [["a", "صبر می‌کنم و چند دقیقه بعد دوباره امتحان می‌کنم"], ["b", "وضعیت بغل و شیشه را عوض می‌کنم"], ["c", "علائم گرسنگی و سیری را بررسی می‌کنم و اطلاع می‌دهم"]], showIf: ["newborn"], trait: "patience" },
      { key: "scenario_nb_pat_2", label: "نوزاد تازه خوابیده و چند بار پشت‌سر هم دوباره بیدار می‌شود. چه می‌کنید؟", type: "choice", choices: [["a", "هر بار با آرامش از اول او را می‌خوابانم"], ["b", "الگوی بیدار شدنش را یادداشت می‌کنم"], ["c", "روش آرام‌سازی را کمی تغییر می‌دهم"]], showIf: ["newborn"], trait: "patience" },
      { key: "scenario_nb_pat_3", label: "مادر چند بار پشت‌سر هم همان سوال را درباره‌ی نوزاد می‌پرسد. چه می‌کنید؟", type: "choice", choices: [["a", "هر بار با حوصله و همان لحن پاسخ می‌دهم"], ["b", "پاسخ را یادداشت می‌کنم تا هر وقت خواست ببیند"], ["c", "جواب می‌دهم و با ملایمت درباره‌ی نگرانی‌اش صحبت می‌کنم"]], showIf: ["newborn"], trait: "patience" },
      { key: "scenario_nb_att_1", label: "رنگ یا تعداد پوشک‌های نوزاد با روزهای قبل فرق کرده است. چه می‌کنید؟", type: "choice", choices: [["a", "یادداشت می‌کنم و به مادر و پزشک اطلاع می‌دهم"], ["b", "با راهنمای رشد و تغذیه‌ی نوزاد مقایسه می‌کنم"], ["c", "تغذیه و مایعات او را دقیق‌تر زیر نظر می‌گیرم"]], showIf: ["newborn"], trait: "attentiveness" },
      { key: "scenario_nb_att_2", label: "نوزاد بیش از معمول می‌خوابد و برای شیر بیدار نمی‌شود. چه می‌کنید؟", type: "choice", choices: [["a", "او را آرام بیدار می‌کنم و وضعیتش را بررسی می‌کنم"], ["b", "فوراً به مادر یا پزشک خبر می‌دهم"], ["c", "زمان و مقدار تغذیه را ثبت می‌کنم و پیگیری می‌کنم"]], showIf: ["newborn"], trait: "attentiveness" },
      { key: "scenario_nb_att_3", label: "به نظر می‌رسد رنگ پوست نوزاد کمی زردتر شده است. چه می‌کنید؟", type: "choice", choices: [["a", "در نور طبیعی بررسی می‌کنم و موضوع را به مادر و پزشک می‌گویم"], ["b", "طبق دستور پزشک تغذیه و پایش را دقیق‌تر می‌کنم"], ["c", "زمان شروع و تغییرات را ثبت می‌کنم تا پزشک بتواند ارزیابی کند"]], showIf: ["newborn"], trait: "attentiveness" },
      { key: "scenario_nb_safe_1", label: "لازم است لحظه‌ای از کنار نوزاد بروید. چه می‌کنید؟", type: "choice", choices: [["a", "او را در گهواره یا تخت ایمن می‌گذارم"], ["b", "او را همراه خودم می‌برم"], ["c", "از فرد دیگری می‌خواهم مراقبش باشد"]], showIf: ["newborn"], trait: "safety" },
      { key: "scenario_nb_safe_2", label: "برای خواباندن نوزاد چه می‌کنید؟", type: "choice", choices: [["a", "به پشت، روی سطح محکم و بدون وسایل اضافه می‌خوابانم"], ["b", "دمای اتاق و پوشش او را بررسی می‌کنم"], ["c", "هنگام خواب او را زیر نظر دارم"]], showIf: ["newborn"], trait: "safety" },
      { key: "scenario_nb_safe_3", label: "مهمان‌ها می‌خواهند نوزاد را ببوسند یا بغل کنند و برخی سرما خورده‌اند. چه می‌کنید؟", type: "choice", choices: [["a", "محترمانه می‌خواهم دست‌هایشان را بشویند و فاصله بگیرند"], ["b", "با مادر هماهنگ می‌کنم و تصمیم را به او می‌سپارم"], ["c", "نوزاد را در اتاق دیگر و با پوشش مناسب نگه می‌دارم"]], showIf: ["newborn"], trait: "safety" },
      { key: "scenario_nb_hyg_1", label: "قبل از لمس نوزاد برای بهداشت خودتان چه می‌کنید؟", type: "choice", choices: [["a", "دست‌ها را کامل می‌شویم"], ["b", "در صورت نیاز ضدعفونی می‌کنم و لباس تمیز می‌پوشم"], ["c", "اگر بیمارم به مادر می‌گویم و احتیاط می‌کنم"]], showIf: ["newborn"], trait: "hygiene" },
      { key: "scenario_nb_hyg_2", label: "شیشه و پستانک نوزاد را چطور آماده می‌کنید؟", type: "choice", choices: [["a", "هر بار کامل می‌شویم و ضدعفونی می‌کنم"], ["b", "وسایل را جدا و در جای تمیز نگه می‌دارم"], ["c", "شیر و آب را با دقت و مطابق دستور مادر آماده می‌کنم"]], showIf: ["newborn"], trait: "hygiene" },
      { key: "scenario_nb_poo_1", label: "مدفوع نوزاد از پوشک بیرون زده، لباس و پشتش کثیف شده و او گریه می‌کند. چه می‌کنید؟", type: "choice", choices: [["a", "اول با صدای آرام او را آرام می‌کنم و بعد ملایم همه‌چیز را تمیز می‌کنم"], ["b", "سریع و بهداشتی تمیز می‌کنم و او را گرم نگه می‌دارم"], ["c", "لباس و ملحفه را کامل عوض می‌کنم و پوست را بررسی می‌کنم"]], showIf: ["newborn"], trait: "hygiene" },
      { key: "scenario_nb_poo_2", label: "نیمه‌شب نوزادِ نیمه‌خواب مدفوع کرده است. چه می‌کنید؟", type: "choice", choices: [["a", "در نور کم و بی‌سروصدا پوشک را عوض می‌کنم تا کاملاً بیدار نشود"], ["b", "دستمال مرطوب را از قبل گرم می‌کنم و با لمس ملایم تمیز می‌کنم"], ["c", "سریع و دقیق عوض می‌کنم و بلافاصله دوباره آرامش می‌کنم"]], showIf: ["newborn"], trait: "gentleness" },
      { key: "scenario_nb_poo_3", label: "پوست ناحیه‌ی پوشک نوزاد قرمز شده و مدفوع‌های مکرر دارد. چه می‌کنید؟", type: "choice", choices: [["a", "دفعات تعویض را بیشتر می‌کنم و اجازه می‌دهم پوست هوا بخورد"], ["b", "کرم توصیه‌شده‌ی پزشک را طبق دستور می‌زنم"], ["c", "تعداد دفعات و حال پوست را ثبت می‌کنم و به مادر یا پزشک خبر می‌دهم"]], showIf: ["newborn"], trait: "attentiveness" },
      { key: "scenario_nb_poo_4", label: "رنگ یا حالت مدفوع نوزاد با روز قبل فرق کرده است. چه می‌کنید؟", type: "choice", choices: [["a", "یادداشت می‌کنم و به مادر و پزشک اطلاع می‌دهم"], ["b", "آن را با تغذیه‌ی نوزاد و راهنمای پزشک مقایسه می‌کنم"], ["c", "پوشک بعدی را هم با دقت بررسی می‌کنم و گزارش می‌دهم"]], showIf: ["newborn"], trait: "attentiveness" },
      { key: "scenario_nb_poo_5", label: "یکی از اطرافیان می‌گوید «بچه عادت می‌کند، بگذار کمی کثیف بماند». چه می‌کنید؟", type: "choice", choices: [["a", "محترمانه توضیح می‌دهم که نوزاد باید زود تمیز شود"], ["b", "با مادر هماهنگ می‌کنم و تصمیم را به او می‌سپارم"], ["c", "بدون بحث نوزاد را با آرامش تمیز می‌کنم"]], showIf: ["newborn"], trait: "hygiene" },
      { key: "scenario_nb_memp_1", label: "مادر بعد از زایمان بی‌دلیل گریه می‌کند. چه می‌کنید؟", type: "choice", choices: [["a", "کنارش می‌نشینم و بدون قضاوت گوش می‌دهم"], ["b", "به او استراحت می‌دهم و کار عملی را از دوشش برمی‌دارم"], ["c", "اگر ادامه داشت، با ملایمت پیشنهاد می‌کنم با پزشک یا مشاور صحبت کند"]], showIf: ["newborn"], trait: "maternal_empathy" },
      { key: "scenario_nb_memp_2", label: "مادر می‌گوید پس از تلاش‌های بسیار صاحب این نوزاد شده و خیلی نگران است. چه می‌کنید؟", type: "choice", choices: [["a", "با احترام گوش می‌دهم و دلگرمی می‌دهم"], ["b", "حریم او را رعایت می‌کنم و سوال‌های شخصی نمی‌پرسم"], ["c", "با گزارش دقیق و منظم از نوزاد او را مطمئن می‌کنم"]], showIf: ["newborn"], trait: "maternal_empathy" },
      { key: "scenario_nb_memp_3", label: "مادر خسته است اما اصرار دارد همه‌ی کارها را خودش انجام دهد. چه می‌کنید؟", type: "choice", choices: [["a", "کارهای کوچک را به‌عنوان کمک پیشنهاد می‌دهم"], ["b", "کنارش می‌مانم و فقط وقتی بخواهد کمک می‌کنم"], ["c", "بخش‌های خسته‌کننده را با ملایمت از او می‌گیرم"]], showIf: ["newborn"], trait: "maternal_empathy" },
      { key: "scenario_nb_prs_1", label: "مادر روشی برای خواباندن نوزاد دارد که با آموخته‌های شما فرق دارد. چه می‌کنید؟", type: "choice", choices: [["a", "روش او را اجرا می‌کنم"], ["b", "نظرم را محترمانه می‌گویم و تصمیم را به او می‌سپارم"], ["c", "اگر خطری ندارد هماهنگ می‌شوم و در صورت لزوم مشورت با پزشک پیشنهاد می‌کنم"]], showIf: ["newborn"], trait: "parent_respect" },
      { key: "scenario_nb_prs_2", label: "اطرافیان توصیه‌های سنتی متفاوتی درباره‌ی نوزاد می‌دهند. چه می‌کنید؟", type: "choice", choices: [["a", "محترمانه گوش می‌کنم و تصمیم را به والدین می‌سپارم"], ["b", "توصیه‌ی پزشک اطفال را با ملایمت مطرح می‌کنم"], ["c", "بین مادر و اطرافیان با ملایمت هماهنگ می‌کنم"]], showIf: ["newborn"], trait: "parent_respect" },
      { key: "scenario_nb_adh_1", label: "پزشک اطفال برنامه‌ی تغذیه یا مکمل مشخصی تجویز کرده است. چه می‌کنید؟", type: "choice", choices: [["a", "طبق ساعت و مقدار تجویز شده عمل می‌کنم"], ["b", "یادآور تنظیم می‌کنم و ثبت می‌کنم"], ["c", "اگر ابهامی بود قبل از اجرا می‌پرسم"]], showIf: ["newborn"], trait: "adherence" },
      { key: "scenario_nb_adh_2", label: "مادر برنامه‌ای متفاوت با دستور پزشک می‌خواهد. چه می‌کنید؟", type: "choice", choices: [["a", "محترمانه دستور پزشک را یادآوری می‌کنم"], ["b", "پیشنهاد می‌کنم با پزشک هماهنگ کنیم"], ["c", "تا روشن شدن موضوع رویه‌ی ایمن‌تر را حفظ می‌کنم و اطلاع می‌دهم"]], showIf: ["newborn"], trait: "adherence" },
      { key: "scenario_nb_comm_1", label: "پایان شیفت، مادر از وضعیت نوزاد می‌پرسد. چه می‌کنید؟", type: "choice", choices: [["a", "گزارش مرتب شامل شیر، خواب، پوشک و رفتار نوزاد می‌دهم"], ["b", "با نکات مثبت شروع می‌کنم و بعد نگرانی‌ها را می‌گویم"], ["c", "برگه‌ی ثبت روزانه را در اختیارش می‌گذارم"]], showIf: ["newborn"], trait: "communication" },
      { key: "scenario_nb_comm_2", label: "درباره‌ی نگرانی سلامتی نوزاد چطور با مادر صحبت می‌کنید؟", type: "choice", choices: [["a", "واقعیت را آرام و روشن می‌گویم"], ["b", "با مشاهدات دقیق و بدون ترساندن مطرح می‌کنم"], ["c", "همراه با پیشنهاد مراجعه به پزشک مطرح می‌کنم"]], showIf: ["newborn"], trait: "communication" },
      { key: "scenario_nb_resp_1", label: "مادر خواب است و نوزاد وقت شیر یا پوشک دارد. چه می‌کنید؟", type: "choice", choices: [["a", "طبق برنامه خودم رسیدگی می‌کنم و بعداً اطلاع می‌دهم"], ["b", "اگر لازم بود با ملایمت مادر را بیدار می‌کنم"], ["c", "نیاز نوزاد را برطرف می‌کنم و موضوع را ثبت می‌کنم"]], showIf: ["newborn"], trait: "responsibility" },
      { key: "scenario_nb_resp_2", label: "وسایل مورد نیاز نوزاد (پوشک، لباس تمیز، شیشه) رو به اتمام است. چه می‌کنید؟", type: "choice", choices: [["a", "پیش از تمام شدن به مادر اطلاع می‌دهم"], ["b", "فهرست مصرف را نگه می‌دارم"], ["c", "جایگزین موقت ایمن پیدا می‌کنم و اطلاع می‌دهم"]], showIf: ["newborn"], trait: "responsibility" },
      { key: "scenario_nb_trust_1", label: "می‌خواهید از نوزاد عکس بگیرید یا برای دوستانتان بفرستید. چه می‌کنید؟", type: "choice", choices: [["a", "بدون اجازه‌ی صریح والدین عکس نمی‌گیرم"], ["b", "عکس‌ها را فقط با اجازه و برای خود والدین می‌گیرم"], ["c", "از قبل با والدین درباره‌ی قواعد عکس‌برداری هماهنگ می‌کنم"]], showIf: ["newborn"], trait: "trustworthiness" },
      { key: "scenario_nb_trust_2", label: "دوستی درباره‌ی خانواده‌ی مادر و نوزاد از شما سوال می‌پرسد. چه می‌کنید؟", type: "choice", choices: [["a", "مؤدبانه می‌گویم درباره‌ی محل کارم صحبت نمی‌کنم"], ["b", "بحث را به شکل طبیعی عوض می‌کنم"], ["c", "می‌گویم رازداری بخشی از کار حرفه‌ای من است"]], showIf: ["newborn"], trait: "trustworthiness" },
      { key: "scenario_nb_adapt_1", label: "برنامه‌ی خواب و شیر نوزاد هر چند روز تغییر می‌کند. چه می‌کنید؟", type: "choice", choices: [["a", "با آرامش برنامه را با نوزاد هماهنگ می‌کنم"], ["b", "الگوها را یادداشت می‌کنم تا زودتر تطبیق دهم"], ["c", "تغییرات را با مادر در میان می‌گذارم"]], showIf: ["newborn"], trait: "adaptability" },
      { key: "scenario_nb_adapt_2", label: "مادر وسط شیفت تصمیم می‌گیرد برنامه‌ی روز را عوض کند. چه می‌کنید؟", type: "choice", choices: [["a", "بدون دلخوری برنامه‌ی جدید را اجرا می‌کنم"], ["b", "جزئیات تغییر را می‌پرسم و هماهنگ می‌شوم"], ["c", "ایمنی و نیاز نوزاد را در برنامه‌ی جدید لحاظ می‌کنم"]], showIf: ["newborn"], trait: "adaptability" },
      // ── کودک (سه زیرشاخه‌ی کودک‌محور) ───────────────────────────────
      // ── سوال‌های موقعیتی (غیرمستقیم) کودک‌یار — در بخش آخرِ پرسشنامه نمایش داده می‌شوند.
      // صفت‌ها (مهربانی، نظم، صبر، قابل اعتماد بودن، مسئولیت‌پذیری، خلاقیت، وقت‌شناسی،
      // خوش‌سلیقگی، شادابی، ادب، آراستگی) هرگز مستقیم پرسیده نمی‌شوند؛ هر کدام با چند سناریو.
      // همه‌ی گزینه‌ها عمداً درست و حرفه‌ای‌اند (سبک متفاوت، نه درست/غلط). مقدارها a/b/c.
      // `trait` برای تحلیل بعدی شخصیت از روی ترکیب پاسخ‌هاست. هر سوال فقط برای زیرشاخه‌های
      // مرتبط نمایش داده می‌شود (مثلاً سوال‌های درس و مشق فقط برای کمک‌معلم).
      { key: "scenario_kind_1", label: "کودک بعد از باخت در یک بازی ناراحت شده و گریه می‌کند. معمولاً چه می‌کنید؟", type: "choice", choices: [["a", "کنارش می‌نشینم و اجازه می‌دهم احساسش را بگوید"], ["b", "بغلش می‌کنم و دلداری‌اش می‌دهم"], ["c", "با یک فعالیت موردعلاقه‌اش آرام‌آرام حال‌وهوایش را عوض می‌کنم"]], showIf: CHILD_SUBTYPES, trait: "kindness" },
      { key: "scenario_kind_2", label: "کودک وسیله‌ی موردعلاقه‌اش را شکسته و می‌ترسد شما ناراحت شوید. واکنش شما چیست؟", type: "choice", choices: [["a", "آرام می‌گویم اشکالی ندارد و با هم جمعش می‌کنیم"], ["b", "می‌گویم همه گاهی چیزی را می‌شکنند و دفعه‌ی بعد با هم مراقب‌تر هستیم"], ["c", "اول آرامش می‌کنم و بعد با هم برای تعمیر یا جایگزین کردنش راه‌حل پیدا می‌کنیم"]], showIf: CHILD_SUBTYPES, trait: "kindness" },
      { key: "scenario_organized_1", label: "وسایل بازی و درس کودک را در طول روز چطور نگه می‌دارید؟", type: "choice", choices: [["a", "هر چیز جای مشخصی دارد و بعد از هر فعالیت با هم جمع می‌کنیم"], ["b", "برای هر دسته از وسایل یک جعبه‌ی جدا در نظر می‌گیرم و آخر هر بازی جمع می‌کنیم"], ["c", "جمع کردن را به یک بازی کوتاه تبدیل می‌کنم و همزمان مرتب می‌کنیم"]], showIf: CHILD_SUBTYPES, trait: "organization" },
      { key: "scenario_organized_2", label: "برنامه‌ی روزانه‌ی کودک (غذا، خواب، بازی، تکلیف) را چطور پیش می‌برید؟", type: "choice", choices: [["a", "یک برنامه‌ی ساعت‌دار مشخص دارم و طبق آن پیش می‌روم"], ["b", "ترتیب کارها ثابت است اما زمان دقیقش را با حال کودک تنظیم می‌کنم"], ["c", "برنامه‌ی تصویری روزانه می‌سازیم تا کودک هم بداند بعد چه می‌شود"]], showIf: CHILD_SUBTYPES, trait: "organization" },
      { key: "scenario_patient_1", label: "کودکی که امروز بدخلق است و هر پیشنهادی را رد می‌کند. بهترین رویکرد را چه می‌دانید؟", type: "choice", choices: [["a", "دنبال دلیلش می‌گردم (گرسنگی، خستگی، خواب) و نیازش را برطرف می‌کنم"], ["b", "کمی مکث می‌کنم و محیط یا فعالیت را عوض می‌کنم"], ["c", "دو انتخاب ساده جلویش می‌گذارم تا خودش احساس کنترل داشته باشد"]], showIf: CHILD_SUBTYPES, trait: "patience" },
      { key: "scenario_patient_2", label: "کودک می‌خواهد قصه‌ی موردعلاقه‌اش را برای بار پنجم بشنود. چه می‌کنید؟", type: "choice", choices: [["a", "با لحن و صداهای متفاوت دوباره می‌خوانم"], ["b", "از او می‌خواهم این بار خودش قصه را ادامه دهد یا تغییر بدهد"], ["c", "با هم توافق می‌کنیم که این بار آخر است و بعد سراغ یک بازی می‌رویم"]], showIf: ["child", "housework_child"], trait: "patience" },
      { key: "scenario_patient_mischief_1", label: "کودک با ماژیک روی دیوار نقاشی کرده است. چه می‌کنید؟", type: "choice", choices: [["a", "آرام می‌گویم جای نقاشی روی کاغذ است و با هم دیوار را تمیز می‌کنیم"], ["b", "یک کاغذ بزرگ می‌دهم و جای مجاز نقاشی را مشخص می‌کنم"], ["c", "با لحن آرام علتش را می‌پرسم و بعد با هم جبران می‌کنیم"]], showIf: ["child", "housework_child"], trait: "patience" },
      { key: "scenario_patient_mischief_2", label: "کودک شما را امتحان می‌کند و می‌گوید «تو مامان من نیستی، حرف تو را گوش نمی‌دهم». چه می‌کنید؟", type: "choice", choices: [["a", "آرام و محترمانه حد و حدود را توضیح می‌دهم"], ["b", "به احساسش توجه می‌کنم و بعد می‌گویم چه انتظاری دارم"], ["c", "بحث نمی‌کنم و در یک زمان آرام درباره‌اش صحبت می‌کنیم"]], showIf: CHILD_SUBTYPES, trait: "patience" },
      { key: "scenario_patient_3", label: "کودک موقع انجام تکلیف خسته است و حوصله ندارد. چه می‌کنید؟", type: "choice", choices: [["a", "استراحت کوتاهی می‌دهم و بعد با هم ادامه می‌دهیم"], ["b", "روش را به یک بازی یا چالش کوتاه تبدیل می‌کنم"], ["c", "ابتدا درس دیگری را که دوست دارد انجام می‌دهیم و بعد برمی‌گردیم"]], showIf: ["homework_helper"], trait: "patience" },
      { key: "scenario_patient_hw", label: "کودک یک مفهوم درسی را بعد از دو بار توضیح هنوز متوجه نشده است. چه می‌کنید؟", type: "choice", choices: [["a", "با مثالی از زندگی روزمره دوباره توضیح می‌دهم"], ["b", "از او می‌خواهم با زبان خودش بگوید تا بفهمم کجا گیر کرده"], ["c", "روش را عوض می‌کنم (تصویر، شکل یا بازی)"]], showIf: ["homework_helper"], trait: "patience" },
      { key: "scenario_trust_1", label: "در خانه متوجه رفتاری می‌شوید که خارج از عرف است (مثلاً در رفتار اطرافیان با کودک یا فضای زندگی کودک). برخورد شما چگونه است؟", type: "choice", choices: [["a", "بدون قضاوت و در اولین فرصت خصوصی، موضوع را با والدین در میان می‌گذارم"], ["b", "ابتدا با احترام از خود والدین توضیح می‌خواهم تا برداشت اشتباه نداشته باشم"], ["c", "آرامش کودک را حفظ می‌کنم و بلافاصله با سرپرست یا مسئول آژانس مشورت می‌کنم"]], showIf: CHILD_SUBTYPES, trait: "trustworthiness" },
      { key: "scenario_trust_2", label: "دوستی از شما درباره‌ی خانواده‌ای که برایشان کار می‌کنید سوال می‌پرسد. چه می‌کنید؟", type: "choice", choices: [["a", "مؤدبانه می‌گویم درباره‌ی محل کارم صحبت نمی‌کنم"], ["b", "بحث را به شکل طبیعی عوض می‌کنم"], ["c", "می‌گویم رعایت حریم خصوصی خانواده‌ها بخشی از کار حرفه‌ای من است"]], showIf: CHILD_SUBTYPES, trait: "trustworthiness" },
      { key: "scenario_trust_3", label: "کودک رازی را به شما می‌گوید و از شما می‌خواهد به مامان و بابا نگویید. چه می‌کنید؟", type: "choice", choices: [["a", "توضیح می‌دهم که رازهای مربوط به ایمنی و سلامتش را نمی‌توانم نگه دارم، ولی رازهای بی‌خطرش را حفظ می‌کنم"], ["b", "با مهربانی اطمینان می‌دهم، اما اگر موضوع به ایمنی‌اش مربوط بود با والدین در میان می‌گذارم"], ["c", "با دقت گوش می‌دهم و بعد با هم تصمیم می‌گیریم چطور به والدین بگوییم"]], showIf: CHILD_SUBTYPES, trait: "trustworthiness" },
      { key: "scenario_trust_4", label: "خانواده کلید خانه یا یک وسیله‌ی باارزش را به شما می‌سپارد. چه می‌کنید؟", type: "choice", choices: [["a", "در جای مشخص و امن نگه می‌دارم و موقع تحویل گزارش می‌دهم"], ["b", "هر بار که لازم شد تحویل می‌دهم و تحویل‌گرفتن را یادداشت می‌کنم"], ["c", "از خانواده می‌پرسم دقیقاً چه قاعده‌ای برای نگهداری آن می‌خواهند"]], showIf: CHILD_SUBTYPES, trait: "trustworthiness" },
      { key: "scenario_resp_1", label: "وسط نگهداری از کودک، تلفن‌تان برای یک کار شخصی زنگ می‌خورد. چه می‌کنید؟", type: "choice", choices: [["a", "گوشی را کنار می‌گذارم و در زمان استراحت کودک جواب می‌دهم"], ["b", "اگر ضروری باشد، کوتاه و در حالی که کودک را می‌بینم جواب می‌دهم"], ["c", "با پیام کوتاه می‌گویم بعداً تماس می‌گیرم"]], showIf: CHILD_SUBTYPES, trait: "responsibility" },
      { key: "scenario_resp_2", label: "کودک می‌خواهد از مبل بلند بالا برود. چه می‌کنید؟", type: "choice", choices: [["a", "آرام توضیح می‌دهم و کار امن‌تری پیشنهاد می‌دهم"], ["b", "کنارش می‌مانم و کمک می‌کنم تا به شکل ایمن این کار را انجام دهد"], ["c", "او را به یک بازی حرکتی امن هدایت می‌کنم"]], showIf: ["child", "housework_child"], trait: "responsibility" },
      { key: "scenario_resp_3", label: "متوجه می‌شوید یکی از کارهای مهم (مثلاً وعده‌ی غذایی یا خواب کودک) را از قلم انداخته‌اید. چه می‌کنید؟", type: "choice", choices: [["a", "فوراً جبران می‌کنم و موضوع را به خانواده می‌گویم"], ["b", "جبران می‌کنم و در گزارش پایان روز می‌نویسم"], ["c", "از خانواده می‌پرسم بهترین زمان برای جبرانش چیست"]], showIf: ["child", "housework_child"], trait: "responsibility" },
      { key: "scenario_resp_hw", label: "زمان کار رو به پایان است و تکلیف کودک هنوز ناتمام مانده. چه می‌کنید؟", type: "choice", choices: [["a", "مهم‌ترین بخش را انجام می‌دهیم و بقیه را برای خانواده یادداشت می‌کنم"], ["b", "با خانواده هماهنگ می‌کنم که ادامه‌اش چطور انجام شود"], ["c", "همراه کودک برنامه‌ی ادامه‌ی تکلیف در روزهای بعد را می‌چینم"]], showIf: ["homework_helper"], trait: "responsibility" },
      { key: "scenario_creative_1", label: "کودک می‌گوید حوصله‌اش سر رفته و اسباب‌بازی‌هایش را دوست ندارد. چه می‌کنید؟", type: "choice", choices: [["a", "با وسایل ساده‌ی خانه یک بازی یا فعالیت تازه می‌سازم"], ["b", "از او می‌خواهم خودش یک بازی جدید اختراع کند و همراهش می‌شوم"], ["c", "یک ماجراجویی یا گنج‌یابی کوچک در خانه راه می‌اندازم"]], showIf: CHILD_SUBTYPES, trait: "creativity" },
      { key: "scenario_creative_2", label: "باران می‌بارد و برنامه‌ی پارک لغو شده است. چه می‌کنید؟", type: "choice", choices: [["a", "با نقاشی، قصه یا کاردستی برنامه‌ی جدیدی در خانه می‌سازیم"], ["b", "با پتو و بالش یک «چادر» می‌سازیم و در آن بازی می‌کنیم"], ["c", "یک نمایش کوچک یا مسابقه‌ی خانگی ترتیب می‌دهیم"]], showIf: ["child", "housework_child"], trait: "creativity" },
      { key: "scenario_creative_3", label: "برای اینکه کودک مسواک زدن یا جمع کردن اسباب‌بازی را دوست داشته باشد چه می‌کنید؟", type: "choice", choices: [["a", "آن را به یک بازی یا ماجرا تبدیل می‌کنم"], ["b", "با آهنگ یا شعر کوتاه همراهی‌اش می‌کنم"], ["c", "یک جدول تشویقی تصویری می‌سازیم"]], showIf: ["child", "housework_child"], trait: "creativity" },
      { key: "scenario_creative_hw", label: "کودک جدول ضرب یا املای کلمات را حفظ نمی‌کند و خسته شده است. چه می‌کنید؟", type: "choice", choices: [["a", "آن را به یک بازی کارتی یا مسابقه تبدیل می‌کنم"], ["b", "با ریتم یا آهنگ همراهی‌اش می‌کنم"], ["c", "با کلمات یا اعداد یک داستان کوتاه می‌سازیم"]], showIf: ["homework_helper"], trait: "creativity" },
      { key: "scenario_punctual_1", label: "قرار است ساعت هشت صبح پیش کودک باشید، اما مسیر ممکن است شلوغ باشد. معمولاً چه می‌کنید؟", type: "choice", choices: [["a", "زودتر از زمان لازم حرکت می‌کنم"], ["b", "شب قبل مسیر را بررسی می‌کنم و زمان اضافه در نظر می‌گیرم"], ["c", "اگر احتمال تأخیر باشد، همان لحظه خبر می‌دهم و راه‌حل پیشنهاد می‌کنم"]], showIf: CHILD_SUBTYPES, trait: "punctuality" },
      { key: "scenario_punctual_2", label: "پایان ساعت کاری است و کودک هنوز مشغول بازی است. چه می‌کنید؟", type: "choice", choices: [["a", "ده دقیقه قبل او را برای تمام شدن بازی آماده می‌کنم"], ["b", "با یک ساعت شنی یا تایمر پایان بازی را برایش قابل‌دیدن می‌کنم"], ["c", "با خانواده هماهنگ می‌کنم و تحویل را به‌موقع انجام می‌دهم"]], showIf: CHILD_SUBTYPES, trait: "punctuality" },
      { key: "scenario_punctual_3", label: "کار فوری پیش آمده و ممکن است زمان شروع یا پایان کار شما جابه‌جا شود. چه می‌کنید؟", type: "choice", choices: [["a", "از قبل زمان جایگزین پیشنهاد می‌دهم"], ["b", "برنامه‌ی روز را طوری می‌چینم که کارهای ضروری اول انجام شود"], ["c", "صریح و محترمانه به خانواده می‌گویم چه ساعتی برایم ممکن است"]], showIf: CHILD_SUBTYPES, trait: "punctuality" },
      { key: "scenario_taste_1", label: "می‌خواهید برای تولد کودک یا اتاقش تزئینی آماده کنید. چه می‌کنید؟", type: "choice", choices: [["a", "رنگ‌ها و چیدمان هماهنگ و متناسب با علاقه‌ی کودک انتخاب می‌کنم"], ["b", "همراه با خود کودک وسایل را انتخاب و تزئین می‌کنیم"], ["c", "با وسایل ساده و دست‌ساز، فضایی گرم و خلاقانه می‌سازم"]], showIf: CHILD_SUBTYPES, trait: "taste" },
      { key: "scenario_taste_2", label: "سفره‌ی غذای کودک را چطور آماده می‌کنید؟", type: "choice", choices: [["a", "ظرف و چیدمان رنگی و جذاب می‌چینم تا اشتهایش باز شود"], ["b", "غذا را به شکل‌های ساده و بامزه تزئین می‌کنم"], ["c", "سفره‌ای مرتب و آرام می‌چینم تا کودک با تمرکز غذا بخورد"]], showIf: ["child", "housework_child"], trait: "taste" },
      { key: "scenario_taste_3", label: "کودک نقاشی یا کاردستی‌اش را با افتخار نشان می‌دهد. با آن چه می‌کنید؟", type: "choice", choices: [["a", "آن را با چیدمان زیبا روی دیوار یا یخچال نصب می‌کنم"], ["b", "با خود کودک انتخاب می‌کنیم کجا و چطور نمایش داده شود"], ["c", "برای کارهایش قاب یا پوشه‌ی مخصوص درست می‌کنیم"]], showIf: CHILD_SUBTYPES, trait: "taste" },
      { key: "scenario_cheer_1", label: "صبح وارد خانه می‌شوید و کودک بی‌حوصله است. اولین کاری که می‌کنید چیست؟", type: "choice", choices: [["a", "با لبخند و سلام شاد شروع می‌کنم و کمی شوخی می‌کنم"], ["b", "از حالش و چیزی که امروز دوست دارد می‌پرسم"], ["c", "یک بازی کوتاه و جذاب پیشنهاد می‌دهم"]], showIf: CHILD_SUBTYPES, trait: "cheerfulness" },
      { key: "scenario_cheer_2", label: "روز طولانی بوده و کودک هنوز انرژی دارد. چه می‌کنید؟", type: "choice", choices: [["a", "با فعالیت‌های آرام‌تر انرژی خودم و او را متعادل می‌کنم"], ["b", "با خوش‌خلقی ادامه می‌دهم و فعالیت تازه‌ای پیشنهاد می‌کنم"], ["c", "بازی پرتحرک و استراحت را نوبتی می‌کنم"]], showIf: CHILD_SUBTYPES, trait: "cheerfulness" },
      { key: "scenario_polite_1", label: "کودک با لحنی بی‌ادبانه با شما حرف می‌زند. چه می‌کنید؟", type: "choice", choices: [["a", "با لحن آرام و محترمانه نمونه‌ی درست را نشان می‌دهم"], ["b", "بعد از آرام شدن، با هم درباره‌ی نحوه‌ی درست گفتن صحبت می‌کنیم"], ["c", "اول احساس او را می‌پرسم و بعد جمله را با هم دوباره می‌گوییم"]], showIf: CHILD_SUBTYPES, trait: "politeness" },
      { key: "scenario_polite_2", label: "موقع تحویل کودک، والدین از روز او می‌پرسند. چه می‌کنید؟", type: "choice", choices: [["a", "گزارش کوتاه، دقیق و محترمانه می‌دهم"], ["b", "با نکات خوب روز شروع می‌کنم و بعد مسائل را می‌گویم"], ["c", "می‌پرسم چه چیزی را بیشتر می‌خواهند بدانند و همان را توضیح می‌دهم"]], showIf: CHILD_SUBTYPES, trait: "politeness" },
      { key: "scenario_groom_1", label: "صبح قبل از رفتن به خانه‌ی خانواده، برای لباس و ظاهرتان چه معیاری دارید؟", type: "choice", choices: [["a", "لباس ساده، تمیز و راحت متناسب با بازی و حرکت با کودک"], ["b", "ظاهر مرتب و ساده، بدون وسایل خطرناک برای کودک"], ["c", "لباس مناسب شرایط خانه و فعالیت‌های روز"]], showIf: CHILD_SUBTYPES, trait: "grooming" },
      { key: "scenario_groom_2", label: "حین بازی لباس‌تان کثیف می‌شود (مثلاً رنگ یا غذا). چه می‌کنید؟", type: "choice", choices: [["a", "لباس یدک یا پیش‌بند دارم و سریع عوض می‌کنم"], ["b", "ساده تمیز می‌کنم و بدون اینکه کودک ناراحت شود ادامه می‌دهم"], ["c", "از اول لباسی می‌پوشم که برای کار با کودک مناسب و تمیز کردنش آسان باشد"]], showIf: CHILD_SUBTYPES, trait: "grooming" },
      { key: "scenario_groom_3", label: "بهداشت شخصی و بوی ظاهرتان در کار نزدیک با کودک چه جایگاهی برایتان دارد؟", type: "choice", choices: [["a", "پیش از رفتن به خانه بهداشت شخصی را رعایت می‌کنم و بوی ملایم و خوشایند دارم"], ["b", "از عطر تند و وسایل تحریک‌کننده برای کودک پرهیز می‌کنم"], ["c", "ناخن‌ها را کوتاه و دست‌ها را تمیز نگه می‌دارم"]], showIf: CHILD_SUBTYPES, trait: "grooming" },
      { key: "scenario_housework_involve", label: "می‌خواهید کودک در کارهای خانه (مثلاً چیدن میز یا جمع کردن لباس) کمک کند. چه می‌کنید؟", type: "choice", choices: [["a", "سهم ساده و متناسب با سنش به او می‌دهم"], ["b", "آن را به یک بازی تبدیل می‌کنم و همراهش می‌شوم"], ["c", "کار را با هم انجام می‌دهیم و تلاشش را تشویق می‌کنم"]], showIf: ["housework_child"], trait: "responsibility" },
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
      { key: "averse_hospitals_detail", label: "آیا بیمارستانی هست که قصد رفتن به آن را ندارید؟ (در صورت وجود، نام ببرید)", type: "text" },
    ],
    form3: [
      { key: "aide_training_certificate", label: "گواهی آموزشی کمک‌بهیاری/بهیاری دارد", type: "bool" },
      { key: "behyar_care_abilities", label: "توانایی‌های بهیاری", type: "multi", choices: [
        ["vital_signs", "کنترل علائم حیاتی (فشار، نبض، تب، قند خون)"],
        ["bedbound_hygiene", "بهداشت و شست‌وشوی بیمار بستری"],
        ["patient_positioning", "تغییر وضعیت بیمار و پیشگیری از زخم بستر"],
        ["patient_transfer", "جابه‌جایی و انتقال بیمار (تخت، ویلچر)"],
        ["feeding_assistance", "تغذیه بیمار (خوراکی و لوله معده)"],
        ["elimination_care", "کمک در دفع، لگن و مراقبت از سوند"],
        ["medication_reminder", "یادآوری و کمک در مصرف داروها"],
        ["nurse_assistance", "کمک به پرستار در اقدامات درمانی"],
        ["oxygen_equipment", "کار با کپسول اکسیژن و دستگاه‌های ساده"],
      ] },
      { key: "years_of_hospital_experience", label: "سابقه کار بیمارستانی", type: "choice", choices: EXPERIENCE_RANGE },
    ],
    questionnaire: [
      { key: "physical_stamina_level", label: "استقامت فیزیکی برای کارهای سخت", type: "score" },
    ],
  },
}

// استعدادها و مهارت‌های ویژه — برای همه نقش‌ها؛ در پروفایل نمایش داده می‌شود.
export const TALENT_GROUPS: { title: string; choices: Choice[] }[] = [
  { title: "ساز", choices: [
    ["piano", "پیانو"], ["guitar", "گیتار"], ["violin", "ویولن"], ["santur", "سنتور"],
    ["tar_setar", "تار و سه‌تار"], ["ney", "نی"], ["daf_tonbak", "دف و تنبک"], ["other_instrument", "سایر سازها"],
  ] },
  { title: "هنر", choices: [
    ["painting", "نقاشی"], ["calligraphy", "خوشنویسی"], ["handicraft", "کاردستی و هنرهای دستی"],
    ["knitting_embroidery", "بافتنی و گلدوزی"], ["pottery", "سفالگری"], ["singing", "آواز و خوانندگی"],
    ["storytelling", "قصه‌گویی و نمایش"],
  ] },
  { title: "علمی و فناوری", choices: [
    ["robotics", "رباتیک"], ["programming", "برنامه‌نویسی"], ["science_experiments", "آزمایش‌های علمی"],
    ["chess_board_games", "شطرنج و بازی‌های فکری"],
  ] },
  { title: "ورزش", choices: [
    ["swimming", "شنا"], ["martial_arts", "ورزش‌های رزمی"], ["yoga_pilates", "یوگا و پیلاتس"], ["ball_sports", "ورزش‌های توپی"],
  ] },
  { title: "سایر", choices: [["other", "سایر"]] },
]
export const SPECIAL_TALENT: Choice[] = TALENT_GROUPS.flatMap((g) => g.choices)
