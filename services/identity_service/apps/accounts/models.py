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
