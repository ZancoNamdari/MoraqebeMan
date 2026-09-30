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


# Mirrors matching/page.tsx's own NEEDS_MATCH_STAGES on the frontend —
# a patient still coordinating by phone/registration is "looking for a
# caregiver"; one already dispatched/confirmed/on a contract is not,
# so a caregiver reaching the reverse-matching button shouldn't be
# suggested a patient who's already settled with someone else.
NEEDS_MATCH_PATIENT_STAGES = {"registration", "phone_coordination"}


def suggest_patients_for_agency_caregiver(agency, caregiver, limit: int = 10) -> list[dict]:
    """
    The reverse direction of suggest_caregivers_for_agency_patient
    above — "which of this agency's own patients (still looking for a
    caregiver) would this ONE caregiver suit best?", for the "پیدا
    کردن مراقب مناسب" step once a caregiver's own documents are done.

    Deliberately NOT a new/inverted scoring pipeline: that would mean
    re-deriving the whole objective/trait/AHP/TOPSIS pipeline from
    scratch with real risk of subtly disagreeing with the tested,
    patient-driven original. Instead this runs the EXISTING, unchanged
    suggest_caregivers_for_agency_patient() once per matching-eligible
    patient (fine for a single agency's own roster/patient list, and
    only computed on demand when staff open this specific page), and
    picks out just this caregiver's own entry from each patient's real
    ranking — so the score a patient shows here is exactly the same
    number that patient's own "yافتن مراقب" page would show for this
    caregiver, never a separately-invented one.
    """
    from apps.agencies.models import AgencyLinkStatus, AgencyPatientLink

    patient_links = AgencyPatientLink.objects.filter(
        agency=agency, status=AgencyLinkStatus.APPROVED,
        patient__pipeline_status__in=NEEDS_MATCH_PATIENT_STAGES,
    ).select_related("patient")

    ranked_patients = []
    for link in patient_links:
        patient = link.patient
        # A generous per-patient limit — this caregiver needs to show
        # up in that patient's own ranking to be found at all, and a
        # patient's roster-wide ranking is small enough that a wide
        # limit here costs nothing real.
        entries = suggest_caregivers_for_agency_patient(agency, patient, limit=200)
        match = next((e for e in entries if e.get("caregiver_user_id") == caregiver.user_id), None)
        if match is not None:
            ranked_patients.append({
                "patient_id": patient.id,
                "patient_name": patient.full_name,
                "patient_gender": patient.gender,
                **match,
            })

    ranked_patients.sort(key=lambda p: p.get("mcdm_score") or 0, reverse=True)
    return ranked_patients[:limit]
