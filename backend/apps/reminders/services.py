from . import registry
from .models import ReminderRule, StageTransition
from .utils import jalali_now


def record_stage_transition(pipeline_key, object_id, to_value):
    """
    Call this once, right after actually changing a pipeline's stage
    field (only when the value changed — never on a no-op save), from
    whichever view owns that mutation. Safe to call for a pipeline
    whose PipelineSpec doesn't rely on StageTransition at all
    (episodic services) — the row is simply unused in that case, so
    there's no harm in always logging it uniformly if a future
    pipeline wants both mechanisms available.
    """
    StageTransition.objects.create(pipeline_key=pipeline_key, object_id=object_id, to_value=to_value)


def stage_entered_at_from_transitions(pipeline_key):
    """
    Factory returning a PipelineSpec.stage_entered_at callable backed
    by the generic StageTransition log — what a pipeline with no
    per-stage timestamp columns of its own (patients, caregiver
    candidates) registers.
    """
    def _stage_entered_at(obj, stage_value):
        row = (
            StageTransition.objects
            .filter(pipeline_key=pipeline_key, object_id=obj.id, to_value=stage_value)
            .order_by("-changed_at")
            .first()
        )
        return row.changed_at if row else None

    return _stage_entered_at


def agency_reminder_rules(agency, pipeline_key):
    """
    Every call site (both the pipeline data views and the Settings
    rule-config screen) goes through this one function, so the
    "materialize this pipeline's default_rule the first time an
    agency has zero rows for it" behavior only needs to live here
    once, and stays consistent everywhere.
    """
    exists = ReminderRule.objects.filter(agency=agency, pipeline_key=pipeline_key).exists()
    if not exists:
        spec = registry.get(pipeline_key)
        if spec is not None and spec.default_rule is not None:
            ReminderRule.objects.create(agency=agency, pipeline_key=pipeline_key, **spec.default_rule)
    return list(ReminderRule.objects.filter(agency=agency, pipeline_key=pipeline_key, is_active=True))


def compute_active_reminders(pipeline_key, obj, rules):
    spec = registry.get(pipeline_key)
    if spec is None:
        return []

    current_stage = spec.get_stage(obj)
    now_g = jalali_now().togregorian()
    active = []
    for rule in rules:
        if rule.pipeline_key != pipeline_key or rule.display_stage != current_stage:
            continue
        anchor_ts = spec.stage_entered_at(obj, rule.anchor_stage)
        if anchor_ts is None:
            continue
        elapsed_days = (now_g - anchor_ts.togregorian()).total_seconds() / 86400
        if elapsed_days >= rule.days_threshold:
            active.append({"label": rule.label, "color": rule.color, "days_elapsed": int(elapsed_days)})

    active.sort(key=lambda r: r["days_elapsed"], reverse=True)
    return active
