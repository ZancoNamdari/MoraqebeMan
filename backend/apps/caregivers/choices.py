from django.db import models



class ServiceType(models.TextChoices):
    """Multi-select — the service category/categories this caregiver
    offers. One caregiver can hold several at once (e.g. both
    SALMANDYAR and MADARYAR) — this is NOT a fork into separate
    profiles; it's a tag set on the one CaregiverProfile, so the same
    caregiver shows up in each matching type's pool/list under a
    single, unique registration (CaregiverProfile.id), never
    duplicated with a different id per type."""
    SALMANDYAR = "salmandyar", "سالمندیار"
    # «کودک‌یار» قبلاً نوع خدمت جدا بود؛ به‌طور کامل در مادریار ادغام شد
    # (زیرشاخه‌های کودک / کمک‌کننده در درس و مشق / کارخانه + کودک) —
    # مایگریشن 0029 داده‌های موجود را منتقل می‌کند.
    NEZAFATCHI = "nezafatchi", "امور منزل"
    MADARYAR = "madaryar", "مادریار"
    # پرستار فعلاً در رابط کاربری غیرفعال است (بعداً فعال می‌شود)؛
    # مقدار برای داده‌های موجود و فعال‌سازی مجدد در بک‌اند معتبر می‌ماند.
    PARASTAR = "parastar", "پرستار"
    BEHYAR = "behyar", "بهیار"


class NezafatchiSubtype(models.TextChoices):
    """Multi-select — the 3 main «امور منزل» (قبلاً نظافت‌چی) branches. Finer-grained
    activities (deep cleaning, hosting, laundry, janitor work, etc.)
    are asked as activity checklists within the indoor/outdoor
    sections of SERVICE_SPECIFIC_FORMS.nezafatchi in the frontend,
    not as their own subtypes — most of them were never worth their
    own top-level branch."""
    OUTSIDE_HOME = "outside_home", "خدمات بیرون از خانه"
    INSIDE_HOME = "inside_home", "خدمات داخل خانه"
    COOKING = "cooking", "آشپزی"


class MadaryarSubtype(models.TextChoices):
    """مادریار + کودک‌یار (ادغام‌شده). دوران بارداری / در شرف زایمان / پس از
    زایمان دیگر زیرشاخه نیستند؛ ترجیح مرحله‌ی همراهی زیر «نوزاد» در
    service_specific_answers پرسیده می‌شود (newborn_stage_preferences)."""
    NEWBORN = "newborn", "نوزاد"
    CHILD = "child", "کودک"
    HOMEWORK_HELPER = "homework_helper", "کمک‌کننده در درس و مشق"
    HOUSEWORK_CHILD = "housework_child", "کارهای خانه + کودک"


class ParastarSubtype(models.TextChoices):
    NURSING_SPECIALIST = "nursing_specialist", "کارشناس پرستاری"
    SPECIALIZED_NURSE = "specialized_nurse", "پرستار تخصصی"


class ParastarSpecialty(models.TextChoices):
    """Only meaningful when ParastarSubtype.SPECIALIZED_NURSE is
    selected."""
    ICU = "icu", "ICU کار"
    WOUND_CARE = "wound_care", "زخم بستر کار"
    PEDIATRIC = "pediatric", "کودکان کار"
    MIDWIFERY = "midwifery", "مامایی"
    EMERGENCY = "emergency", "اورژانس"
    OTHER = "other", "سایر"


class BehyarSubtype(models.TextChoices):
    AIDE_HELPER = "aide_helper", "کمک بهیار"
    NURSE_HELPER = "nurse_helper", "کمک پرستار"
    BEHYAR = "behyar", "بهیار"


class Gender(models.TextChoices):
    FEMALE = "female", "زن"
    MALE = "male", "مرد"


class MaritalStatus(models.TextChoices):
    SINGLE = "single", "مجرد"
    MARRIED = "married", "متأهل"
    DIVORCED = "divorced", "مطلقه"
    WIDOWED = "widowed", "همسر فوت شده"


class ChildrenCount(models.TextChoices):
    NONE = "none", "بدون فرزند"
    ONE = "one", "۱"
    TWO = "two", "۲"
    THREE = "three", "۳"
    FOUR_OR_MORE = "four_or_more", "۴ یا بیشتر"


class ChildAccompanyAtWork(models.TextChoices):
    """آیا مایل است هنگام کار، فرزندش همراهش باشد؟ (فقط وقتی از فرزند خودش مراقبت می‌کند)"""
    YES = "yes", "بله"
    NO = "no", "خیر"
    INDIFFERENT = "indifferent", "فرقی ندارد"


class NationalityCountry(models.TextChoices):
    """کشور تابعیت برای اتباع غیرایرانی — «سایر» با متن آزاد (nationality_country_other)."""
    AFGHANISTAN = "afghanistan", "افغانستان"
    PAKISTAN = "pakistan", "پاکستان"
    IRAQ = "iraq", "عراق"
    SYRIA = "syria", "سوریه"
    LEBANON = "lebanon", "لبنان"
    TURKMENISTAN = "turkmenistan", "ترکمنستان"
    AZERBAIJAN = "azerbaijan", "آذربایجان"
    TAJIKISTAN = "tajikistan", "تاجیکستان"
    TURKEY = "turkey", "ترکیه"
    OTHER = "other", "سایر"


class MilitaryStatus(models.TextChoices):
    """Only relevant when gender == MALE — enforced in the serializer, not the DB."""
    NOT_SERVED = "not_served", "مشمول (هنوز به خدمت نرفته)"
    IN_SERVICE = "in_service", "در حال خدمت"
    COMPLETED = "completed", "پایان خدمت"
    PERMANENT_EXEMPTION = "permanent_exemption", "معافیت دائم"
    TEMPORARY_EXEMPTION = "temporary_exemption", "معافیت موقت"


class HeightRange(models.TextChoices):
    UNDER_150 = "under_150", "کمتر از ۱۵۰"
    R150_160 = "150_160", "۱۵۰–۱۶۰"
    R160_170 = "160_170", "۱۶۰–۱۷۰"
    R170_180 = "170_180", "۱۷۰–۱۸۰"
    OVER_180 = "over_180", "بالاتر از ۱۸۰"


class WeightRange(models.TextChoices):
    UNDER_50 = "under_50", "کمتر از ۵۰"
    R50_60 = "50_60", "۵۰–۶۰"
    R60_70 = "60_70", "۶۰–۷۰"
    R70_80 = "70_80", "۷۰–۸۰"
    R80_90 = "80_90", "۸۰–۹۰"
    OVER_90 = "over_90", "بالاتر از ۹۰"


class Ethnicity(models.TextChoices):
    """قومیت اصلی (سطح اول). Multi-select — stored as a JSON list of these
    values in IdentityProfile.ethnicities. هر قومیت اصلی زیرگروه‌های خودش را
    دارد (ETHNICITY_SUBGROUPS)؛ زیرگروه‌های انتخابی در
    IdentityProfile.ethnicity_details به‌شکل {قومیت: [زیرگروه‌ها]} ذخیره می‌شوند."""
    FARS = "fars", "فارس"
    TURK = "turk", "آذری/ترک"
    KURD = "kurd", "کرد"
    LOR = "lor", "لر"
    GILAK = "gilak", "گیلک"
    MAZANDARANI = "mazandarani", "مازندرانی"
    BALOCH = "baloch", "بلوچ"
    ARAB = "arab", "عرب"
    TURKMEN = "turkmen", "ترکمن"
    TALESH = "talesh", "تالشی"
    ARMENIAN = "armenian", "ارمنی"
    QASHQAI = "qashqai", "قشقایی"
    BAKHTIARI = "bakhtiari", "بختیاری"
    OTHER = "other", "سایر"


# زیرگروه‌های هر قومیت اصلی (سطح دوم) — «اهل کجا». کلیدها پایدارند و برای
# تطبیق (matching) استفاده می‌شوند؛ فرانت‌اند همین فهرست را بازنویسی کرده
# (ETHNICITY_SUBGROUPS در wizard-constants.ts و ...)، هم‌گام نگه دارید.
ETHNICITY_SUBGROUPS = {
    "fars": [
        ("tehrani", "تهرانی"), ("khorasani", "خراسانی"), ("isfahani", "اصفهانی"), ("shirazi", "شیرازی"),
        ("yazdi", "یزدی"), ("kermani", "کرمانی"), ("qomi", "قمی"), ("kashani", "کاشانی"),
        ("other", "سایر"),
    ],
    "turk": [
        ("tabrizi", "تبریزی"), ("ardabili", "اردبیلی"), ("urmiaei", "ارومیه‌ای"), ("zanjani", "زنجانی"),
        ("qazvini", "قزوینی"), ("hamedani", "همدانی"), ("maraghei", "مراغه‌ای"), ("khoyi", "خویی"),
        ("mianei", "میانه‌ای"), ("other", "سایر"),
    ],
    "kurd": [
        ("sanandaji", "سنندجی"), ("kermanshahi", "کرمانشاهی"), ("marivani", "مریوانی"), ("saqqezi", "سقزی"),
        ("baneh", "بانه‌ای"), ("mahabadi", "مهابادی"), ("ilami", "ایلامی"), ("other", "سایر"),
    ],
    "lor": [
        ("lorestani", "لرستانی"), ("khorramabadi", "خرم‌آبادی"), ("boroujerdi", "بروجردی"), ("lak", "لک"),
        ("bakhtiari", "بختیاری"), ("mamasani", "ممسنی"), ("other", "سایر"),
    ],
    "gilak": [
        ("rashti", "رشتی"), ("lahijani", "لاهیجانی"), ("fomani", "فومنی"), ("roudsari", "رودسری"),
        ("anzali", "انزلی‌ای"), ("other", "سایر"),
    ],
    "mazandarani": [
        ("sari", "ساروی"), ("babol", "بابلی"), ("amol", "آملی"), ("ghaemshahr", "قائمشهری"),
        ("nowshahr", "نوشهری"), ("chalus", "چالوسی"), ("other", "سایر"),
    ],
    "baloch": [
        ("zahedani", "زاهدانی"), ("saravani", "سراوانی"), ("chabahari", "چابهاری"),
        ("iranshahri", "ایرانشهری"), ("nikshahri", "نیکشهری"), ("other", "سایر"),
    ],
    "arab": [
        ("ahvazi", "اهوازی"), ("abadani", "آبادانی"), ("khorramshahri", "خرمشهری"), ("shadegani", "شادگانی"),
        ("dezful_shushtar_arab", "دزفولی/شوشتریِ عرب‌مجاور"), ("other", "سایر"),
    ],
    "turkmen": [
        ("gonbad", "گنبدی"), ("bandar_turkmen", "بندرترکمن"), ("aqqala", "آق‌قلا"), ("kalaleh", "کلاله"),
        ("other", "سایر"),
    ],
    "talesh": [
        ("talesh_north", "تالش شمالی"), ("asalem", "اسالم"), ("masal", "ماسال"),
        ("surrounding_areas", "مناطق اطراف"), ("other", "سایر"),
    ],
    "armenian": [
        ("tehran", "ارمنی‌های تهران"), ("isfahan", "ارمنی‌های اصفهان"), ("azerbaijan", "ارمنی‌های آذربایجان"),
        ("other", "سایر"),
    ],
    "qashqai": [
        ("shiraz", "شیراز"), ("firuzabad", "فیروزآباد"), ("kazerun", "کازرون"),
        ("nomadic_rural_fars", "مناطق کوچ‌نشین/روستایی فارس"), ("other", "سایر"),
    ],
    "bakhtiari": [
        ("chaharmahal", "چهارمحال"), ("masjed_soleyman", "مسجدسلیمان"), ("izeh", "ایذه"),
        ("lordegan", "لردگان"), ("other", "سایر"),
    ],
}


class ChronicDiseaseType(models.TextChoices):
    """Multi-select, shown only when has_chronic_disease=True."""
    DIABETES = "diabetes", "دیابت"
    BLOOD_PRESSURE = "blood_pressure", "فشار خون"
    HEART_DISEASE = "heart_disease", "بیماری قلبی"
    ASTHMA = "asthma", "آسم"
    JOINT_DISEASE = "joint_disease", "بیماری‌های مفصلی"
    SPINE_DISEASE = "spine_disease", "بیماری‌های ستون فقرات"
    NEUROLOGICAL_DISEASE = "neurological_disease", "بیماری عصبی"
    LOWER_BACK_DISC = "lower_back_disc", "دیسک کمر"
    PSYCHOLOGICAL_ISSUES = "psychological_issues", "مشکلات روحی و روانی"
    OTHER = "other", "سایر"


class MedicationType(models.TextChoices):
    """Multi-select, shown only when takes_permanent_medication=True."""
    BLOOD_PRESSURE_MEDICATION = "blood_pressure_medication", "داروی فشار خون"
    DIABETES_MEDICATION = "diabetes_medication", "داروی دیابت"
    HEART_MEDICATION = "heart_medication", "داروی قلب"
    NEUROLOGICAL_MEDICATION = "neurological_medication", "داروی اعصاب"
    OTHER = "other", "سایر"


class EmergencyContactRelation(models.TextChoices):
    SPOUSE = "spouse", "همسر"
    FATHER = "father", "پدر"
    MOTHER = "mother", "مادر"
    CHILD = "child", "فرزند"
    SISTER = "sister", "خواهر"
    BROTHER = "brother", "برادر"
    OTHER = "other", "سایر"



class CleaningWillingness(models.TextChoices):
    """Single-select — how much cleaning this caregiver is willing to
    do, distinct from OfferedService's broader LIGHT_CLEANING option."""
    NONE = "none", "نظافت را انجام نمی‌دهد"
    LIGHT = "light", "نظافت سبک انجام می‌دهد"
    HEAVY = "heavy", "نظافت سنگین انجام می‌دهد"


class CollaborationType(models.TextChoices):
    DAILY = "daily", "مراقبت روزانه"
    NIGHT = "night", "مراقبت شبانه"
    LIVE_IN = "live_in", "مراقبت شبانه‌روزی (مقیم)"
    HOSPITAL_COMPANION = "hospital_companion", "همراه سالمند در بیمارستان"
    HOME_COMPANION = "home_companion", "همراه سالمند در منزل"
    SHORT_TERM = "short_term", "مراقبت موقت (چند روزه)"
    LONG_TERM = "long_term", "مراقبت بلندمدت"


class CollaborationMode(models.TextChoices):
    """نوع همکاری — برای همه‌ی نقش‌ها یکسان، دو سطح:
      بلندمدت  ⇒ شبانه‌روزی / روزانه / شبانه / ماهانه
      کوتاه‌مدت (مقطعی) ⇒ ساعتی / بیمارستان / شیفتی
    هر دو سطح (کلید گروه و کلید زیرگروه) در یک فهرست
    CaregiverWorkPreferences.collaboration_types ذخیره می‌شوند؛ جزئیات
    روز/ساعت هر زیرگروه در collaboration_schedule است."""
    LONG_TERM = "long_term", "بلندمدت"
    SHORT_TERM = "short_term", "کوتاه‌مدت (مقطعی)"
    # زیرگروه‌های بلندمدت
    LIVE_IN = "live_in", "شبانه‌روزی (مقیم)"
    DAILY = "daily", "روزانه"
    NIGHT = "night", "شبانه"
    MONTHLY = "monthly", "ماهانه"
    # زیرگروه‌های کوتاه‌مدت
    HOURLY = "hourly", "ساعتی"
    HOSPITAL_COMPANION = "hospital_companion", "بیمارستان"
    SHIFT = "shift", "شیفتی"


COLLABORATION_LONG_TERM_SUBTYPES = ("live_in", "daily", "night", "monthly")
COLLABORATION_SHORT_TERM_SUBTYPES = ("hourly", "hospital_companion", "shift")
# توجه: CollaborationType (بالا) نوع «سرویس» در تعرفه/تخصیص (care/finance) است و
# دست‌نخورده می‌ماند؛ CollaborationMode فقط ترجیح همکاری مراقب در فرم ۲ است.
# زیرگروه‌هایی که روز + بازه‌ی ساعت می‌پرسند / روز + شیفت / فقط تاریخ.
COLLABORATION_DAYS_HOURS_SUBTYPES = ("daily", "night", "hourly", "hospital_companion")


class RequestedSalaryRange(models.TextChoices):
    """بازه‌ی حقوق درخواستی (ماهانه، میلیون تومان) — جایگزین متن آزاد قبلی."""
    UNDER_10 = "under_10", "تا ۱۰ میلیون تومان"
    R_10_15 = "10_15", "۱۰ تا ۱۵ میلیون تومان"
    R_15_20 = "15_20", "۱۵ تا ۲۰ میلیون تومان"
    R_20_25 = "20_25", "۲۰ تا ۲۵ میلیون تومان"
    R_25_30 = "25_30", "۲۵ تا ۳۰ میلیون تومان"
    R_30_40 = "30_40", "۳۰ تا ۴۰ میلیون تومان"
    OVER_40 = "over_40", "بیش از ۴۰ میلیون تومان"
    NEGOTIABLE = "negotiable", "توافقی"


class WorkStatus(models.TextChoices):
    FULL_TIME = "full_time", "تمام‌وقت"
    PART_TIME = "part_time", "پاره‌وقت"
    BOTH = "both", "هر دو مورد"


class FamilyPresencePreference(models.TextChoices):
    PREFER_PRESENT = "prefer_present", "ترجیح می‌دهم عضوی از خانواده در منزل حضور داشته باشد"
    PREFER_ABSENT = "prefer_absent", "ترجیح می‌دهم خانواده در ساعات کاری خارج از منزل باشند"
    NO_PREFERENCE = "no_preference", "برایم اولویت ندارد"


class AcceptedGender(models.TextChoices):
    FEMALE_ONLY = "female_only", "فقط خانم"
    MALE_ONLY = "male_only", "فقط آقا"
    NO_PREFERENCE = "no_preference", "تفاوتی ندارد"


class AcceptedAgeRange(models.TextChoices):
    AGE_60_70 = "60_70", "۶۰ تا ۷۰ سال"
    AGE_70_80 = "70_80", "۷۰ تا ۸۰ سال"
    OVER_80 = "over_80", "بالای ۸۰ سال"
    NO_PREFERENCE = "no_preference", "تفاوتی ندارد"


class OfferedService(models.TextChoices):
    COMPANIONSHIP = "companionship", "هم‌صحبتی و همراهی سالمند"
    WALKING = "walking", "پیاده‌روی و همراهی سالمند"
    MEDICATION_REMINDER = "medication_reminder", "یادآوری زمان مصرف دارو"
    SHOPPING = "shopping", "خرید مایحتاج منزل"
    SIMPLE_MEAL_PREP = "simple_meal_prep", "تهیه غذای ساده"
    LIGHT_CLEANING = "light_cleaning", "نظافت سبک محیط سالمند"
    BATHING_HELP = "bathing_help", "کمک در استحمام"
    HOUSEWORK_HELP = "housework_help", "کمک در امور منزل"
    MOBILITY_HELP = "mobility_help", "کمک در جابجایی سالمند"
    DOCTOR_VISITS = "doctor_visits", "همراهی در مراجعه به پزشک"
    FAMILY_HOUSEWORK = "family_housework", "انجام امور منزل خانواده سالمند"
    HOSPITAL_CARE = "hospital_care", "مراقبت در بیمارستان"
    PERSONAL_CARE = "personal_care", "کمک در طهارت و انجام امور شخصی"
    ALL = "all", "همه موارد"


class AcceptedPhysicalCondition(models.TextChoices):
    INDEPENDENT = "independent", "سالمند مستقل"
    LOW_MOBILITY = "low_mobility", "سالمند کم‌توان (همراهی در راه رفتن)"
    LIMITED_MOBILITY_BEDRIDDEN = "limited_mobility_bedridden", "سالمند دارای محدودیت حرکتی (روی تخت)"
    BEDRIDDEN_DIAPER = "bedridden_diaper", "سالمند بستری در منزل (پوشکی)"
    ALZHEIMERS = "alzheimers", "سالمند مبتلا به آلزایمر"
    PARKINSONS = "parkinsons", "سالمند مبتلا به پارکینسون"
    HOSPITAL_COMPANION_NEEDED = "hospital_companion_needed", "سالمند نیازمند همراهی بیمارستانی"
    NO_PREFERENCE = "no_preference", "تفاوتی ندارد"


class LiftingCapacity(models.TextChoices):
    UP_TO_30KG = "up_to_30kg", "تا ۳۰ کیلوگرم"
    UP_TO_50KG = "up_to_50kg", "تا ۵۰ کیلوگرم"
    OVER_50KG = "over_50kg", "بیش از ۵۰ کیلوگرم"
    CANNOT_LIFT = "cannot_lift", "امکان جابجایی فیزیکی ندارم"


class ServiceLocation(models.TextChoices):
    PATIENT_HOME = "patient_home", "منزل سالمند"
    HOSPITAL = "hospital", "بیمارستان"
    NO_PREFERENCE = "no_preference", "تفاوتی ندارد"


class MaxCommuteTime(models.TextChoices):
    UP_TO_60 = "up_to_60", "تا ۶۰ دقیقه"
    UP_TO_90 = "up_to_90", "تا ۹۰ دقیقه"
    OVER_90 = "over_90", "بیش از ۹۰ دقیقه"


class Weekday(models.TextChoices):
    SATURDAY = "saturday", "شنبه"
    SUNDAY = "sunday", "یکشنبه"
    MONDAY = "monday", "دوشنبه"
    TUESDAY = "tuesday", "سه‌شنبه"
    WEDNESDAY = "wednesday", "چهارشنبه"
    THURSDAY = "thursday", "پنجشنبه"
    FRIDAY = "friday", "جمعه"
    ALL_DAYS = "all_days", "هرروز"


class Shift(models.TextChoices):

    MORNING = "morning", "صبح"
    AFTERNOON = "afternoon", "عصر"
    NIGHT = "night", "شب"
    ALL_DAY = "24h", "شبانه‌روزی"


class CommuteMethod(models.TextChoices):
    PERSONAL_CAR = "personal_car", "خودرو شخصی"
    MOTORCYCLE = "motorcycle", "موتورسیکلت"
    PUBLIC_TRANSPORT = "public_transport", "حمل‌ونقل عمومی"
    ONLINE_TAXI = "online_taxi", "تاکسی اینترنتی"


class SmokingStatus(models.TextChoices):
    NONE = "none", "استعمال نمی‌کنم"
    OCCASIONAL = "occasional", "گهگاه استعمال می‌کنم"
    REGULAR = "regular", "به‌صورت منظم استعمال می‌کنم"



class ExperienceRange(models.TextChoices):

    NONE = "none", "ندارم"
    UNDER_1_YEAR = "under_1_year", "کمتر از ۱ سال"
    ONE_TO_5_YEARS = "1_to_5_years", "بین ۱ تا ۵ سال"
    OVER_5_YEARS = "over_5_years", "بیش از ۵ سال"


class PreviousWorkplace(models.TextChoices):
    PATIENT_HOME = "patient_home", "منزل سالمند"
    HOSPITAL = "hospital", "بیمارستان"
    REHAB_CENTER = "rehab_center", "مرکز توانبخشی"
    FAMILY_MEMBER_CARE = "family_member_care", "نگهداری از عضو خانواده"
    CLEANING_SERVICES = "cleaning_services", "خدمات نظافت"
    OTHER = "other", "سایر"


class PatientsCaredForCount(models.TextChoices):
    ONE = "one", "۱ نفر"
    TWO_TO_5 = "2_to_5", "۲ تا ۵ نفر"
    SIX_TO_10 = "6_to_10", "۶ تا ۱۰ نفر"
    ELEVEN_TO_20 = "11_to_20", "۱۱ تا ۲۰ نفر"
    OVER_20 = "over_20", "بیش از ۲۰ نفر"


class SpecialConditionExperience(models.TextChoices):
    ALZHEIMERS = "alzheimers", "آلزایمر"
    DEMENTIA = "dementia", "زوال عقل"
    PARKINSONS = "parkinsons", "پارکینسون"
    STROKE = "stroke", "سکته مغزی"
    WHEELCHAIR = "wheelchair", "ویلچرنشین"
    BEDRIDDEN = "bedridden", "سالمند بستری"
    DIABETES = "diabetes", "دیابت"
    HEART_DISEASE = "heart_disease", "بیماری قلبی"
    SEVERE_OSTEOPOROSIS = "severe_osteoporosis", "پوکی استخوان شدید"
    CANCER = "cancer", "سرطان"
    HOSPITAL_CARE = "hospital_care", "مراقبت بیمارستانی"
    DIAPER_DEPENDENT = "diaper_dependent", "پوشکی"
    LOWER_BACK_DISC = "lower_back_disc", "دیسک کمر"
    BLIND = "blind", "نابینایی"
    FRACTURE = "fracture", "شکستگی استخوان"
    DEPRESSION = "depression", "افسردگی"
    NEEDS_COMPANIONSHIP = "needs_companionship", "تنها و نیازمند هم‌صحبتی (هم‌دم)"
    SPEECH_IMPAIRMENT = "speech_impairment", "اختلال گفتار و تکلم"
    RESPIRATORY_PROBLEM = "respiratory_problem", "مشکلات تنفسی"
    RESTLESSNESS = "restlessness", "بی‌قراری (مانند زوال عقل)"
    INCONTINENCE = "incontinence", "بی‌اختیاری ادرار و مدفوع"
    NONE = "none", "هیچ‌کدام"

class EducationLevel(models.TextChoices):
    UNDER_DIPLOMA = "under_diploma", "زیر دیپلم"
    DIPLOMA = "diploma", "دیپلم"
    ASSOCIATE = "associate", "کاردانی"
    BACHELOR = "bachelor", "کارشناسی"
    MASTER = "master", "کارشناسی ارشد"
    PHD = "phd", "دکتری"


class TrainingCourse(models.TextChoices):
    ELDERLY_CARE = "elderly_care", "مراقبت از سالمند"
    FIRST_AID = "first_aid", "کمک‌های اولیه"
    CPR = "cpr", "احیای قلبی ریوی (CPR)"
    VITAL_SIGNS = "vital_signs", "کنترل علائم حیاتی"
    ALZHEIMERS_DEMENTIA = "alzheimers_dementia", "آلزایمر و زوال عقل"
    PARKINSONS = "parkinsons", "پارکینسون"
    PERSONAL_HYGIENE = "personal_hygiene", "بهداشت فردی سالمند"
    NUTRITION = "nutrition", "تغذیه سالمندان"
    SAFE_TRANSFER = "safe_transfer", "جابجایی ایمن سالمند"
    HOSPITAL_CARE = "hospital_care", "مراقبت بیمارستانی"
    NONE = "none", "هیچ‌کدام"


class CommunicationSkill(models.TextChoices):
    EFFECTIVE_COMMUNICATION = "effective_communication", "برقراری ارتباط مؤثر با سالمند"
    CONFLICT_MANAGEMENT = "conflict_management", "مدیریت تعارض"
    PATIENCE = "patience", "صبوری و آرامش در شرایط دشوار"
    ENTERTAINMENT_SKILLS = "entertainment_skills", "ایجاد سرگرمی برای سالمند"
    EMOTIONAL_SUPPORT = "emotional_support", "همراهی عاطفی سالمند"


class CaregivingSkill(models.TextChoices):
    BLOOD_PRESSURE = "blood_pressure", "اندازه‌گیری فشار خون"
    BLOOD_SUGAR = "blood_sugar", "اندازه‌گیری قند خون"
    MEDICATION_REMINDER = "medication_reminder", "یادآوری مصرف دارو"
    WALKING_ASSISTANCE = "walking_assistance", "کمک به راه رفتن"
    BED_TO_WHEELCHAIR_TRANSFER = "bed_to_wheelchair_transfer", "انتقال از تخت به ویلچر"
    WALKER_USE = "walker_use", "استفاده از واکر"
    WHEELCHAIR_USE = "wheelchair_use", "استفاده از ویلچر"
    BATHING_ASSISTANCE = "bathing_assistance", "کمک در استحمام"
    DRESSING_ASSISTANCE = "dressing_assistance", "کمک در لباس پوشیدن"
    FEEDING_ASSISTANCE = "feeding_assistance", "کمک در تغذیه"


class PhysicalAbility(models.TextChoices):
    WEAK = "weak", "ضعیف"
    MODERATE = "moderate", "متوسط"
    GOOD = "good", "خوب"
    VERY_GOOD = "very_good", "بسیار خوب"


class MobilityAssistanceAbility(models.TextChoices):
    UNLIMITED = "unlimited", "بدون محدودیت"
    WHEELCHAIR_ASSIST = "wheelchair_assist", "جابجایی با کمک ویلچر"
    WALKER_ASSIST = "walker_assist", "جابجایی با واکر"
    BED_TRANSFER_ASSIST = "bed_transfer_assist", "کمک در انتقال از تخت"
    NEEDS_SECOND_PERSON = "needs_second_person", "نیاز به کمک نفر دوم"


class HouseholdSkill(models.TextChoices):
    IRANIAN_COOKING = "iranian_cooking", "آشپزی ایرانی"
    ELDERLY_DIET = "elderly_diet", "رژیم غذایی سالمندان"
    LIGHT_CLEANING = "light_cleaning", "نظافت سبک منزل"
    SHOPPING = "shopping", "خرید مایحتاج"
    MEDICATION_MANAGEMENT = "medication_management", "مدیریت داروها"


class ForeignLanguage(models.TextChoices):
    ENGLISH = "english", "انگلیسی"
    ARABIC = "arabic", "عربی"
    TURKISH = "turkish", "ترکی استانبولی"
    OTHER = "other", "سایر"


class LocalLanguage(models.TextChoices):
    AZERI = "azeri", "ترکی آذری"
    KURDISH = "kurdish", "کردی"
    LORI = "lori", "لری"
    GILAKI = "gilaki", "گیلکی"
    MAZANDARANI = "mazandarani", "مازندرانی"
    BALUCHI = "baluchi", "بلوچی"
    ARABIC = "arabic", "عربی"
    TURKMEN = "turkmen", "ترکمنی"
    YAZDI = "yazdi", "یزدی"
    SHIRAZI = "shirazi", "شیرازی"
    ISFAHANI = "isfahani", "اصفهانی"
    OTHER = "other", "سایر"


class MessagingApp(models.TextChoices):
    WHATSAPP = "whatsapp", "واتساپ"
    TELEGRAM = "telegram", "تلگرام"
    EITAA = "eitaa", "ایتا"
    RUBIKA = "rubika", "روبیکا"
    BALE = "bale", "بله"

class ReferenceRelationType(models.TextChoices):
    FAMILY = "family", "خانواده"
    FRIENDS = "friends", "دوستان"
    FORMER_COLLEAGUE = "former_colleague", "همکار سابق"
    TRUSTED_ACQUAINTANCE = "trusted_acquaintance", "آشنای مورد اعتماد"


class AcquaintanceDuration(models.TextChoices):

    UNDER_1_YEAR = "under_1_year", "کمتر از ۱ سال"
    ONE_TO_5_YEARS = "1_to_5_years", "بین ۱ تا ۵ سال"
    OVER_5_YEARS = "over_5_years", "بیش از ۵ سال (مدت زمان زیادی)"


class NightStayUntil(models.TextChoices):
    """New question, added alongside the existing shift checkboxes —
    "how late can you stay at night" is a finer-grained, free-standing
    question that doesn't fit as just another SHIFT checkbox option,
    since it's a single choice (a latest-time), not a multi-select."""
    UP_TO_10PM = "up_to_10pm", "تا ۱۰ شب"
    UP_TO_MIDNIGHT = "up_to_midnight", "تا ۱۲ شب"
    UP_TO_2AM = "up_to_2am", "تا ۲ بامداد"
    UNTIL_MORNING = "until_morning", "تا صبح"


# ============================================================
# Per-service-type Form 2 / Form 3 / compatibility-questionnaire
# extra questions — these are NOT real model fields (unlike
# everything above). They're stored as free-form JSON under
# service_specific_answers on CaregiverWorkPreferences/
# CaregiverExperience/CaregiverCompatibilityQuestionnaire, keyed by
# ServiceType, since the question set differs per service type (and
# a caregiver can carry several at once) — see each model field's
# own docstring. These TextChoices exist only so the handful of
# choice-type questions below still validate against a fixed enum
# instead of accepting arbitrary strings.
# ============================================================


class ChildAgeRange(models.TextChoices):
    INFANT = "infant", "نوزاد و شیرخوار (۰ تا ۲ سال)"
    TODDLER = "toddler", "کودک نوپا (۲ تا ۵ سال)"
    SCHOOL_AGE = "school_age", "سن مدرسه (۶ تا ۱۲ سال)"
    TEEN = "teen", "نوجوان (۱۳ تا ۱۸ سال)"


class ChildrenCountCapacity(models.TextChoices):
    ONE = "one", "۱ کودک"
    TWO = "two", "۲ کودک"
    THREE_PLUS = "three_plus", "۳ کودک یا بیشتر"


class TutoringSubject(models.TextChoices):
    MATH = "math", "ریاضی"
    SCIENCE = "science", "علوم"
    LITERATURE = "literature", "ادبیات فارسی"
    ENGLISH = "english", "زبان انگلیسی"
    QURAN = "quran", "قرآن و دینی"
    OTHER = "other", "سایر"


class CleaningFrequency(models.TextChoices):
    DAILY = "daily", "روزانه"
    EVERY_OTHER_DAY = "every_other_day", "یک روز در میان"
    WEEKLY = "weekly", "هفته‌ای یک‌بار"
    BIWEEKLY = "biweekly", "هر دو هفته یک‌بار"


class CookingCuisine(models.TextChoices):
    IRANIAN = "iranian", "غذای ایرانی"
    FAST_FOOD = "fast_food", "فست‌فود"
    DIET_FOOD = "diet_food", "غذای رژیمی"
    OTHER = "other", "سایر"


class PropertySizeRange(models.TextChoices):
    UNDER_100 = "under_100", "تا ۱۰۰ متر"
    R100_200 = "100_200", "۱۰۰ تا ۲۰۰ متر"
    R200_400 = "200_400", "۲۰۰ تا ۴۰۰ متر"
    OVER_400 = "over_400", "بالای ۴۰۰ متر"


class PregnancyStage(models.TextChoices):
    EARLY = "early", "اوایل بارداری"
    MID = "mid", "اواسط بارداری"
    LATE = "late", "اواخر بارداری"


class NursingDegreeLevel(models.TextChoices):
    ASSOCIATE = "associate", "کاردانی"
    BACHELOR = "bachelor", "کارشناسی"
    MASTER_PLUS = "master_plus", "کارشناسی ارشد و بالاتر"


class ParastarConditionExperience(models.TextChoices):
    """Multi-select — patient diagnoses/conditions this پرستار has
    cared for. wound_care/icu/pediatric/midwifery/emergency
    experience already have their own showIf-gated question tied to
    ParastarSpecialty, so they're not repeated here."""
    DIABETES = "diabetes", "دیابت"
    STROKE = "stroke", "سکته مغزی"
    PARKINSONS = "parkinsons", "پارکینسون"
    ALZHEIMERS = "alzheimers", "آلزایمر"
    HEART_DISEASE = "heart_disease", "بیماری قلبی"
    MS = "ms", "ام‌اس (MS)"
    HEPATITIS = "hepatitis", "هپاتیت"
    HIV_AIDS = "hiv_aids", "ایدز (HIV)"
    CANCER = "cancer", "سرطان"
    LUNG_DISEASE = "lung_disease", "بیماری ریوی"
    OSTEOPOROSIS_FRACTURE = "osteoporosis_fracture", "پوکی استخوان / شکستگی"
    FEMUR_FRACTURE = "femur_fracture", "شکستگی استخوان ران (فمور)"
    PELVIS_FRACTURE = "pelvis_fracture", "شکستگی لگن"
    PARALYSIS = "paralysis", "فلج"
    BILIARY_DISEASE = "biliary_disease", "بیماری صفراوی"
    VASCULAR_STENOSIS = "vascular_stenosis", "تنگی عروق"
    AMPUTATION = "amputation", "قطع عضو"
    DIALYSIS = "dialysis", "دیالیز"
    PSP = "psp", "PSP (فلج فوق‌هسته‌ای پیش‌رونده)"
    BLIND = "blind", "نابینایی"
    INFECTION_GENERAL = "infection_general", "عفونت عمومی"
    SKIN_INFECTION = "skin_infection", "عفونت پوستی"
    VAGINAL_INFECTION = "vaginal_infection", "عفونت واژینال"
    INFECTED_BLEEDING_WOUND = "infected_bleeding_wound", "زخم خونریزی‌دار و عفونی"
    DIABETIC_FOOT_ULCER = "diabetic_foot_ulcer", "زخم پای دیابتی"
    DEPRESSION = "depression", "افسردگی"
    POST_HYSTERECTOMY = "post_hysterectomy", "پس از عمل برداشتن رحم"
    POST_MISCARRIAGE = "post_miscarriage", "پس از سقط جنین"
    POST_IVF = "post_ivf", "پس از IVF"
    POST_EYE_SURGERY = "post_eye_surgery", "پس از عمل چشم"


class ParastarProcedureAbility(models.TextChoices):
    """Multi-select — clinical procedures/skills this پرستار can
    perform. Injections already have their own universal bool
    (can_administer_injections), so not repeated here."""
    TUBE_FEEDING_GAVAGE = "tube_feeding_gavage", "تغذیه با گاواژ (لوله)"
    OXYGEN_THERAPY = "oxygen_therapy", "اکسیژن‌درمانی"
    CATHETER_CARE = "catheter_care", "مراقبت از سوند"
    PACEMAKER_PATIENT_CARE = "pacemaker_patient_care", "مراقبت از بیمار دارای پیس‌میکر"
    VITAL_SIGNS_MONITORING = "vital_signs_monitoring", "کنترل قند، فشار و اکسیژن خون"
    INSULIN_INJECTION = "insulin_injection", "تزریق انسولین"
    IV_SERUM_THERAPY = "iv_serum_therapy", "سرم‌تراپی"
    WOUND_DRESSING = "wound_dressing", "پانسمان زخم"
    SUTURE_REMOVAL = "suture_removal", "بخیه و کشیدن بخیه"
    DIAPER_CHANGING = "diaper_changing", "تغییر پوشک"
    IODINE_THERAPY = "iodine_therapy", "یددرمانی"


class PayBasis(models.TextChoices):
    """Universal now (Form 2's common section, next to
    requested_salary) — used to be duplicated as a koodakyar/madaryar-
    only service_specific_answers entry, but it's the same question
    for every service type."""
    HOURLY = "hourly", "ساعتی"
    SHIFT = "shift", "شیفتی"
    DAILY = "daily", "روزانه"
    MONTHLY = "monthly", "ماهانه"


class LanguageLevel(models.TextChoices):
    """Now a universal field on CaregiverSkills (english_level/
    arabic_level) rather than a koodakyar-only service_specific_
    answers entry — language level is relevant across every service
    type, not just childcare."""
    NONE = "none", "هیچ"
    BASIC = "basic", "مقدماتی"
    INTERMEDIATE = "intermediate", "متوسط"
    FLUENT = "fluent", "پیشرفته / روان"


class LocalLanguageFluency(models.TextChoices):
    """How well the caregiver handles the local language(s)/dialect(s)
    they selected — just understanding it versus being able to hold a
    conversation in it."""
    UNDERSTAND_ONLY = "understand_only", "فقط متوجه می‌شود"
    CAN_CONVERSE = "can_converse", "می‌تواند مکالمه کند"
