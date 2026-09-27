from django.apps import AppConfig


class FamiliesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.families"
    verbose_name = "خانواده و بیمار"

    def ready(self):
        # Registers the نمای کلی patient Kanban with the shared
        # reminder engine (apps.reminders). PatientProfile has no
        # per-stage timestamp columns of its own, so this pipeline's
        # stage_entered_at reads the generic StageTransition log
        # instead — see apps.agencies.views.AgencyPatientPipelineStatusView,
        # which is the only place pipeline_status ever changes and is
        # where the corresponding StageTransition row gets written.
        from apps.reminders import registry
        from apps.reminders.services import stage_entered_at_from_transitions

        from .models import PatientPipelineStatus

        registry.register(registry.PipelineSpec(
            key="patients",
            label="نمای کلی خدمت‌گیرنده",
            stage_choices=list(PatientPipelineStatus.choices),
            get_stage=lambda obj: obj.pipeline_status,
            stage_entered_at=stage_entered_at_from_transitions("patients"),
        ))
