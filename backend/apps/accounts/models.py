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
    phone_number = models.CharField(max_length=15, unique=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.FAMILY)
    is_phone_verified = models.BooleanField(default=False)
    national_id = models.CharField(max_length=10, blank=True, null=True, unique=True)

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
        "accounts.User", on_delete=models.CASCADE, related_name="identity_profile"
    )

    # --- ۱. مشخصات هویتی --- (first_name/last_name already on User)
    father_name = models.CharField(max_length=150)
    birth_certificate_number = models.CharField(max_length=30)
    birth_certificate_issue_place = models.CharField(max_length=150)
    birth_date = models.DateField()
    gender = models.CharField(max_length=10, choices=Gender.choices)
    marital_status = models.CharField(max_length=20, choices=MaritalStatus.choices)
    children_count = models.CharField(max_length=20, choices=ChildrenCount.choices)
    military_status = models.CharField(
        max_length=30, choices=MilitaryStatus.choices, blank=True, null=True,
        help_text="فقط برای جنسیت مرد — برای زن باید خالی بماند",
    )

    # --- ۲. اطلاعات فردی ---
    height_range = models.CharField(max_length=20, choices=HeightRange.choices, blank=True)
    weight_range = models.CharField(max_length=20, choices=WeightRange.choices, blank=True)
    ethnicities = models.JSONField(default=list, blank=True, help_text="چندانتخابی — لیستی از مقادیر Ethnicity")

    # --- ۳. وضعیت سلامت ---
    has_chronic_disease = models.BooleanField()
    chronic_disease_types = models.JSONField(default=list, blank=True)
    takes_permanent_medication = models.BooleanField(default=False)
    medication_types = models.JSONField(default=list, blank=True)

    # --- ۴. اطلاعات تماس --- (phone_number/email already on User)
    emergency_contact_phone = models.CharField(max_length=15)
    emergency_contact_relation = models.CharField(max_length=20, choices=EmergencyContactRelation.choices)
    landline_phone = models.CharField(max_length=15, blank=True)

    # --- ۵. محل سکونت ---
    province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    full_address = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"IdentityProfile(user_id={self.user_id})"
