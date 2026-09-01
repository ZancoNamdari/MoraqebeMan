from django.core.validators import FileExtensionValidator
from django.db import models
from django_jalali.db import models as jmodels


class ComplaintCategory(models.TextChoices):
    SERVICE_QUALITY = "service_quality", "کیفیت خدمات"
    BEHAVIOR = "behavior", "رفتار نامناسب"
    PUNCTUALITY = "punctuality", "عدم رعایت زمان‌بندی"
    SAFETY_CONCERN = "safety_concern", "نگرانی ایمنی"
    FINANCIAL = "financial", "مسائل مالی"
    COMMUNICATION = "communication", "مشکل ارتباطی"
    OTHER = "other", "سایر"


class ComplaintStatus(models.TextChoices):
    OPEN = "open", "باز"
    UNDER_REVIEW = "under_review", "در حال بررسی"
    RESOLVED = "resolved", "حل‌شده"
    DISMISSED = "dismissed", "رد شده"


class PatientNoteCategory(models.TextChoices):
    ADDITIONAL_NEEDS = "additional_needs", "نیازهای اضافی افشا نشده"
    SAFETY_CONCERN = "safety_concern", "نگرانی ایمنی"
    FAMILY_BEHAVIOR = "family_behavior", "رفتار خانواده یا محیط"
    HEALTH_CHANGE = "health_change", "تغییر وضعیت سلامت"
    GENERAL_OBSERVATION = "general_observation", "مشاهده عمومی"
    OTHER = "other", "سایر"


# 10MB is generous for a spoken complaint (a few minutes of compressed
# audio) while still ruling out someone uploading an unrelated large
# file through this field — this is validated at the serializer level
# too (see CreateComplaintSerializer), this constant just keeps both
# checks using the same real number instead of two independently
# chosen ones that could drift apart.
MAX_VOICE_NOTE_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_VOICE_NOTE_EXTENSIONS = ["mp3", "m4a", "wav", "ogg", "webm", "aac"]


def voice_note_upload_path(instance, filename):
    # Not organized by caregiver/patient — a complaint's own id is
    # the only identifier guaranteed to exist and be unique at the
    # point this path is computed, and grouping by complaint (not by
    # who it's about) means the storage layout doesn't itself reveal
    # which caregiver has the most complaints filed against them just
    # from directory listings.
    return f"complaints/voice_notes/{instance.id or 'new'}/{filename}"


def _now():
    from django.utils import timezone
    return timezone.now()


class Complaint(models.Model):
    """
    Filed by a family member about a caregiver's service for a
    specific patient. Deliberately family -> caregiver direction only
    in this first pass — a caregiver flagging a concern about a
    patient/family is a conceptually different, separate feature
    (CaregiverNoteAboutPatient, explicitly scoped to a later part, not
    built here) since the two have different audiences, different
    urgency framing, and different resolution workflows; conflating
    them into one model risks neither being modeled well.
    """
    filed_by = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="complaints_filed",
        verbose_name="ثبت‌کننده شکایت",
    )
    about_caregiver = models.ForeignKey(
        "caregivers.CaregiverProfile", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="complaints_about", verbose_name="مراقب مربوطه",
    )
    patient = models.ForeignKey(
        "families.PatientProfile", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="complaints", verbose_name="سالمند مربوطه",
    )

    category = models.CharField(max_length=30, choices=ComplaintCategory.choices, verbose_name="دسته‌بندی")
    description = models.TextField(max_length=2000, verbose_name="شرح شکایت")
    voice_note = models.FileField(
        upload_to=voice_note_upload_path, null=True, blank=True,
        validators=[FileExtensionValidator(allowed_extensions=ALLOWED_VOICE_NOTE_EXTENSIONS)],
        verbose_name="فایل صوتی",
    )

    status = models.CharField(max_length=20, choices=ComplaintStatus.choices, default=ComplaintStatus.OPEN, db_index=True, verbose_name="وضعیت")
    resolved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="complaints_resolved", verbose_name="بررسی‌شده توسط",
    )
    resolution_note = models.TextField(max_length=2000, blank=True, verbose_name="یادداشت رسیدگی")
    resolved_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان رسیدگی")

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "شکایت"
        verbose_name_plural = "شکایات"
        ordering = ["-created_at"]

    def __str__(self):
        return f"شکایت #{self.pk} — {self.get_category_display()}"

    def resolve(self, admin_user, note=""):
        self.status = ComplaintStatus.RESOLVED
        self.resolved_by = admin_user
        self.resolution_note = note
        self.resolved_at = _now()
        self.save(update_fields=["status", "resolved_by", "resolution_note", "resolved_at", "updated_at"])

    def dismiss(self, admin_user, note=""):
        self.status = ComplaintStatus.DISMISSED
        self.resolved_by = admin_user
        self.resolution_note = note
        self.resolved_at = _now()
        self.save(update_fields=["status", "resolved_by", "resolution_note", "resolved_at", "updated_at"])

    def mark_under_review(self, admin_user):
        self.status = ComplaintStatus.UNDER_REVIEW
        self.save(update_fields=["status", "updated_at"])


class CaregiverNoteAboutPatient(models.Model):
    """
    The other direction from Complaint — a caregiver flagging
    something about a patient or their household, not a family
    complaining about a caregiver's service.

    Deliberately NOT visible to the family in this pass: some
    genuinely useful notes here (family_behavior especially — "this
    household member has been aggressive toward me") would be
    counterproductive or even unsafe to show the family directly.
    Staff-only, same audience and same platform-wide (not
    agency-scoped) reasoning as Complaint's review side — a safety
    note shouldn't be filterable by whichever agency currently
    employs the caregiver.

    Simpler workflow than Complaint on purpose: a note isn't a
    dispute needing resolve/dismiss, it's information needing
    acknowledgment that someone on staff has actually seen it.
    """
    caregiver = models.ForeignKey(
        "caregivers.CaregiverProfile", on_delete=models.CASCADE, related_name="notes_about_patients",
        verbose_name="مراقب",
    )
    patient = models.ForeignKey(
        "families.PatientProfile", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="caregiver_notes", verbose_name="سالمند مربوطه",
    )

    category = models.CharField(max_length=30, choices=PatientNoteCategory.choices, verbose_name="دسته‌بندی")
    note = models.TextField(max_length=2000, verbose_name="متن یادداشت")
    flagged_urgent = models.BooleanField(
        default=False, db_index=True, verbose_name="نیازمند توجه فوری",
        help_text="برای نگرانی‌های ایمنی که نباید منتظر بررسی روتین بماند.",
    )

    acknowledged_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="patient_notes_acknowledged", verbose_name="دیده‌شده توسط",
    )
    acknowledged_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان مشاهده")

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "یادداشت مراقب درباره سالمند"
        verbose_name_plural = "یادداشت‌های مراقب درباره سالمند"
        ordering = ["-created_at"]

    def __str__(self):
        return f"یادداشت #{self.pk} — {self.get_category_display()}"

    def acknowledge(self, admin_user):
        self.acknowledged_by = admin_user
        self.acknowledged_at = _now()
        self.save(update_fields=["acknowledged_by", "acknowledged_at", "updated_at"])
