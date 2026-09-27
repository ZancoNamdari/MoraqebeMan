from django.apps import AppConfig


class CaregiversConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.caregivers"
    verbose_name = "مراقبان"

    def ready(self):
        # Registers the خدمت‌دهنده caregiver-candidate Kanban with the
        # shared reminder engine — same reasoning as apps.families:
        # CaregiverProfile.agency_pipeline_status has no per-stage
        # timestamps, so this reads the generic StageTransition log
        # (written from apps.agencies.views.AgencyCaregiverPipelineUpdateView,
        # the only place this field ever changes).
        from apps.reminders import registry
        from apps.reminders.services import stage_entered_at_from_transitions

        from .models import CaregiverAgencyPipelineStatus

        registry.register(registry.PipelineSpec(
            key="caregiver_candidates",
            label="بانک اطلاعات مراقبان",
            stage_choices=list(CaregiverAgencyPipelineStatus.choices),
            get_stage=lambda obj: obj.agency_pipeline_status,
            stage_entered_at=stage_entered_at_from_transitions("caregiver_candidates"),
        ))
