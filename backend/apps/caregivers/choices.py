from django.db import models



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
    """Multi-select in the form — stored as a JSON list of these values."""
    FARS = "fars", "فارس"
    AZERI_TURK = "azeri_turk", "ترک آذری"
    KURD = "kurd", "کرد"
    LOR = "lor", "لر"
    GILAK = "gilak", "گیلک"
    MAZANDARANI = "mazandarani", "مازندرانی"
    BALOCH = "baloch", "بلوچ"
    ARAB = "arab", "عرب"
    TURKMEN = "turkmen", "ترکمن"
    OTHER = "other", "سایر"


class ChronicDiseaseType(models.TextChoices):
    """Multi-select, shown only when has_chronic_disease=True."""
    DIABETES = "diabetes", "دیابت"
    BLOOD_PRESSURE = "blood_pressure", "فشار خون"
    HEART_DISEASE = "heart_disease", "بیماری قلبی"
    ASTHMA = "asthma", "آسم"
    JOINT_DISEASE = "joint_disease", "بیماری‌های مفصلی"
    SPINE_DISEASE = "spine_disease", "بیماری‌های ستون فقرات"
    NEUROLOGICAL_DISEASE = "neurological_disease", "بیماری عصبی"
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



class CollaborationType(models.TextChoices):
    DAILY = "daily", "مراقبت روزانه"
    NIGHT = "night", "مراقبت شبانه"
    LIVE_IN = "live_in", "مراقبت شبانه‌روزی (مقیم)"
    HOSPITAL_COMPANION = "hospital_companion", "همراه سالمند در بیمارستان"
    HOME_COMPANION = "home_companion", "همراه سالمند در منزل"
    SHORT_TERM = "short_term", "مراقبت موقت (چند روزه)"
    LONG_TERM = "long_term", "مراقبت بلندمدت"


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
    NURSING_HOME = "nursing_home", "خانه سالمندان"
    REHAB_CENTER = "rehab_center", "مرکز توانبخشی"
    CARE_COMPANY = "care_company", "شرکت خدمات مراقبتی"
    FAMILY_MEMBER_CARE = "family_member_care", "نگهداری از عضو خانواده"


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
