from django.db import models
from django.utils.crypto import get_random_string
from django_jalali.db import models as jmodels

# Excludes visually-ambiguous characters (0/O, 1/I/L) — these codes are
# meant to be read aloud or typed by hand between family members, not
# copy-pasted.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def _generate_unique_code(model, prefix: str) -> str:
    while True:
        candidate = f"{prefix}-{get_random_string(6, _CODE_ALPHABET)}"
        if not model.objects.filter(access_code=candidate).exists():
            return candidate


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
    access_code = models.CharField(
        max_length=20, unique=True, editable=False, verbose_name="کد عضو خانواده",
        help_text="کد یکتا برای دعوت این عضو خانواده توسط یک بیمار — مثلاً FAM-92K7XQ",
    )
    display_name = models.CharField(max_length=150, blank=True, help_text="نام نمایشی")
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

    def save(self, *args, **kwargs):
        if not self.access_code:
            self.access_code = _generate_unique_code(FamilyProfile, "FAM")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.display_name or self.user.username


class GuardianshipStatus(models.TextChoices):
    NONE = "none", "ندارد"
    LEGAL_GUARDIAN = "legal_guardian", "قیم قانونی دارد"
    TRUSTEE = "trustee", "وصی دارد"


class Gender(models.TextChoices):
    """A separate copy from apps.caregivers.choices.Gender, not a
    shared import — families and caregivers don't depend on each
    other's Python modules anywhere else in this codebase (only on
    each other's models, via string FK in apps.care), and this two-
    value enum isn't worth a new cross-app coupling to avoid
    duplicating."""
    FEMALE = "female", "زن"
    MALE = "male", "مرد"


class PatientPhysicalCondition(models.TextChoices):
    """Same duplication convention as Gender above — mirrors
    apps.caregivers.choices.AcceptedPhysicalCondition's values
    exactly (minus NO_PREFERENCE, which only makes sense from the
    caregiver's acceptance side, not as a description of the
    patient's actual condition) so the two sides are directly
    comparable in apps.care.matching.specialization, without a new
    cross-app import."""
    INDEPENDENT = "independent", "سالمند مستقل"
    LOW_MOBILITY = "low_mobility", "سالمند کم‌توان (همراهی در راه رفتن)"
    LIMITED_MOBILITY_BEDRIDDEN = "limited_mobility_bedridden", "سالمند دارای محدودیت حرکتی (روی تخت)"
    BEDRIDDEN_DIAPER = "bedridden_diaper", "سالمند بستری در منزل (پوشکی)"
    ALZHEIMERS = "alzheimers", "سالمند مبتلا به آلزایمر"
    PARKINSONS = "parkinsons", "سالمند مبتلا به پارکینسون"
    HOSPITAL_COMPANION_NEEDED = "hospital_companion_needed", "سالمند نیازمند همراهی بیمارستانی"


class NeededShift(models.TextChoices):
    """Same duplication convention as Gender above — mirrors
    apps.caregivers.choices.Shift's values exactly."""
    MORNING = "morning", "صبح"
    AFTERNOON = "afternoon", "عصر"
    NIGHT = "night", "شب"
    ALL_DAY = "24h", "شبانه‌روزی"


class RelationType(models.TextChoices):
    """Selectable, not free text — 'relation' showing up as an open
    text box meant everyone typed something slightly different
    ("فرزند" vs "دختر" vs "پسر" vs "Daughter"), which is bad both for
    the person filling the form (more typing, more to get wrong) and
    for anything downstream that might ever want to reason about
    relation type consistently."""
    CHILD = "child", "فرزند"
    SPOUSE = "spouse", "همسر"
    FATHER = "father", "پدر"
    MOTHER = "mother", "مادر"
    SIBLING = "sibling", "خواهر / برادر"
    GRANDCHILD = "grandchild", "نوه"
    OTHER = "other", "سایر"


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
    access_code = models.CharField(
        max_length=20, unique=True, editable=False, verbose_name="کد بیمار",
        help_text="کد یکتا برای دعوت اعضای خانواده توسط این بیمار — مثلاً ELD-7K4P9X",
    )

    full_name = models.CharField(max_length=150, help_text="نام و نام خانوادگی سالمند")
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True, help_text="جنسیت")
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

    # Structured care-need fields, added specifically so the matching
    # tie-breaker (apps/care/matching/specialization.py) has something
    # concrete to compare against the caregiver's own
    # accepted_physical_conditions/available_shifts — the free-text
    # basic_medical_info field above was never meant to be parsed
    # programmatically, and isn't.
    physical_condition = models.CharField(
        max_length=30, choices=PatientPhysicalCondition.choices, blank=True,
        help_text="شرایط جسمانی فعلی سالمند — برای تطبیق با تخصص مراقب در سیستم تطبیق",
    )
    needed_shifts = models.JSONField(
        default=list, blank=True,
        help_text="شیفت‌های زمانی مورد نیاز برای مراقبت (چندانتخابی از NeededShift)",
    )

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "پروفایل بیمار"
        verbose_name_plural = "پروفایل‌های بیمار"

    def save(self, *args, **kwargs):
        if not self.access_code:
            self.access_code = _generate_unique_code(PatientProfile, "ELD")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.full_name


class LinkStatus(models.TextChoices):
    PENDING = "pending", "در انتظار تأیید"
    APPROVED = "approved", "تأییدشده"
    REJECTED = "rejected", "رد شده"


class AccessLevel(models.TextChoices):
    FULL = "full_access", "دسترسی کامل"
    VIEW_ONLY = "view_only", "فقط مشاهده"


class FamilyPatientLink(models.Model):
    """
    Many-to-many: a patient can be overseen by more than one family
    account (siblings coordinating care), and a family can manage more
    than one patient (father, mother, grandmother simultaneously).

    Two ways this gets created, matching the two real-world directions
    of the relationship: a family member requests access using the
    patient's access_code (status starts PENDING, needs the patient or
    an already-approved family member to approve it — they're asking
    someone else's permission), or the patient (or an already-approved
    family member acting on their behalf) invites a family member
    using that family member's access_code (status is APPROVED
    immediately — the patient side already has the authority to grant
    it, no second approval needed).
    """
    family = models.ForeignKey(FamilyProfile, on_delete=models.CASCADE, related_name="patient_links", verbose_name="خانواده")
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="family_links", verbose_name="سالمند")
    relation = models.CharField(max_length=50, choices=RelationType.choices, default=RelationType.OTHER, help_text="نسبت")
    is_primary_contact = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=LinkStatus.choices, default=LinkStatus.APPROVED, verbose_name="وضعیت")
    access_level = models.CharField(max_length=20, choices=AccessLevel.choices, default=AccessLevel.FULL, verbose_name="سطح دسترسی")
    approved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="approved_family_links", verbose_name="تأییدشده توسط",
    )
    approved_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان تأیید")
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


class TimingStrictnessScale(models.TextChoices):
    """Shared by meal_time_strictness and medication_timing_priority —
    both questions ask the same underlying thing (how strictly must a
    daily schedule be kept for this patient) and previously sat on the
    generic IntensityScale as an unconfirmed placeholder. Resolved with
    product-facing option text of its own rather than staying on a
    scale meant for unrelated questions; see docs/MATCHING.md."""
    VERY_STRICT = "very_strict", "بسیار مهم است و باید دقیقاً رعایت شود"
    MODERATELY_STRICT = "moderately_strict", "نسبتاً مهم است، کمی تأخیر قابل قبول است"
    FLEXIBLE = "flexible", "چندان مهم نیست، انعطاف‌پذیر است"
    NOT_IMPORTANT = "not_important", "اهمیتی ندارد"


class ExpressionWillingnessScale(models.TextChoices):
    """Resolved placeholder for willingness_to_express_opinion — how
    often the patient actually speaks their mind, distinct from the
    generic IntensityScale it borrowed before confirmation; see
    docs/MATCHING.md."""
    VERY_WILLING = "very_willing", "همیشه نظر خود را بیان می‌کند"
    SOMEWHAT_WILLING = "somewhat_willing", "بیشتر مواقع نظر خود را می‌گوید"
    RARELY_WILLING = "rarely_willing", "به‌ندرت نظر خود را بیان می‌کند"
    NOT_WILLING = "not_willing", "تمایلی به بیان نظر ندارد"


class PatientCompatibilityQuestionnaire(models.Model):
    """
    One row per patient. Twelve questions across seven axes, exactly as
    specified in the source form. Three questions only said "گزینه‌ای"
    (multiple-choice) in the source without listing the actual option
    text; their real option sets (TimingStrictnessScale,
    ExpressionWillingnessScale) have since been confirmed and are
    documented in docs/MATCHING.md, replacing the earlier IntensityScale
    placeholder.
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
        max_length=20, choices=TimingStrictnessScale.choices,
        verbose_name="سختی در رعایت زمان وعده غذایی"
    )
    special_diet_preference = models.CharField(max_length=20, choices=YesNoPartial.choices, verbose_name="ترجیح داشتن رژیم خاص")

    # محور جهت‌گیری زمانی (Time-orientation axis)
    medication_timing_priority = models.CharField(
        max_length=20, choices=TimingStrictnessScale.choices,
        verbose_name="اهمیت زمان‌بندی داروها"
    )

    # محور تفاوت فرهنگی/نسلی (Cultural / generational difference axis)
    accent_customs_annoyance = models.CharField(max_length=20, choices=DisturbanceScale.choices, verbose_name="آزردگی از لهجه یا رسوم متفاوت مراقب")
    cultural_respect_expectation = models.CharField(max_length=20, choices=YesNoPartial.choices, verbose_name="انتظار احترام فرهنگی")

    # محور انعطاف‌پذیری کلی (General flexibility axis)
    willingness_to_express_opinion = models.CharField(
        max_length=20, choices=ExpressionWillingnessScale.choices,
        verbose_name="آمادگی برای بیان نظر"
    )

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "پرسشنامه سازگاری بیمار"
        verbose_name_plural = "پرسشنامه‌های سازگاری بیمار"

    def __str__(self):
        return f"پرسشنامه سازگاری — {self.patient.full_name}"
