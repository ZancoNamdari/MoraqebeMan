from __future__ import annotations

from django.db.models import Avg, Count, Q

from apps.care.models import (
    AssignmentStatus,
    CaregiverAssignment,
    MatchingProfileSide,
    QuestionTraitMapping,
)
from apps.care.trait_matching import (
    compute_full_match,
    compute_trait_profile,
)
from apps.caregivers.models import (
    CaregiverProfile,
    CaregiverStatus,
)

from .explanations import build_match_explanation
from .mcdm import rank_candidates_with_topsis
from .objective import calculate_objective_score
from .specialization import physical_condition_score, shift_availability_score
from .waterfall import evaluate_waterfall


# ============================================================
# Helpers
# ============================================================


def _get_patient_questionnaire(patient):
    """
    Return the patient's compatibility questionnaire.

    None is valid and means trait matching is unavailable.
    """
    return getattr(
        patient,
        "compatibility_questionnaire",
        None,
    )


def _get_caregiver_questionnaire(caregiver):
    """
    Return the caregiver's compatibility questionnaire.

    None is valid and means trait matching is unavailable.
    """
    return getattr(
        caregiver,
        "compatibility_questionnaire",
        None,
    )


def _get_caregiver_identity(caregiver):
    """
    Return the caregiver identity profile if available.
    """
    return getattr(
        caregiver.user,
        "caregiver_identity_profile",
        None,
    )


def _get_already_assigned_ids(patient) -> set:
    """
    Get caregivers who are already actively assigned
    to this patient.

    These caregivers should not be recommended again.
    """
    return set(
        CaregiverAssignment.objects.filter(
            patient=patient,
            status=AssignmentStatus.ACTIVE,
        ).values_list(
            "caregiver_id",
            flat=True,
        )
    )


# ============================================================
# Candidate builder
# ============================================================


def _build_candidate(
    caregiver,
    patient,
    patient_traits: dict,
    already_assigned_ids: set,
    caregiver_mappings=None,
) -> dict | None:
    """
    Build the complete matching data for one caregiver.

    Pipeline:

        Waterfall
            ↓
        Objective fit
            ↓
        Trait compatibility
            ↓
        Reputation
            ↓
        Operational information

    Reputation and operational information are kept separate
    from compatibility scores.
    """

    # --------------------------------------------------------
    # 1. Waterfall
    # --------------------------------------------------------

    waterfall = evaluate_waterfall(
        caregiver=caregiver,
        patient=patient,
        already_assigned_ids=already_assigned_ids,
    )

    if not waterfall.eligible:
        return None

    # --------------------------------------------------------
    # 2. Objective fit
    # --------------------------------------------------------

    objective = calculate_objective_score(
        caregiver=caregiver,
        patient=patient,
    )

    # --------------------------------------------------------
    # 3. Profiles
    # --------------------------------------------------------

    identity = _get_caregiver_identity(
        caregiver
    )

    caregiver_questionnaire = (
        _get_caregiver_questionnaire(
            caregiver
        )
    )

    patient_questionnaire = (
        _get_patient_questionnaire(
            patient
        )
    )

    # --------------------------------------------------------
    # 4. Trait compatibility
    # --------------------------------------------------------

    trait_match = compute_full_match(
        patient_questionnaire=patient_questionnaire,
        caregiver_questionnaire=caregiver_questionnaire,
        patient_traits=patient_traits,
        caregiver_mappings=caregiver_mappings,
    )

    # --------------------------------------------------------
    # 5. Annotated information
    #
    # These fields are added to the queryset in
    # suggest_caregivers_for_patient().
    #
    # This avoids querying the database separately for every
    # caregiver.
    # --------------------------------------------------------

    avg_rating = getattr(
        caregiver,
        "matching_avg_rating",
        None,
    )

    review_count = getattr(
        caregiver,
        "matching_review_count",
        0,
    )

    active_patient_count = getattr(
        caregiver,
        "matching_active_patient_count",
        0,
    )

    # --------------------------------------------------------
    # 6. Candidate
    # --------------------------------------------------------

    candidate = {
        # ====================================================
        # Identity
        # ====================================================

        "caregiver_user_id": caregiver.user_id,

        "caregiver_id": caregiver.id,

        "caregiver_name": (
            identity.full_name
            if identity
            else None
        ) or caregiver.user.username,

        "caregiver_gender": (
            identity.gender
            if identity
            else ""
        ),

        # ====================================================
        # Waterfall
        # ====================================================

        "waterfall_reasons": (
            waterfall.reasons
        ),

        # ====================================================
        # Objective fit
        # ====================================================

        "objective_fit_score": (
            objective["score"]
        ),

        "objective_criterion_scores": (
            objective["criterion_scores"]
        ),

        "objective_reasons": (
            objective["reasons"]
        ),

        # Backward compatibility.
        "score": objective["score"],

        # ====================================================
        # Tie-break-only signals (specialization.py)
        #
        # NOT part of objective_fit_score or the AHP/TOPSIS ranking —
        # these two exist purely so mcdm.py's tie-breaker can
        # distinguish otherwise-equal candidates on the two SAS-4
        # tie-break criteria this pipeline previously had no data for
        # at all. See specialization.py's module docstring.
        # ====================================================

        "physical_condition_match_score": physical_condition_score(
            caregiver,
            patient,
        ),

        "shift_availability_score": shift_availability_score(
            caregiver,
            patient,
        ),

        # ====================================================
        # Trait compatibility
        # ====================================================

        "trait_match_available": (
            trait_match["available"]
        ),

        "trait_match_score": (
            trait_match["overall_score"]
        ),

        "trait_dimension_scores": (
            trait_match["dimension_scores"]
        ),

        "trait_dimension_labels": (
            trait_match["dimension_labels"]
        ),

        "patient_traits": (
            trait_match["patient_traits"]
        ),

        "caregiver_traits": (
            trait_match["caregiver_traits"]
        ),

        "caregiver_cfi": (
            trait_match["caregiver_cfi"]
        ),

        # The caregiver's own standalone flexibility score, computed
        # purely from their own questionnaire answers — distinct from
        # trait_match_score/trait_dimension_scores above, which need
        # BOTH questionnaires and represent the cross-comparison fit
        # with THIS specific patient. This one is available even when
        # no patient questionnaire exists at all, and answers a
        # different question: "how accommodating is this caregiver in
        # general," not "how well do they fit this particular patient."
        "flexibility_score": (
            caregiver_questionnaire.overall_flexibility_score()
            if caregiver_questionnaire
            else None
        ),

        "flexibility_sections": (
            caregiver_questionnaire.section_scores()
            if caregiver_questionnaire
            else None
        ),

        # ====================================================
        # Reputation
        # ====================================================

        "avg_rating": (
            round(
                float(avg_rating),
                2,
            )
            if avg_rating is not None
            else None
        ),

        "review_count": int(
            review_count or 0
        ),

        # ====================================================
        # Operational information
        #
        # NOT part of compatibility score.
        # ====================================================

        "active_patient_count": int(
            active_patient_count or 0
        ),
    }

    return candidate


# ============================================================
# Main matching pipeline
# ============================================================


def suggest_caregivers_for_patient(
    patient,
    limit: int = 10,
    candidate_queryset=None,
) -> list[dict]:
    """
    Complete caregiver matching pipeline.

    Steps:

        1. Candidate retrieval
        2. Waterfall filtering
        3. Objective scoring
        4. Trait matching
        5. AHP
        6. TOPSIS
        7. Explanation
        8. Confidence
        9. Return top candidates

    Important:

    Missing questionnaire data is represented as unavailable,
    not as zero compatibility.

    candidate_queryset — optional pre-filtered CaregiverProfile
    queryset to intersect with the normal APPROVED/not-already-
    assigned filtering below, instead of considering every approved
    caregiver on the platform. Added specifically for agency-scoped
    matching (apps.care.matching.agency_scoped) — a family/supervisor
    calling this the normal way (candidate_queryset=None, the
    existing default) sees no change in behavior at all; only the
    new agency-scoped call site passes this.
    """

    # --------------------------------------------------------
    # 1. Validate limit
    # --------------------------------------------------------

    if limit <= 0:
        return []

    # Avoid accidentally requesting an unreasonable number.
    limit = min(limit, 100)

    # --------------------------------------------------------
    # 2. Already assigned caregivers
    # --------------------------------------------------------

    already_assigned_ids = (
        _get_already_assigned_ids(
            patient
        )
    )

    # --------------------------------------------------------
    # 3. Candidate queryset
    #
    # We calculate reputation and active workload here once.
    # --------------------------------------------------------

    base_queryset = (
        candidate_queryset
        if candidate_queryset is not None
        else CaregiverProfile.objects.all()
    )

    candidates = (
        base_queryset
        .filter(
            status=CaregiverStatus.APPROVED,
        )
        .exclude(
            id__in=already_assigned_ids,
        )
        .annotate(
            matching_avg_rating=Avg(
                "reviews__rating",
            ),

            matching_review_count=Count(
                "reviews",
                distinct=True,
            ),

            matching_active_patient_count=Count(
                "assignments",
                filter=Q(
                    assignments__status=(
                        AssignmentStatus.ACTIVE
                    ),
                ),
                distinct=True,
            ),
        )
        .select_related(
            "user",
            "user__caregiver_identity_profile",
            "work_preferences",
            "compatibility_questionnaire",
        )
        .prefetch_related(
            "service_areas",
        )
    )

    # --------------------------------------------------------
    # 4. Patient questionnaire / traits
    #
    # Calculated once because the patient is identical for
    # every caregiver.
    # --------------------------------------------------------

    patient_questionnaire = (
        _get_patient_questionnaire(
            patient
        )
    )

    patient_traits = compute_trait_profile(
        MatchingProfileSide.PATIENT,
        patient_questionnaire,
    )

    # Fetched once here, reused for every candidate below — the
    # actual N+1 fix. See compute_trait_profile's own docstring for
    # the measured impact (was: one identical query per caregiver;
    # now: one query total, regardless of candidate count).
    caregiver_mappings = list(
        QuestionTraitMapping.objects.filter(
            profile_type=MatchingProfileSide.CAREGIVER,
        )
    )

    # --------------------------------------------------------
    # 5. Build candidates
    # --------------------------------------------------------

    results: list[dict] = []

    for caregiver in candidates:

        candidate = _build_candidate(
            caregiver=caregiver,
            patient=patient,
            patient_traits=patient_traits,
            already_assigned_ids=already_assigned_ids,
            caregiver_mappings=caregiver_mappings,
        )

        if candidate is not None:
            results.append(candidate)

    # --------------------------------------------------------
    # 6. No eligible caregivers
    # --------------------------------------------------------

    if not results:
        return []

    # --------------------------------------------------------
    # 7. AHP + TOPSIS
    # --------------------------------------------------------

    results = rank_candidates_with_topsis(
        results
    )

    # --------------------------------------------------------
    # 8. Explanation
    # --------------------------------------------------------

    for candidate in results:

        explanation = build_match_explanation(
            candidate
        )

        candidate["match_confidence"] = (
            explanation["confidence"]
        )

        candidate["explanation"] = (
            explanation
        )

    # --------------------------------------------------------
    # 9. Final result
    # --------------------------------------------------------

    return results[:limit]