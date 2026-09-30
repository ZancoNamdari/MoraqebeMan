"""
Per-agency, database-backed Kanban stages for the patient/caregiver
pipelines — see AgencyPipelineStage's own docstring in models.py for
the full reasoning. This module holds the one function every caller
(the two stage-move PATCH views, the new list/create endpoint, and
the dashboard's per-stage breakdown) goes through to get an agency's
current, ordered stage list, lazily seeded with the platform's
original 7 stages the first time it's ever touched for that agency —
so nothing needs a data migration to "catch up" existing agencies,
and a freshly created agency needs no special-cased setup either.
"""
from django.db import IntegrityError, transaction
from django.utils.text import slugify

from .models import AgencyPipelineStage, PipelineType

# The platform's original, fixed 7-stage pipelines — used ONLY as the
# starting point every agency gets seeded with once, not as an
# ongoing validation source. Duplicated here (rather than importing
# apps.families.models.PatientPipelineStatus /
# apps.caregivers.models.CaregiverAgencyPipelineStatus) so this module
# has no hard dependency on those two enums ever continuing to exist
# in their current form — the seed values matter, not the enum class.
_DEFAULT_STAGES = {
    PipelineType.PATIENT: [
        ("registration", "ثبت در سایت"),
        ("phone_coordination", "هماهنگی تلفنی"),
        ("dispatched", "اعزام"),
        ("caregiver_confirmed", "تایید پرستار"),
        ("first_week_followup", "هفته اول: پیگیری اولیه"),
        ("contract_confirmed", "قرارداد بسته و تایید شده"),
        ("expired", "نزدیک به اتمام قرارداد"),
    ],
    PipelineType.CAREGIVER: [
        ("registered", "ثبت در سایت"),
        ("documents_in_progress", "تکمیل مدارک"),
        ("being_dispatched", "اعزام"),
        ("on_assignment", "در حال مأموریت"),
        ("first_week", "هفته اول: پیگیری اولیه"),
        ("confirmed", "قرارداد بسته و تایید شده"),
        ("expired", "نزدیک به اتمام قرارداد"),
    ],
    # The 4 fixed values EpisodicServiceStage used to be the only
    # source of truth for — see that enum's own (now partly outdated)
    # docstring. A CUSTOM stage appended past "followup" is plain and
    # generic, same as a custom patient/caregiver stage: no invoice
    # gets auto-created on entry, no reminder rule can anchor to it,
    # and stage_entered_at() simply returns None for it. Only these
    # exact 4 built-in values keep their special behavior in
    # apps.episodic.views.EpisodicServiceStageUpdateView.
    PipelineType.EPISODIC: [
        ("phone_coordination", "هماهنگی تلفنی"),
        ("dispatched", "اعزام"),
        ("settled", "تسویه‌حساب"),
        ("followup", "پیگیری"),
    ],
}


def get_stages(agency, pipeline_type: str) -> list[AgencyPipelineStage]:
    """Ordered list of this agency's stages for one board, seeding
    the 7 defaults first if this agency has never had any stage rows
    for that board (a brand-new agency, or one that existed before
    this feature shipped)."""
    existing = list(
        AgencyPipelineStage.objects.filter(agency=agency, pipeline_type=pipeline_type).order_by("order")
    )
    if existing:
        return existing

    defaults = _DEFAULT_STAGES[pipeline_type]
    try:
        with transaction.atomic():
            AgencyPipelineStage.objects.bulk_create([
                AgencyPipelineStage(agency=agency, pipeline_type=pipeline_type, value=value, label=label, order=i)
                for i, (value, label) in enumerate(defaults)
            ])
    except IntegrityError:
        # Two concurrent requests both found nothing and both tried to
        # seed — whichever lost the race just reads what the winner
        # created instead of erroring out.
        pass
    return list(AgencyPipelineStage.objects.filter(agency=agency, pipeline_type=pipeline_type).order_by("order"))


def stage_choices(agency, pipeline_type: str) -> list[tuple[str, str]]:
    """(value, label) pairs — the same shape PatientPipelineStatus.
    choices / CaregiverAgencyPipelineStatus.choices used to hand
    callers, so the two PATCH views' validation and the dashboard
    breakdown barely change shape when switching to this."""
    return [(s.value, s.label) for s in get_stages(agency, pipeline_type)]


def add_stage(agency, pipeline_type: str, label: str) -> AgencyPipelineStage:
    """Appends one new stage to the end of this agency's board —
    the only mutation an agency can make to its own pipeline today
    (reordering/renaming/deleting existing stages is out of scope for
    now). Seeds the defaults first if needed, same as get_stages."""
    stages = get_stages(agency, pipeline_type)
    next_order = (stages[-1].order + 1) if stages else 0
    existing_values = {s.value for s in stages}

    # Truncated to fit AgencyPipelineStage.value's own max_length (30,
    # matching the CharField this value ultimately gets written into
    # on PatientProfile/CaregiverProfile) — a long Persian label still
    # produces a readable-enough slug for what is purely an internal
    # storage key, never shown to anyone.
    base_slug = slugify(label, allow_unicode=True)[:24] or "stage"
    value = base_slug
    suffix = 2
    while value in existing_values:
        value = f"{base_slug}-{suffix}"[:30]
        suffix += 1

    return AgencyPipelineStage.objects.create(
        agency=agency, pipeline_type=pipeline_type, value=value, label=label, order=next_order,
    )
