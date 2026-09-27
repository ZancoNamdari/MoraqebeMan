"""
The generic reminder engine (apps.reminders) knows nothing about
patients, caregivers, or episodic services on its own — every pipeline
that wants "N days after entering stage X, show a badge while in stage
Y" registers itself here, in its own AppConfig.ready(), the same way
Django's own admin site uses autodiscover instead of a hardcoded list.

This keeps the dependency direction one-way: apps.reminders never
imports apps.families / apps.caregivers / apps.episodic models
directly (which would risk circular imports since those apps' views
import FROM apps.reminders), and adding a FOURTH pipeline later is
just "write a PipelineSpec + call register() from that app's
ready()" — no change to apps.reminders itself.
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Optional, Sequence, Tuple


@dataclass(frozen=True)
class PipelineSpec:
    key: str
    label: str
    # [(value, label), ...] — exactly what that pipeline's own
    # TextChoices.choices already looks like, passed through as-is.
    stage_choices: Sequence[Tuple[str, str]]
    # Given a live model instance, return its current stage value.
    get_stage: Callable[[Any], str]
    # Given a live model instance and a stage value, return when that
    # record most recently ENTERED that stage (a jdatetime.datetime,
    # timezone-aware) — or None if it never has. How this is computed
    # is entirely up to the registering app: episodic reads its own
    # explicit per-stage timestamp columns; patients/caregivers (which
    # have no such columns) read the shared StageTransition log via
    # apps.reminders.services.stage_entered_at_from_transitions(key).
    stage_entered_at: Callable[[Any, str], Optional[Any]]
    # Optional: kwargs for ReminderRule(...) (minus agency/pipeline_key)
    # to auto-create the FIRST time an agency asks for this pipeline's
    # rules and has none yet — so a pipeline can ship with a sensible
    # rule out of the box (episodic services' "۷ روز بعد از اعزام")
    # without forcing every agency to configure it manually first.
    # None (the default) means "start with zero rules" — the right
    # choice for a pipeline with no natural default, like the patient
    # or caregiver-candidate Kanban boards.
    default_rule: Optional[dict] = field(default=None)


_REGISTRY: dict[str, PipelineSpec] = {}


def register(spec: PipelineSpec) -> None:
    _REGISTRY[spec.key] = spec


def get(key: str) -> Optional[PipelineSpec]:
    return _REGISTRY.get(key)


def all_specs() -> list[PipelineSpec]:
    return list(_REGISTRY.values())


def pipeline_choices() -> list[Tuple[str, str]]:
    return [(spec.key, spec.label) for spec in all_specs()]
