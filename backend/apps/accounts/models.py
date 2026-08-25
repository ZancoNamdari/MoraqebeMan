from django.contrib.auth.models import AbstractUser
from django.db import models
from unidecode import unidecode
import re


class UserRole(models.TextChoices):
    SUPERUSER = "superuser", "سوپریوزر"
    ADMIN = "admin", "ادمین / کارشناس"
    AGENCY = "agency", "آژانس / شرکت"
    AGENCY_SUPERVISOR = "agency_supervisor", "سوپروایزر آژانس"
    FAMILY = "family", "خانواده"
    PATIENT = "patient", "بیمار / سالمند"
    CAREGIVER = "caregiver", "مراقب"


class User(AbstractUser):
    first_name = models.CharField(max_length=50, verbose_name="نام")
    last_name = models.CharField(max_length=50, verbose_name="نام خانوادگی")
    username = models.CharField(max_length=150, unique=True, blank=True, verbose_name="نام کاربری")
    phone_number = models.CharField(max_length=15, unique=True, help_text="شماره موبایل (با کد کشور، بدون صفر اول)", verbose_name="شماره موبایل")
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.FAMILY, verbose_name="نقش")
    is_phone_verified = models.BooleanField(default=False, verbose_name=" شماره موبایل تایید شده است؟")
    national_id = models.CharField(max_length=10, blank=True, null=True, unique=True, verbose_name="کد ملی")

    class Meta:
        verbose_name = "کاربر"
        verbose_name_plural = "کاربران"

    REQUIRED_FIELDS = ["email", "phone_number"]

    def generate_username(self):
        first = unidecode(self.first_name).lower()
        last = unidecode(self.last_name).lower()

        base_username = f"{first}_{last}"

        base_username = re.sub(
            r"[^a-z0-9_]",
            "",
            base_username
        )

        base_username = base_username.strip("_")

        if not base_username:
            base_username = "user"

        username = base_username
        counter = 2

        while type(self).objects.filter(
            username=username
        ).exclude(pk=self.pk).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        return username

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.generate_username()

        # Keep Django's own staff/superuser flags in sync with the
        # business role field, so admin-site access and DRF's
        # IsAdminUser keep working. This is the exact behavior
        # create_admin (apps/accounts/management/commands/create_admin.py)
        # depends on: it sets role=SUPERUSER and expects save() to
        # cascade to is_staff/is_superuser automatically.
        if self.role == UserRole.SUPERUSER:
            self.is_staff = True
            self.is_superuser = True
        elif self.role == UserRole.ADMIN:
            self.is_staff = True
        elif not self.is_superuser:
            # Don't strip is_staff from an account that was made staff
            # directly via Django (e.g. createsuperuser bypassing role
            # entirely) — only reset it for accounts whose staff status
            # was role-derived in the first place.
            self.is_staff = False

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"