from django.db import models
from django_jalali.db import models as jmodels


class EpisodicServiceStage(models.TextChoices):
    """
    The fixed 4-stage pipeline for a one-off ("مقطعی") service request
    — deliberately NOT agency-configurable (unlike the reminder rules
    below): these four stages are the confirmed requirement's own
    words, and every reminder rule anchors to one of them, so changing
    the stage set itself is a larger, separate feature than what was
    asked for here.
    """
    PHONE_COORDINATION = "phone_coordination", "هماهنگی تلفنی"
    DISPATCHED = "dispatched", "اعزام"
    SETTLED = "settled", "تسویه‌حساب"
    FOLLOWUP = "followup", "پیگیری"


# Ordered for the Kanban board and for "is this stage at/after that
# one" comparisons — a plain list index, not stored anywhere.
EPISODIC_STAGE_ORDER = [
    EpisodicServiceStage.PHONE_COORDINATION,
    EpisodicServiceStage.DISPATCHED,
    EpisodicServiceStage.SETTLED,
    EpisodicServiceStage.FOLLOWUP,
]

# Which timestamp field on EpisodicService anchors a reminder rule for
# a given stage — see EpisodicService.stage_entered_at().
_STAGE_TIMESTAMP_FIELD = {
    EpisodicServiceStage.PHONE_COORDINATION: "phone_coordination_at",
    EpisodicServiceStage.DISPATCHED: "dispatched_at",
    EpisodicServiceStage.SETTLED: "settled_at",
    EpisodicServiceStage.FOLLOWUP: "followup_at",
}


class EpisodicService(models.Model):
    """
    A one-off ("مقطعی") service request — confirmed to be fully
    independent of the ongoing خدمت‌گیرنده/PatientProfile pipeline
    (نمای کلی): no existing patient record is required, so this model
    carries its own recipient name/phone rather than a FK to
    families.PatientProfile. Someone who later becomes a real
    long-term patient is a separate, unrelated record — linking the
    two was explicitly not asked for.

    stage_at fields (phone_coordination_at/dispatched_at/settled_at/
    followup_at) are set once, the first time the record enters that
    stage (never overwritten on a later revisit) — they're the anchor
    points EpisodicReminderRule counts days from, not an audit log of
    every transition (apps.audit already covers real audit trails
    elsewhere; this is deliberately just enough to drive reminders).
    """
    agency = models.ForeignKey(
        "agencies.AgencyProfile", on_delete=models.CASCADE,
        related_name="episodic_services", verbose_name="آژانس",
    )
    recipient_full_name = models.CharField(max_length=150, verbose_name="نام خدمت‌گیرنده")
    recipient_phone_number = models.CharField(max_length=20, blank=True, verbose_name="شماره تماس خدمت‌گیرنده")
    notes = models.TextField(blank=True, verbose_name="یادداشت")

    # `choices=` deliberately dropped (kept `default=`) — an agency can
    # now append its own custom stages past the 4 built-in ones (see
    # apps.agencies.pipeline_stages' PipelineType.EPISODIC seed), so a
    # DRF ModelSerializer touching this field must not reject a
    # legitimately-added custom value. Same reasoning/pattern as
    # PatientProfile.pipeline_status and CaregiverProfile.
    # agency_pipeline_status.
    stage = models.CharField(
        max_length=30,
        default=EpisodicServiceStage.PHONE_COORDINATION, db_index=True, verbose_name="مرحله",
    )
    assigned_caregiver = models.ForeignKey(
        "caregivers.CaregiverProfile", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="episodic_dispatches", verbose_name="مراقب اعزامی",
    )

    phone_coordination_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان ورود به هماهنگی تلفنی")
    dispatched_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان اعزام")
    settled_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان تسویه‌حساب")
    followup_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان ورود به پیگیری")

    # Set only once the تسویه‌حساب stage actually creates a real
    # Invoice (+ a matching full Payment) in apps.finance — per the
    # confirmed requirement, NOT a free-typed amount stored here.
    invoice = models.OneToOneField(
        "finance.Invoice", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="episodic_service", verbose_name="فاکتور",
    )

    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_episodic_services", verbose_name="ثبت‌کننده",
    )
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "خدمت مقطعی"
        verbose_name_plural = "خدمات مقطعی"

    def __str__(self):
        return f"{self.recipient_full_name} — {self.get_stage_display()}"

    def stage_entered_at(self, stage_value):
        # .get() (not a bracket subscript) — a custom stage appended
        # past the 4 built-in ones has no timestamp field to anchor a
        # reminder to, and that's fine: None here just means "no
        # reminder rule can fire for this stage", never a KeyError.
        field_name = _STAGE_TIMESTAMP_FIELD.get(stage_value)
        return getattr(self, field_name) if field_name else None
