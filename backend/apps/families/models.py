from django.db import models
from django_jalali.db import models as jmodels


class FamilyProfile(models.Model):
    """One row per FAMILY-role user. Was a plain integer user_id (no real
    FK) from when this app was designed as a separate family_service with
    no direct DB access to identity_service's User table — modernized to
    a real ForeignKey now that this has been a single monolith with one
    shared User table for a long time; apps.caregivers made this same
    change earlier, this app just hadn't caught up yet."""
    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="family_profile", verbose_name="کاربر"
    )
    display_name = models.CharField(max_length=150, help_text="نام نمایشی")
    province = models.ForeignKey(
        "locations.Province", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="استان")
    city = models.ForeignKey(
        "locations.City", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="شهر")
    legacy_city_text = models.CharField(
        max_length=100, blank=True, verbose_name="شهر (متن قدیمی)",
        help_text="مقدار قبلی فیلد شهر پیش از تبدیل به فیلد ساختاریافته — برای مراجعه در صورت نیاز نگه داشته شده.",
    )
    address = models.TextField(blank=True, help_text="نشانی")
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "پروفایل خانواده"
        verbose_name_plural = "پروفایل‌های خانواده"

    def __str__(self):
        return self.display_name or self.user.username


class GuardianshipStatus(models.TextChoices):
    NONE = "none", "ندارد"
    LEGAL_GUARDIAN = "legal_guardian", "قیم قانونی دارد"
    TRUSTEE = "trustee", "وصی دارد"


class PatientProfile(models.Model):
    """
    Tab 1 of the patient onboarding form (اطلاعات هویتی). `user` is
    deliberately nullable — per the platform's role model, a PATIENT is
    frequently a *dependent* profile managed entirely by a FAMILY account
    with no login of their own (unlike CAREGIVER, which always requires
    its own account). That's why this lives in apps.families rather than
    as a User-linked identity profile the way the caregiver's
    IdentityProfile does — not a leftover service boundary, an actual
    reflection of "this record may have no account behind it at all."
    """
    user = models.OneToOneField(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="patient_profile", verbose_name="کاربر",
    )

    full_name = models.CharField(max_length=150, help_text="نام و نام خانوادگی سالمند")
    father_name = models.CharField(max_length=150, blank=True, help_text="نام پدر")
    birth_date = jmodels.jDateField(null=True, blank=True, help_text="تاریخ تولد")
    national_id = models.CharField(max_length=10, blank=True, help_text="شماره ملی")
    birth_certificate_number = models.CharField(max_length=30, blank=True, help_text="شماره شناسنامه")
    birth_certificate_issue_place = models.CharField(max_length=150, blank=True, help_text="محل صدور شناسنامه")

    full_address = models.TextField(blank=True, help_text="نشانی کامل محل سکونت (شهر، خیابان، پلاک، واحد)")
    province = models.ForeignKey(
        "locations.Province", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="استان")
    city = models.ForeignKey(
        "locations.City", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="شهر")
    district = models.ForeignKey(
        "locations.District", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="منطقه")
    postal_code = models.CharField(max_length=10, blank=True, help_text="کد پستی")

    emergency_contact_phone = models.CharField(
        max_length=15, blank=True, help_text="شماره تماس اضطراری یکی از اعضای خانواده یا سرپرست"
    )

    guardianship_status = models.CharField(
        max_length=20, choices=GuardianshipStatus.choices, default=GuardianshipStatus.NONE,
        help_text="وضعیت حقوقی/سرپرستی — آیا وصی یا قیم قانونی دارد؟",
    )
    guardian_details = models.TextField(
        blank=True, help_text="نام/اطلاعات تماس وصی یا قیم قانونی، در صورت وجود"
    )

    language_dialect = models.CharField(max_length=100, blank=True, help_text="زبان و گویش")
    basic_medical_info = models.TextField(
        blank=True, help_text="اطلاعات پزشکی پایه — بیماری‌های مهم و نیازهای ویژه"
    )

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "پروفایل بیمار"
        verbose_name_plural = "پروفایل‌های بیمار"

    def __str__(self):
        return self.full_name


class FamilyPatientLink(models.Model):
    """Many-to-many: a patient can be overseen by more than one family
    account (siblings coordinating care), and a family can manage more
    than one patient (father, mother, grandmother simultaneously)."""
    family = models.ForeignKey(FamilyProfile, on_delete=models.CASCADE, related_name="patient_links", verbose_name="خانواده")
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="family_links", verbose_name="سالمند")
    relation = models.CharField(max_length=50, help_text="نسبت، مثلاً فرزند/همسر/سرپرست")
    is_primary_contact = models.BooleanField(default=True)
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        unique_together = ("family", "patient")
        verbose_name = "ارتباط خانواده و بیمار"
        verbose_name_plural = "ارتباط‌های خانواده و بیمار"

    def __str__(self):
        return f"{self.family} ↔ {self.patient} ({self.relation})"


# ---------------------------------------------------------------------------
# Tab 2 — سؤالات پرسشنامه (compatibility questionnaire). Feeds directly into
# matching_service's scoring algorithm — this is cultural/psychological
# compatibility data, not medical/identity data, which is why it's a
# separate model from PatientProfile rather than more JSON fields bolted
# onto it.
#
# Reusable answer scales — several questions in the source form share the
# exact same option set, so each scale is defined once and reused.
# ---------------------------------------------------------------------------

class AgreementScale(models.TextChoices):
    STRONGLY_AGREE = "strongly_agree", "کاملاً موافقم"
    SOMEWHAT_AGREE = "somewhat_agree", "تاحدی موافق"
    SOMEWHAT_DISAGREE = "somewhat_disagree", "تاحدی مخالف"
    STRONGLY_DISAGREE = "strongly_disagree", "کاملاً مخالف"


class IntensityScale(models.TextChoices):
    VERY_HIGH = "very_high", "خیلی زیاد"
    MODERATE = "moderate", "نسبتاً"
    LOW = "low", "کم"
    NONE = "none", "اصلاً"


class YesNoPartial(models.TextChoices):
    YES = "yes", "بله"
    NO = "no", "خیر"
    PARTIALLY = "partially", "تاحدی"


class AcceptanceScale(models.TextChoices):
    FULLY_ACCEPT = "fully_accept", "کاملاً می‌پذیرم"
    MOSTLY_ACCEPT = "mostly_accept", "نسبتاً می‌پذیرم"
    RELUCTANTLY_ACCEPT = "reluctantly_accept", "به سختی می‌پذیرم"
    REJECT = "reject", "قطعاً رد می‌کنم"


class DisturbanceScale(models.TextChoices):
    NOT_AT_ALL = "not_at_all", "اصلاً"
    SLIGHTLY = "slightly", "کمی"
    A_LOT = "a_lot", "زیاد"
    VERY_MUCH = "very_much", "خیلی زیاد"


class PatientCompatibilityQuestionnaire(models.Model):
    """
    One row per patient. Twelve questions across seven axes, exactly as
    specified in the source form. Three questions (marked below) only
    said "گزینه‌ای" (multiple-choice) in the source without listing the
    actual option text — those three default to IntensityScale as the
    closest fit given the question wording, but this is a placeholder:
    confirm the real option text with the product team before this goes
    live, the same way earlier form corrections were flagged and applied.
    """
    patient = models.OneToOneField(
        PatientProfile, on_delete=models.CASCADE, related_name="compatibility_questionnaire", verbose_name="سالمند"
    )

    # محور عقیدتی-مناسکی (Religious-ritual axis)
    religious_beliefs_priority = models.CharField(max_length=20, choices=AgreementScale.choices, verbose_name="اهمیت باورهای دینی")
    new_treatment_openness = models.CharField(max_length=20, choices=IntensityScale.choices, verbose_name="باز بودن به درمان جدید")

    # محور جمع‌گرایی/فاصله قدرت (Collectivism / power-distance axis)
    caregiver_as_family_member = models.CharField(max_length=20, choices=YesNoPartial.choices, verbose_name="مراقب به عنوان عضو خانواده")
    respectful_disagreement_acceptance = models.CharField(max_length=20, choices=AcceptanceScale.choices, verbose_name="پذیرش نظرات مخالف با احترام")

    # محور حریم خصوصی (Privacy axis)
    privacy_comfort_with_caregiver = models.CharField(max_length=20, choices=YesNoPartial.choices, verbose_name="راحتی در حضور مراقب")

    # محور سبک زندگی (Lifestyle axis)
    noise_smell_sensitivity = models.CharField(max_length=20, choices=IntensityScale.choices, verbose_name="حساسیت به صدا و بو")
    meal_time_strictness = models.CharField(
        max_length=20, choices=IntensityScale.choices,
        help_text="⚠️ گزینه‌های دقیق در سند منبع مشخص نشده بود — placeholder، نیاز به تأیید محصول",
        verbose_name="سختی در رعایت زمان وعده غذایی"
    )
    special_diet_preference = models.CharField(max_length=20, choices=YesNoPartial.choices, verbose_name="ترجیح داشتن رژیم خاص")

    # محور جهت‌گیری زمانی (Time-orientation axis)
    medication_timing_priority = models.CharField(
        max_length=20, choices=IntensityScale.choices,
        help_text="⚠️ گزینه‌های دقیق در سند منبع مشخص نشده بود — placeholder، نیاز به تأیید محصول",
        verbose_name="اهمیت زمان‌بندی داروها"
    )

    # محور تفاوت فرهنگی/نسلی (Cultural / generational difference axis)
    accent_customs_annoyance = models.CharField(max_length=20, choices=DisturbanceScale.choices, verbose_name="آزردگی از لهجه یا رسوم متفاوت مراقب")
    cultural_respect_expectation = models.CharField(max_length=20, choices=YesNoPartial.choices, verbose_name="انتظار احترام فرهنگی")

    # محور انعطاف‌پذیری کلی (General flexibility axis)
    willingness_to_express_opinion = models.CharField(
        max_length=20, choices=IntensityScale.choices,
        help_text="⚠️ گزینه‌های دقیق در سند منبع مشخص نشده بود — placeholder، نیاز به تأیید محصول",
        verbose_name="آمادگی برای بیان نظر"
    )

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "پرسشنامه سازگاری بیمار"
        verbose_name_plural = "پرسشنامه‌های سازگاری بیمار"

    def __str__(self):
        return f"پرسشنامه سازگاری — {self.patient.full_name}"
