from django.apps import AppConfig


class EpisodicConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.episodic"
    verbose_name = "خدمات مقطعی"

    def ready(self):
        # Registers this pipeline with the shared reminder engine
        # (apps.reminders) — episodic already tracks per-stage entry
        # times as explicit columns on EpisodicService (see
        # stage_entered_at below), so unlike patients/caregiver
        # candidates it needs no StageTransition log at all.
        from apps.reminders import registry

        from .models import EpisodicService, EpisodicServiceStage

        registry.register(registry.PipelineSpec(
            key="episodic_services",
            label="خدمات مقطعی",
            stage_choices=list(EpisodicServiceStage.choices),
            get_stage=lambda obj: obj.stage,
            stage_entered_at=lambda obj, stage_value: obj.stage_entered_at(stage_value),
            # The confirmed example, unchanged from the original
            # episodic-only implementation: every agency starts with
            # this rule already configured, and can edit/disable/
            # delete it like any other rule from Settings afterward.
            default_rule=dict(
                anchor_stage=EpisodicServiceStage.DISPATCHED,
                display_stage=EpisodicServiceStage.FOLLOWUP,
                days_threshold=7,
                label="موعد تماس با خدمت‌گیرنده",
                color="red",
            ),
        ))
