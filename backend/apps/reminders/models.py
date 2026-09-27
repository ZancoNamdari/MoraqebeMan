from django.db import models
from django_jalali.db import models as jmodels


class ReminderColor(models.TextChoices):
    RED = "red", "قرمز"
    AMBER = "amber", "نارنجی"
    BLUE = "blue", "آبی"


class StageTransition(models.Model):
    """
    A generic "record X of pipeline Y entered stage Z at time T" log
    row. Written once per actual stage change (never on a no-op save)
    by whichever view mutates that pipeline's stage field — see
    apps.reminders.services.record_stage_transition().

    This exists only for pipelines that have no other way to know
    when a record entered a given stage (patients, caregiver
    candidates today). A pipeline that already tracks this itself
    (episodic services, via its own per-stage timestamp columns) has
    no need to write here at all — its PipelineSpec.stage_entered_at
    reads its own fields directly instead.
    """

    pipeline_key = models.CharField(max_length=40, db_index=True)
    object_id = models.PositiveIntegerField(db_index=True)
    to_value = models.CharField(max_length=40, db_index=True)
    changed_at = jmodels.jDateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["pipeline_key", "object_id", "to_value"]),
        ]
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.pipeline_key}#{self.object_id} → {self.to_value} @ {self.changed_at}"


class ReminderRule(models.Model):
    """
    Agency-configurable: "for pipeline P, once a record has spent
    >= days_threshold days since entering anchor_stage, show a
    colored badge with this label — but only while the record is
    currently sitting in display_stage." Deliberately NOT tied to any
    one pipeline's model — pipeline_key is a plain string looked up in
    apps.reminders.registry, so this one table configures reminders
    for every registered pipeline (patients, caregiver candidates,
    episodic services, and whatever is registered in the future).
    """

    agency = models.ForeignKey("agencies.AgencyProfile", on_delete=models.CASCADE, related_name="reminder_rules")
    pipeline_key = models.CharField(max_length=40, db_index=True)
    anchor_stage = models.CharField(max_length=40)
    display_stage = models.CharField(max_length=40)
    days_threshold = models.PositiveIntegerField(default=7)
    label = models.CharField(max_length=150)
    color = models.CharField(max_length=10, choices=ReminderColor.choices, default=ReminderColor.RED)
    is_active = models.BooleanField(default=True)
    created_at = jmodels.jDateTimeField(auto_now_add=True)
    updated_at = jmodels.jDateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["agency", "pipeline_key", "is_active"]),
        ]
        ordering = ["pipeline_key", "days_threshold"]

    def __str__(self):
        return f"{self.pipeline_key}: {self.anchor_stage} → {self.display_stage} ({self.days_threshold}d) — {self.label}"
