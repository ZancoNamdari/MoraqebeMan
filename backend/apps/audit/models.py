from django.db import models


class AuditEventType(models.TextChoices):
    USER_REGISTERED = "user_registered", "ثبت‌نام کاربر"
    LOGIN_SUCCESS = "login_success", "ورود موفق"
    LOGIN_FAILED = "login_failed", "تلاش ورود ناموفق"
    LOGIN_LOCKED = "login_locked", "قفل‌شدن حساب پس از تلاش‌های ناموفق"
    LOGOUT = "logout", "خروج"
    ROLE_CHANGED = "role_changed", "تغییر نقش کاربر"
    OTP_REQUESTED = "otp_requested", "درخواست کد تأیید"
    OTP_VERIFIED = "otp_verified", "تأیید موفق کد"
    OTP_FAILED = "otp_failed", "تلاش ناموفق تأیید کد"
    PASSWORD_RESET_REQUESTED = "password_reset_requested", "درخواست بازیابی رمز عبور"
    PASSWORD_RESET_COMPLETED = "password_reset_completed", "تکمیل بازیابی رمز عبور"
    CAREGIVER_CREATED = "caregiver_created", "ثبت مراقب توسط ناظر"
    CAREGIVER_UPDATED = "caregiver_updated", "ویرایش اطلاعات مراقب توسط ناظر"
    CAREGIVER_DELETED = "caregiver_deleted", "حذف مراقب توسط ناظر"
    PATIENT_CREATED = "patient_created", "ثبت بیمار"
    PATIENT_UPDATED = "patient_updated", "ویرایش اطلاعات بیمار"
    PATIENT_DELETED = "patient_deleted", "حذف بیمار"
    FAMILY_LINK_ADDED = "family_link_added", "افزودن دسترسی خانواده به بیمار"
    FAMILY_LINK_REMOVED = "family_link_removed", "حذف دسترسی خانواده از بیمار"
    CAREGIVER_ASSIGNED = "caregiver_assigned", "تخصیص مراقب به بیمار"
    CAREGIVER_ASSIGNMENT_ENDED = "caregiver_assignment_ended", "پایان تخصیص مراقب"
    CARE_LOG_ENTRY_CREATED = "care_log_entry_created", "ثبت گزارش مراقبت"
    CAREGIVER_REVIEWED = "caregiver_reviewed", "ثبت نظر درباره مراقب"
    MCDM_WEIGHTS_UPDATED = "mcdm_weights_updated", "به‌روزرسانی وزن‌های تطابق"
    AGENCY_FAMILY_LINK_DECIDED = "agency_family_link_decided", "تصمیم درباره درخواست پیوستن خانواده به آژانس"
    AGENCY_CAREGIVER_LINK_DECIDED = "agency_caregiver_link_decided", "تصمیم درباره درخواست پیوستن مراقب به آژانس"
    AGENCY_SUPERVISOR_CREATED = "agency_supervisor_created", "ایجاد سوپروایزر آژانس"
    AGENCY_CREATED = "agency_created", "ایجاد آژانس توسط سوپریوزر"


class AuditLog(models.Model):
    """
    Queryable, DB-backed security event trail — separate from the
    request-level file logging in apps/audit/middleware.py, which stays
    as-is for general HTTP noise. This table only holds security-relevant
    business events (login, role change, OTP, password reset) so it stays
    small and genuinely useful for an admin reviewing "what happened to
    this account", instead of drowning in every GET /health/ call.
    """
    event_type = models.CharField(max_length=40, choices=AuditEventType.choices)
    actor_user_id = models.PositiveIntegerField(
        null=True, blank=True, help_text="کاربری که این رویداد را ایجاد کرده — ممکن است ناشناس باشد (مثلاً تلاش ورود ناموفق)"
    )
    target_user_id = models.PositiveIntegerField(
        null=True, blank=True, help_text="کاربری که رویداد روی او اثر گذاشته — در بیشتر موارد همان actor است"
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["target_user_id", "created_at"]),
        ]

    def __str__(self):
        return f"{self.event_type} (actor={self.actor_user_id}, target={self.target_user_id})"
