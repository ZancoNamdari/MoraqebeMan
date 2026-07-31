from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    """
    Six-role model for the platform:
    - SUPERUSER: full platform access, only role that can change other
      users' roles and edit global settings.
    - ADMIN: admin-panel operator (profile approval, violation reports,
      blacklist). Finer distinctions (agent vs admin vs superuser panels)
      are modeled as Django permission groups under this role, not as
      separate role values.
    - AGENCY: B2B corporate account; sponsors FAMILY accounts.
    - FAMILY: the account holder who registers, searches, messages, pays.
    - PATIENT: the care recipient. May or may not have their own login.
    - CAREGIVER: the service provider.
    """
    SUPERUSER = "superuser", "سوپریوزر"
    ADMIN = "admin", "ادمین / کارشناس"
    AGENCY = "agency", "آژانس / شرکت"
    FAMILY = "family", "خانواده"
    PATIENT = "patient", "بیمار / سالمند"
    CAREGIVER = "caregiver", "مراقب"


class User(AbstractUser):
    phone_number = models.CharField(max_length=15, unique=True, help_text="شماره موبایل (با کد کشور، بدون صفر اول)",verbose_name="شماره موبایل")
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.FAMILY, verbose_name="نقش")
    is_phone_verified = models.BooleanField(default=False, verbose_name="تأیید شماره موبایل")
    national_id = models.CharField(max_length=10, blank=True, null=True, unique=True, verbose_name="شناسه ملی")

    class Meta:
        verbose_name = "کاربر"
        verbose_name_plural = "کاربران"

    REQUIRED_FIELDS = ["email", "phone_number"]

    def save(self, *args, **kwargs):
        # Keep Django's own staff/superuser flags in sync with our role
        # field, so admin-site access and DRF's IsAdminUser keep working.
        if self.role == UserRole.SUPERUSER:
            self.is_staff = True
            self.is_superuser = True
        elif self.role == UserRole.ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"


# ---------------------------------------------------------------------------
# IdentityProfile — Form 1 (اطلاعات هویتی و اولیه) from the real caregiver
# onboarding forms. Lives in identity_service (not caregiver_service)
# because this is genuine KYC/identity data, not caregiver-specific
# business data — the same shape is reusable if PATIENT or FAMILY accounts
# ever need identity verification too, which is why it's modeled as a
# generic one-to-one extension of User rather than nested inside a
# caregiver-only profile.
# ---------------------------------------------------------------------------

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
    COMPLETED = "completed", "پایان خدمت"
    PERMANENT_EXEMPTION = "permanent_exemption", "معافیت دائم"
    TEMPORARY_EXEMPTION = "temporary_exemption", "معافیت موقت"
    IN_SERVICE = "in_service", "در حال خدمت"


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


class IdentityProfile(models.Model):
    """
    One row per User — Form 1 of the onboarding flow. national_id already
    lives on User (needed there for uniqueness/login-adjacent lookups);
    everything else specific to Form 1 lives here so User itself doesn't
    balloon with fields that only some roles (mainly CAREGIVER, and later
    possibly PATIENT) actually fill in.
    """
    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="identity_profile", verbose_name="پروفایل هویتی"
    )

    # --- ۱. مشخصات هویتی --- (first_name/last_name already on User)
    father_name = models.CharField(max_length=150, verbose_name="نام پدر")
    birth_certificate_number = models.CharField(max_length=30, verbose_name="شماره گواهی تولد")
    birth_certificate_issue_place = models.CharField(max_length=150, verbose_name="محل صدور گواهی تولد")
    birth_date = models.DateField(verbose_name="تاریخ تولد")
    gender = models.CharField(max_length=10, choices=Gender.choices, verbose_name="جنسیت")
    marital_status = models.CharField(max_length=20, choices=MaritalStatus.choices, verbose_name="وضعیت تاهل")
    children_count = models.CharField(max_length=20, choices=ChildrenCount.choices, verbose_name="تعداد فرزندان")
    military_status = models.CharField(
        max_length=30, choices=MilitaryStatus.choices, blank=True, null=True,
        help_text="فقط برای جنسیت مرد — برای زن باید خالی بماند",
        verbose_name="وضعیت نظام وظیفه"
    )

    # --- ۲. اطلاعات فردی ---
    height_range = models.CharField(max_length=20, choices=HeightRange.choices, blank=True, verbose_name="محدوده قد")
    weight_range = models.CharField(max_length=20, choices=WeightRange.choices, blank=True, verbose_name="محدوده وزن")
    ethnicities = models.JSONField(default=list, blank=True, help_text="چندانتخابی — لیستی از مقادیر Ethnicity", verbose_name="اقليت‌ها")

    # --- ۳. وضعیت سلامت ---
    has_chronic_disease = models.BooleanField(verbose_name="آیا بیماری مزمن دارید?")
    chronic_disease_types = models.JSONField(default=list, blank=True, verbose_name="انواع بیماری‌های مزمن")
    takes_permanent_medication = models.BooleanField(default=False, verbose_name="آیا داروی دائمی مصرف می‌کنید?")
    medication_types = models.JSONField(default=list, blank=True, verbose_name="انواع داروها")

    # --- ۴. اطلاعات تماس --- (phone_number/email already on User)
    emergency_contact_phone = models.CharField(max_length=15, verbose_name="شماره تماس اضطراری")
    emergency_contact_relation = models.CharField(max_length=20, choices=EmergencyContactRelation.choices, verbose_name="نسبت به تماس اضطراری")
    landline_phone = models.CharField(max_length=15, blank=True, verbose_name="شماره تلفن ثابت")

    # --- ۵. محل سکونت ---
    province = models.CharField(max_length=100, verbose_name="استان")
    city = models.CharField(max_length=100, verbose_name="شهر")
    district = models.CharField(max_length=100, verbose_name="منطقه")
    postal_code = models.CharField(max_length=10, verbose_name="کد پستی")
    full_address = models.TextField(verbose_name="آدرس کامل")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "پروفایل هویتی"
        verbose_name_plural = "پروفایل‌های هویتی"

    def __str__(self):
        return f"IdentityProfile(user_id={self.user_id})"
