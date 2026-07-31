"""
apps.caregivers — Forms 2, 3, and 4 of the caregiver onboarding flow.

Form 1 (اطلاعات هویتی) is deliberately NOT duplicated here. It was
compared field-by-field against the newly-resent version of the form
and found identical to apps.accounts.models.IdentityProfile, which
already exists, is migrated, and is tested. CaregiverProfile below
simply requires that an IdentityProfile exists for the same user
(checked in services.py, not enforced at the DB level, to avoid a
cross-app ForeignKey — see the architecture doc's module-boundary
rules) rather than re-modeling the same 20+ fields a second time.

Every genuinely nested/conditional question from the forms (e.g.
"do you take medication? if yes, which ones") is modeled the same
way accounts.IdentityProfile already proved out: a boolean/choice
field plus a JSONField for the dependent multi-select, with the
"if yes then required" rule enforced in the serializer, not the DB.
"""
from django.db import models


# ---------------------------------------------------------------------------
# Hub model — one row per caregiver, everything else hangs off this.
# is_approved lives here (not on any single sub-form) because approval is
# a cross-cutting decision that depends on ALL forms being complete, not
# just one of them.
# ---------------------------------------------------------------------------

class CaregiverProfile(models.Model):
    user_id = models.PositiveIntegerField(unique=True, db_index=True,verbose_name="شناسه کاربر")
    is_approved = models.BooleanField(default=False, verbose_name="تأیید شده")
    approved_by_user_id = models.PositiveIntegerField(null=True, blank=True, verbose_name="شناسه کاربر تأییدکننده")
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name="تاریخ و زمان تأیید")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "پروفایل مراقب"
        verbose_name_plural = "پروفایل‌های مراقب"

    def __str__(self):
        return f"CaregiverProfile(user_id={self.user_id})"


# ---------------------------------------------------------------------------
# Form 2 — نوع همکاری (work preferences / type of collaboration)
# ---------------------------------------------------------------------------

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
    """
    Nested-question example #2 from the request: "24h or specific hours,
    and if specific hours then which ones." MORNING/AFTERNOON/NIGHT are
    the "specific hours" branch and are mutually meaningful together
    (multi-select); 24H is the other branch. The conditional rule
    (enforced in the serializer): if "24h" is selected, no other shift
    should also be selected — they're alternatives, not additive.
    """
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


class CaregiverWorkPreferences(models.Model):
    profile = models.OneToOneField(CaregiverProfile, on_delete=models.CASCADE, related_name="work_preferences", verbose_name="پروفایل")

    collaboration_types = models.JSONField(default=list, help_text="چندانتخابی — لیستی از CollaborationType", verbose_name="نوع همکاری")
    work_status = models.CharField(max_length=20, choices=WorkStatus.choices, verbose_name="وضعیت کار")
    family_presence_preference = models.CharField(max_length=20, choices=FamilyPresencePreference.choices, verbose_name="ترجیح حضور خانواده")
    accepted_gender = models.CharField(max_length=20, choices=AcceptedGender.choices, verbose_name="جنسیت پذیرفته")
    accepted_age_ranges = models.JSONField(default=list, help_text="چندانتخابی — لیستی از AcceptedAgeRange", verbose_name="محدوده سنی پذیرفته")
    offered_services = models.JSONField(default=list, help_text="چندانتخابی — لیستی از OfferedService", verbose_name="خدمات پیشنهادی")
    accepted_physical_conditions = models.JSONField(default=list, help_text="چندانتخابی", verbose_name="شرایط فیزیکی پذیرفته")
    lifting_capacity = models.CharField(max_length=20, choices=LiftingCapacity.choices, verbose_name="ظرفیت جابجایی اجسام فیزیکی")
    service_locations = models.JSONField(default=list, help_text="چندانتخابی — لیستی از ServiceLocation", verbose_name="محل‌های خدماتی")
    max_commute_time = models.CharField(max_length=20, choices=MaxCommuteTime.choices, blank=True, verbose_name="حداکثر زمان رفت‌وآمد")
    available_days = models.JSONField(default=list, help_text="چندانتخابی — لیستی از Weekday", verbose_name="روزهای در دسترس")
    available_shifts = models.JSONField(default=list, help_text="چندانتخابی — لیستی از Shift؛ نکته تودرتو در کلاس Shift", verbose_name="شیفت‌های در دسترس")
    commute_methods = models.JSONField(default=list, blank=True, help_text="چندانتخابی — لیستی از CommuteMethod", verbose_name="روش‌های مسافرت")
    smoking_status = models.CharField(max_length=20, choices=SmokingStatus.choices, blank=True, verbose_name="وضعیت استعمال دخانیات")
    pets_ok = models.BooleanField(null=True, blank=True, verbose_name="پذیرش حیوان خانگی")
    holiday_work_ok = models.BooleanField(null=True, blank=True, verbose_name="پذیرش کار در روزهای تعطیل")
    overnight_stay_ok = models.BooleanField(null=True, blank=True, verbose_name="پذیرش اقامت شبانه روزی")

    # چهار چک‌باکس تأییدیه فرم ۲ — به یک فیلد جمع شده چون هر چهار مورد
    # با هم باید تأیید شوند تا فرم قابل ثبت باشد (اعتبارسنجی در serializer)
    terms_accepted = models.BooleanField(default=False, verbose_name="تأییدیه‌ها")
    terms_accepted_at = models.DateTimeField(null=True, blank=True, verbose_name="تاریخ و زمان تأییدیه‌ها")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "شرایط همکاری مراقب"
        verbose_name_plural = "شرایط همکاری مراقبان"

    def __str__(self):
        return f"CaregiverWorkPreferences(profile_id={self.profile_id})"


class CaregiverServiceArea(models.Model):
    """
    Nested-question example #1 from the request: province -> city ->
    district. Modeled as a proper related table (one row per
    province/city/district combination the caregiver covers) rather
    than a deeply nested JSON blob, so a caregiver covering multiple
    separate districts is a clean multi-row relation, not an
    ever-deeper nested structure to parse.
    """
    profile = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name="service_areas", verbose_name="پروفایل مراقب")
    province = models.CharField(max_length=100, verbose_name="استان")
    city = models.CharField(max_length=100, blank=True, verbose_name="شهر")
    district = models.CharField(max_length=100, blank=True, verbose_name="منطقه")

    class Meta:
        unique_together = ("profile", "province", "city", "district")
        verbose_name = "منطقه خدماتی مراقب"
        verbose_name_plural = "مناطق خدماتی مراقبان"

    def __str__(self):
        return f"{self.province}/{self.city}/{self.district}"


# ---------------------------------------------------------------------------
# Form 3, part 1 — سوابق کاری (work history)
# ---------------------------------------------------------------------------

class ExperienceRange(models.TextChoices):
    """
    Shared by both experience-length questions in Form 3. The source
    document's first question (سابقه فعالیت در حوزه مراقبت از سالمند)
    had its option text left as unfinished Latin transliteration
    (nadarad/kamtar az 1 sal/beyne yek ta 5/bishtar az 5) rather than
    Persian — inferred as the Persian equivalent of the same four-point
    scale used cleanly in the second question, but this should be
    confirmed with the product team, the same way earlier placeholder
    fields in the patient questionnaire were flagged rather than
    silently guessed.
    """
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


class CaregiverExperience(models.Model):
    profile = models.OneToOneField(CaregiverProfile, on_delete=models.CASCADE, related_name="experience", verbose_name="پروفایل مراقب")

    elderly_care_experience = models.CharField(max_length=20, choices=ExperienceRange.choices, verbose_name="تجربه مراقبت از سالمندان")
    other_services_experience = models.CharField(max_length=20, choices=ExperienceRange.choices, blank=True, verbose_name="تجربه خدمات دیگر")
    previous_workplaces = models.JSONField(default=list, blank=True, help_text="چندانتخابی", verbose_name="محلهای پیشین کار")
    patients_cared_for_count = models.CharField(max_length=20, choices=PatientsCaredForCount.choices, blank=True, verbose_name="تعداد بیماران مراقبت شده")
    special_conditions_experience = models.JSONField(default=list, blank=True, help_text="چندانتخابی", verbose_name="تجربه شرایط ویژه")
    live_in_experience = models.BooleanField(null=True, blank=True, verbose_name="تجربه مراقبت در محل")
    couple_care_experience = models.BooleanField(null=True, blank=True, verbose_name="تجربه مراقبت از زوج")
    solo_elderly_care_experience = models.BooleanField(null=True, blank=True, verbose_name="تجربه مراقبت تنها از سالمند")
    driving_for_patient_experience = models.BooleanField(null=True, blank=True, verbose_name="تجربه رانندگی برای بیمار")
    last_workplace = models.CharField(max_length=200, blank=True, verbose_name="آخرین محل کار")
    additional_notes = models.TextField(blank=True, max_length=500, verbose_name="یادداشت‌های اضافی")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "سوابق کاری مراقب"
        verbose_name_plural = "سوابق کاری مراقبان"

    def __str__(self):
        return f"CaregiverExperience(profile_id={self.profile_id})"


# ---------------------------------------------------------------------------
# Form 3, part 2 — مهارت‌ها و توانمندی‌ها (skills)
# ---------------------------------------------------------------------------

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
    """
    The earlier caregiver form (already documented) used "سبک" for the
    weakest level, and the product decision at the time — noted directly
    by the person building this form — was to relabel it "ضعیف" since it
    describes ability, not body weight. This resend reverted to "سبک" in
    the raw text; the earlier correction is kept applied here rather than
    silently re-introducing the ambiguous label.
    """
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


class CaregiverSkills(models.Model):
    profile = models.OneToOneField(CaregiverProfile, on_delete=models.CASCADE, related_name="skills", verbose_name="پروفایل مراقب")

    education_level = models.CharField(max_length=20, choices=EducationLevel.choices, verbose_name="سطح تحصیلات")
    field_of_study = models.CharField(max_length=150, blank=True, verbose_name="رشته تحصیلی")
    training_courses = models.JSONField(default=list, blank=True, help_text="چندانتخابی", verbose_name="دوره‌های آموزشی")
    communication_skills = models.JSONField(default=list, blank=True, help_text="چندانتخابی", verbose_name="مهارت‌های ارتباطی")
    caregiving_skills = models.JSONField(default=list, blank=True, help_text="چندانتخابی", verbose_name="مهارت‌های مراقبتی")
    physical_ability = models.CharField(max_length=20, choices=PhysicalAbility.choices, blank=True, verbose_name="توانایی فیزیکی")
    mobility_assistance_ability = models.JSONField(default=list, blank=True, help_text="چندانتخابی", verbose_name="توانایی کمک به حرکت")
    household_skills = models.JSONField(default=list, blank=True, help_text="چندانتخابی", verbose_name="مهارت‌های خانگی")
    foreign_languages = models.JSONField(default=list, blank=True, help_text="چندانتخابی", verbose_name="زبان‌های خارجی")
    local_languages = models.JSONField(default=list, blank=True, help_text="چندانتخابی", verbose_name="زبان‌های محلی")
    has_driving_license = models.BooleanField(null=True, blank=True, verbose_name="دارا بودن گواهینامه رانندگی")
    has_personal_car = models.BooleanField(null=True, blank=True, verbose_name="دارا بودن ماشین شخصی")

    # سؤال منبع فقط دو گزینه «بلدم / بلد نیستم» داشت (نه مقیاس چهارتایی) —
    # بولین ساده، دقیقاً منطبق با سؤال، نه یک مقیاس فرضی.
    can_use_smartphone = models.BooleanField(null=True, blank=True, verbose_name="توانایی استفاده از گوشی هوشمند")

    preferred_messaging_apps = models.JSONField(default=list, blank=True, help_text="چندانتخابی", verbose_name="اپلیکیشن‌های پیام رسانی")
    additional_notes = models.TextField(blank=True, max_length=500, verbose_name="یادداشت‌های اضافی")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "مهارت‌های مراقب"
        verbose_name_plural = "مهارت‌های مراقبان"

    def __str__(self):
        return f"CaregiverSkills(profile_id={self.profile_id})"


# ---------------------------------------------------------------------------
# Form 4 — معرف‌ها (references)
# ---------------------------------------------------------------------------

class ReferenceRelationType(models.TextChoices):
    FAMILY = "family", "خانواده"
    FRIENDS = "friends", "دوستان"
    FORMER_COLLEAGUE = "former_colleague", "همکار سابق"
    TRUSTED_ACQUAINTANCE = "trusted_acquaintance", "آشنای مورد اعتماد"


class AcquaintanceDuration(models.TextChoices):
    """
    Source options were left partly transliterated (kamtar az 1 sal /
    beyne 1 ta 5 / zamane kheyli zyadist) — mapped to the equivalent
    three-point scale; "zamane kheyli zyadist" ("a very long time") is
    interpreted as "بیش از ۵ سال" to match the four-point pattern used
    elsewhere in these forms, flagged the same way as other inferred
    option text in this codebase.
    """
    UNDER_1_YEAR = "under_1_year", "کمتر از ۱ سال"
    ONE_TO_5_YEARS = "1_to_5_years", "بین ۱ تا ۵ سال"
    OVER_5_YEARS = "over_5_years", "بیش از ۵ سال (مدت زمان زیادی)"


class CaregiverReference(models.Model):
    """At least two of these are required per caregiver — enforced in
    the serializer/service layer at submission time, not the DB, since
    the DB can't know "how many siblings of this row exist" as a
    per-profile minimum."""
    profile = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name="references")

    full_name = models.CharField(max_length=150, verbose_name="نام کامل")
    occupation = models.CharField(max_length=150, verbose_name="شغل")
    relation_type = models.CharField(max_length=30, choices=ReferenceRelationType.choices, verbose_name="نوع رابطه")
    acquaintance_duration = models.CharField(max_length=20, choices=AcquaintanceDuration.choices, blank=True, verbose_name="مدت آشنایی")
    phone_number = models.CharField(max_length=15, verbose_name="شماره تلفن")
    callable_for_inquiry = models.BooleanField(default=True, verbose_name="امکان تماس جهت استعلام")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "معرف مراقب"
        verbose_name_plural = "معرف‌های مراقب"

    def __str__(self):
        return f"CaregiverReference({self.full_name})"
