from __future__ import annotations

"""
Specialization (physical-condition handling) and working-hours
(shift availability) compatibility — the two tie-break criteria from
this project's own matching spec (SAS-4) that were previously listed
as "not yet scored" in docs/MATCHING.md and in the technical
documentation's known-limitations section.

Deliberately kept as tie-breaker-only inputs (not fed into
objective_fit_score or the AHP/TOPSIS ranking itself, and not part of
CRITERIA in mcdm.py) — that's a materially bigger change (new AHP
criterion means re-deriving pairwise judgments and touching the
frontend's objective_criterion_scores shape), and wasn't what was
asked for. This module only answers "when two candidates are already
tied on the real ranking, which of them actually matches what's
needed here."

Both functions follow the same "missing data -> None, never a
penalty" convention as every other scoring function in this package
(see objective.py, trait_matching.py).
"""

from apps.caregivers.models import CaregiverProfile


def physical_condition_score(
    caregiver: CaregiverProfile,
    patient,
) -> int | None:
    """
    100 if the patient's actual physical_condition (apps.families's
    PatientPhysicalCondition) is one the caregiver's own
    accepted_physical_conditions list includes, or the caregiver
    accepts "no_preference" (meaning they didn't restrict themselves
    to specific conditions at all). 0 otherwise. None if either side
    hasn't recorded this.
    """

    patient_condition = getattr(
        patient,
        "physical_condition",
        None,
    )

    work_preferences = getattr(
        caregiver,
        "work_preferences",
        None,
    )

    if (
        not patient_condition
        or not work_preferences
    ):
        return None

    accepted_conditions = getattr(
        work_preferences,
        "accepted_physical_conditions",
        None,
    )

    if not accepted_conditions:
        return None

    if (
        "no_preference" in accepted_conditions
        or patient_condition in accepted_conditions
    ):
        return 100

    return 0


def shift_availability_score(
    caregiver: CaregiverProfile,
    patient,
) -> int | None:
    """
    100 if there's any overlap between the patient's needed_shifts
    and the caregiver's available_shifts, or the caregiver is
    available "24h" (which by definition covers every specific
    shift). 0 if both sides have real data but no overlap. None if
    either side hasn't recorded anything.
    """

    needed_shifts = getattr(
        patient,
        "needed_shifts",
        None,
    )

    work_preferences = getattr(
        caregiver,
        "work_preferences",
        None,
    )

    if (
        not needed_shifts
        or not work_preferences
    ):
        return None

    available_shifts = getattr(
        work_preferences,
        "available_shifts",
        None,
    )

    if not available_shifts:
        return None

    if "24h" in available_shifts:
        return 100

    has_overlap = any(
        shift in available_shifts
        for shift in needed_shifts
    )

    return 100 if has_overlap else 0
