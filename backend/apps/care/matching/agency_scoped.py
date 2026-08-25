from __future__ import annotations

"""
Agency-scoped matching — per the confirmed business requirement: when
an agency (or its own supervisor) requests caregiver suggestions for
one of ITS OWN patients, the candidate pool must be restricted to
only that agency's own approved caregiver roster, not the whole
platform's approved caregivers.

This is a genuinely different behavior from the platform-wide
/api/care/suggest-caregivers/ endpoint (used by platform staff —
ADMIN/SUPERUSER via apps.care.views.SuggestedCaregiversView), which
correctly keeps searching the entire platform. Both call the exact
same underlying pipeline (apps.care.matching.suggest_caregivers_for_
patient) — only the candidate queryset passed in differs. Every
scoring formula, the AHP/TOPSIS ranking, the tie-breaker, and the
explanation layer are identical between the two; nothing about the
matching logic itself is duplicated or reimplemented here.
"""

from apps.caregivers.models import CaregiverProfile

from .engine import suggest_caregivers_for_patient


def suggest_caregivers_for_agency_patient(
    agency,
    patient,
    limit: int = 10,
) -> list[dict]:
    """
    Same full pipeline as suggest_caregivers_for_patient(), scoped to
    only caregivers with an APPROVED AgencyCaregiverLink to this
    agency. A caregiver whose link to this agency is still PENDING
    (they've asked to join but the agency hasn't approved them yet)
    is correctly excluded — an agency shouldn't be matching patients
    to caregivers it hasn't actually vetted and accepted yet.
    """
    from apps.agencies.tenancy import agency_caregiver_profile_ids

    candidate_queryset = CaregiverProfile.objects.filter(
        id__in=agency_caregiver_profile_ids(agency),
    )

    return suggest_caregivers_for_patient(
        patient,
        limit=limit,
        candidate_queryset=candidate_queryset,
    )
