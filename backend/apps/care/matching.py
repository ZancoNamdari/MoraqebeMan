"""
Caregiver ↔ Patient matching engine.

Matching pipeline
-----------------

Phase 1 — Hard eligibility / Waterfall
    Remove caregivers who cannot actually serve the patient:
    - caregiver must be APPROVED
    - caregiver must not already be actively assigned
    - service area must match the patient's location

Phase 2 — Objective Fit
    Score directly observable compatibility:
    - gender preference
    - patient age range
    - service-area match

    Missing information is NOT treated as a mismatch.
    The score is normalized over the criteria that are actually available.

Phase 3 — Trait Compatibility
    If BOTH questionnaires are available:
    - convert answers → configured psychosocial traits
    - calculate similarity/adaptability
    - calculate dimension scores
    - calculate overall trait compatibility
    - calculate caregiver CFI

    If either questionnaire is missing:
        trait_match = None

Phase 4 — MCDM-ready ranking
    Objective and trait scores remain separate.
    A configurable final ranking score combines available signals.

    This is intentionally kept simple for V1.
    Later this layer can be replaced by AHP/TOPSIS without changing
    the underlying matching calculations.

The result is deliberately explainable:
supervisors can see the objective score, trait score, dimensions,
reviews, workload and the final ranking score separately.
"""

from __future__ import annotations

import datetime
from typing import Any

from django.db.models import Avg, Count, Q

from apps.care.models import (
    AssignmentStatus,
    CaregiverAssignment,
    CaregiverReview,
    MatchingProfileSide,
)
from apps.care.trait_matching import (
    compute_full_match,
    compute_trait_profile,
)
from apps.caregivers.choices import AcceptedGender
from apps.caregivers.models import (
    CaregiverProfile,
    CaregiverStatus,
)


# ============================================================================
# CONFIGURATION
# ============================================================================

# Objective-fit weights.
#
# These are NOT the final product-wide MCDM weights.
# They only describe how the objective-fit component itself is calculated.
OBJECTIVE_WEIGHTS = {
    "gender": 0.40,
    "age": 0.30,
    "location": 0.30,
}

# V1 ranking weights.
#
# Keep these configurable because the next phase can replace them with
# AHP-derived weights / TOPSIS without changing the lower-level matchers.
#
# If trait compatibility is unavailable, the available weights are
# automatically renormalized.
FINAL_RANKING_WEIGHTS = {
    "objective_fit": 0.50,
    "trait_compatibility": 0.50,
}


# ============================================================================
# BASIC PATIENT HELPERS
# ============================================================================

def _patient_age(patient) -> int | None:
    """
    Return patient's Gregorian age.

    django-jalali can expose birth_date as either datetime.date or
    jdatetime.date depending on whether the object has round-tripped
    through the database, so normalize explicitly.
    """
    if patient.birth_date is None:
        return None

    born = patient.birth_date

    if hasattr(born, "togregorian"):
        born = born.togregorian()

    today = datetime.date.today()

    return (
        today.year
        - born.year
        - ((today.month, today.day) < (born.month, born.day))
    )


def _age_bracket(age: int | None) -> str | None:
    """
    Convert patient age into the configured caregiver preference bracket.
    """
    if age is None:
        return None

    if age < 60:
        return None

    if age <= 70:
        return "60_70"

    if age <= 80:
        return "70_80"

    return "over_80"


# ============================================================================
# SERVICE AREA / HARD ELIGIBILITY
# ============================================================================

def _service_area_match(
    caregiver: CaregiverProfile,
    patient,
) -> dict[str, Any]:
    """
    Determine caregiver ↔ patient geographical compatibility.

    Returns:
        {
            "eligible": bool,
            "score": 0..100 | None,
            "level": "city" | "province" | "none" | "unknown",
            "reason": str,
        }

    City match = 100
    Province match = 60

    Location is treated as a hard eligibility requirement in the
    waterfall stage. Therefore a caregiver with a known location that
    does not match the patient is rejected before ranking.
    """
    patient_province_id = getattr(patient, "province_id", None)
    patient_city_id = getattr(patient, "city_id", None)

    if not patient_province_id:
        return {
            "eligible": True,
            "score": None,
            "level": "unknown",
            "reason": "استان بیمار ثبت نشده — معیار محل محاسبه نشد",
        }

    areas = list(caregiver.service_areas.all())

    if not areas:
        return {
            "eligible": False,
            "score": 0,
            "level": "none",
            "reason": "مراقب هنوز منطقه خدماتی ثبت نکرده است",
        }

    province_match = any(
        area.province_id == patient_province_id
        for area in areas
    )

    city_match = bool(
        patient_city_id
        and any(
            area.city_id == patient_city_id
            for area in areas
        )
    )

    if city_match:
        return {
            "eligible": True,
            "score": 100,
            "level": "city",
            "reason": "منطقه خدماتی مراقب دقیقاً با شهر بیمار مطابقت دارد",
        }

    if province_match:
        return {
            "eligible": True,
            "score": 60,
            "level": "province",
            "reason": "منطقه خدماتی مراقب با استان بیمار مطابقت دارد",
        }

    return {
        "eligible": False,
        "score": 0,
        "level": "none",
        "reason": "منطقه خدماتی مراقب با محل بیمار مطابقت ندارد",
    }


def _passes_waterfall(
    caregiver: CaregiverProfile,
    patient,
    already_assigned_ids: set,
) -> tuple[bool, list[str], dict[str, Any]]:
    """
    Phase 1 — Waterfall eligibility.

    Returns:
        (eligible, rejection_reasons, service_area_result)
    """
    rejection_reasons = []

    if caregiver.id in already_assigned_ids:
        rejection_reasons.append(
            "مراقب در حال حاضر به این بیمار اختصاص داده شده است"
        )

    service_area = _service_area_match(caregiver, patient)

    if not service_area["eligible"]:
        rejection_reasons.append(service_area["reason"])

    return (
        not rejection_reasons,
        rejection_reasons,
        service_area,
    )


# ============================================================================
# OBJECTIVE FIT
# ============================================================================

def _gender_match(caregiver: CaregiverProfile, patient) -> dict[str, Any]:
    """
    Gender compatibility.

    Missing data = unavailable, NOT mismatch.
    """
    work_prefs = getattr(caregiver, "work_preferences", None)

    patient_gender = getattr(patient, "gender", None)
    accepted_gender = (
        getattr(work_prefs, "accepted_gender", None)
        if work_prefs
        else None
    )

    if not patient_gender:
        return {
            "available": False,
            "score": None,
            "reason": "جنسیت بیمار ثبت نشده — این معیار محاسبه نشد",
        }

    if not accepted_gender:
        return {
            "available": False,
            "score": None,
            "reason": "ترجیح جنسیتی مراقب ثبت نشده — این معیار محاسبه نشد",
        }

    if accepted_gender == AcceptedGender.NO_PREFERENCE:
        return {
            "available": True,
            "score": 100,
            "reason": "مراقب به جنسیت بیمار حساسیتی ندارد",
        }

    if (
        accepted_gender == AcceptedGender.FEMALE_ONLY
        and patient_gender == "female"
    ) or (
        accepted_gender == AcceptedGender.MALE_ONLY
        and patient_gender == "male"
    ):
        return {
            "available": True,
            "score": 100,
            "reason": "جنسیت بیمار با ترجیح مراقب هم‌خوانی دارد",
        }

    return {
        "available": True,
        "score": 0,
        "reason": "جنسیت بیمار با ترجیح مراقب هم‌خوانی ندارد",
    }


def _age_match(caregiver: CaregiverProfile, patient) -> dict[str, Any]:
    """
    Age-range compatibility.

    Missing data = unavailable, NOT mismatch.
    """
    work_prefs = getattr(caregiver, "work_preferences", None)

    age = _patient_age(patient)

    if age is None:
        return {
            "available": False,
            "score": None,
            "reason": "تاریخ تولد بیمار ثبت نشده — این معیار محاسبه نشد",
        }

    ranges = (
        getattr(work_prefs, "accepted_age_ranges", None)
        if work_prefs
        else None
    )

    if not ranges:
        return {
            "available": False,
            "score": None,
            "reason": "بازه سنی مورد قبول مراقب ثبت نشده — این معیار محاسبه نشد",
        }

    bracket = _age_bracket(age)

    if "no_preference" in ranges:
        return {
            "available": True,
            "score": 100,
            "reason": "مراقب محدودیت سنی برای بیمار ندارد",
        }

    if bracket and bracket in ranges:
        return {
            "available": True,
            "score": 100,
            "reason": "بازه سنی بیمار با ترجیح مراقب هم‌خوانی دارد",
        }

    return {
        "available": True,
        "score": 0,
        "reason": "بازه سنی بیمار خارج از ترجیح مراقب است",
    }


def score_caregiver_for_patient(
    caregiver: CaregiverProfile,
    patient,
    *,
    service_area: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Phase 2 — Objective Fit.

    Returns a normalized 0..100 score over criteria for which data
    actually exists.

    Missing information is excluded from the denominator instead of
    being silently treated as zero.

    Example:

        gender available  -> 100
        age unavailable   -> ignored
        location available -> 100

    objective score = 100, not 66.7.
    """
    gender = _gender_match(caregiver, patient)
    age = _age_match(caregiver, patient)

    if service_area is None:
        service_area = _service_area_match(caregiver, patient)

    criteria = {
        "gender": gender,
        "age": age,
        "location": service_area,
    }

    weighted_sum = 0.0
    available_weight = 0.0
    reasons = []

    for criterion, result in criteria.items():
        if result["available"] if "available" in result else result["score"] is not None:
            if result["score"] is not None:
                weight = OBJECTIVE_WEIGHTS[criterion]
                weighted_sum += result["score"] * weight
                available_weight += weight

        reasons.append(result["reason"])

    if available_weight == 0:
        objective_score = None
    else:
        objective_score = round(weighted_sum / available_weight)

    return {
        "score": objective_score,
        "reasons": reasons,
        "criteria": {
            "gender": gender["score"],
            "age": age["score"],
            "location": service_area["score"],
        },
        "location_level": service_area["level"],
    }


# ============================================================================
# TRAIT MATCHING
# ============================================================================

def _compute_trait_match(
    patient_questionnaire,
    caregiver_questionnaire,
    patient_traits: dict[str, int],
) -> dict[str, Any] | None:
    """
    Phase 3 — Trait compatibility.

    IMPORTANT:
    The trait engine is only active when BOTH questionnaires exist.

    Missing questionnaire = None.
    It is never converted to zero.
    """
    if patient_questionnaire is None:
        return None

    if caregiver_questionnaire is None:
        return None

    return compute_full_match(
        patient_questionnaire,
        caregiver_questionnaire,
        patient_traits=patient_traits,
    )


# ============================================================================
# FINAL MCDM-READY RANKING
# ============================================================================

def _calculate_final_ranking_score(
    objective_score: int | None,
    trait_score: int | None,
) -> int | None:
    """
    V1 MCDM aggregation.

    Available scores are renormalized.

    This intentionally remains a simple weighted aggregation so that
    the next phase can replace this function with TOPSIS without
    changing the rest of the matching engine.
    """
    available = []

    if objective_score is not None:
        available.append(
            (
                objective_score,
                FINAL_RANKING_WEIGHTS["objective_fit"],
            )
        )

    if trait_score is not None:
        available.append(
            (
                trait_score,
                FINAL_RANKING_WEIGHTS["trait_compatibility"],
            )
        )

    if not available:
        return None

    total_weight = sum(weight for _, weight in available)

    return round(
        sum(score * weight for score, weight in available)
        / total_weight
    )


# ============================================================================
# MAIN SUGGESTION ENGINE
# ============================================================================

def suggest_caregivers_for_patient(
    patient,
    limit: int = 10,
) -> list[dict]:
    """
    Return the best caregiver candidates for a patient.

    Pipeline:

        APPROVED
            ↓
        remove already-assigned
            ↓
        Waterfall eligibility
            ↓
        Objective Fit
            ↓
        Trait Compatibility
            ↓
        MCDM-ready final ranking
            ↓
        Top N
    """

    # ----------------------------------------------------------------------
    # Existing active assignments
    # ----------------------------------------------------------------------

    already_assigned_ids = set(
        CaregiverAssignment.objects.filter(
            patient=patient,
            status=AssignmentStatus.ACTIVE,
        ).values_list(
            "caregiver_id",
            flat=True,
        )
    )

    # ----------------------------------------------------------------------
    # Candidate queryset
    #
    # IMPORTANT:
    # review statistics and active assignment count are annotated here
    # instead of querying once per caregiver.
    # ----------------------------------------------------------------------

    candidates = (
        CaregiverProfile.objects
        .filter(status=CaregiverStatus.APPROVED)
        .exclude(id__in=already_assigned_ids)
        .select_related(
            "user",
            "work_preferences",
            "compatibility_questionnaire",
        )
        .prefetch_related(
            "service_areas",
        )
        .annotate(
            average_rating=Avg(
                "reviews__rating",
            ),
            review_count=Count(
                "reviews__id",
                distinct=True,
            ),
            active_patient_count=Count(
                "assignments",
                filter=Q(
                    assignments__status=AssignmentStatus.ACTIVE,
                ),
                distinct=True,
            ),
        )
    )

    # ----------------------------------------------------------------------
    # Patient trait profile
    #
    # Computed exactly once.
    # ----------------------------------------------------------------------

    patient_questionnaire = getattr(
        patient,
        "compatibility_questionnaire",
        None,
    )

    patient_traits = compute_trait_profile(
        MatchingProfileSide.PATIENT,
        patient_questionnaire,
    )

    results = []

    # ----------------------------------------------------------------------
    # Candidate evaluation
    # ----------------------------------------------------------------------

    for caregiver in candidates:

        # ================================================================
        # PHASE 1 — WATERFALL
        # ================================================================

        eligible, rejection_reasons, service_area = _passes_waterfall(
            caregiver,
            patient,
            already_assigned_ids,
        )

        if not eligible:
            # Do NOT return rejected candidates in recommendations.
            # If auditability is needed later, this rejection information
            # should be persisted separately.
            continue

        # ================================================================
        # PHASE 2 — OBJECTIVE FIT
        # ================================================================

        objective_match = score_caregiver_for_patient(
            caregiver,
            patient,
            service_area=service_area,
        )

        # ================================================================
        # PHASE 3 — TRAIT COMPATIBILITY
        # ================================================================

        caregiver_questionnaire = getattr(
            caregiver,
            "compatibility_questionnaire",
            None,
        )

        trait_match = _compute_trait_match(
            patient_questionnaire,
            caregiver_questionnaire,
            patient_traits,
        )

        objective_score = objective_match["score"]

        trait_score = (
            trait_match["overall_score"]
            if trait_match is not None
            else None
        )

        # ================================================================
        # PHASE 4 — MCDM-READY FINAL SCORE
        # ================================================================

        final_score = _calculate_final_ranking_score(
            objective_score,
            trait_score,
        )

        # ================================================================
        # IDENTITY
        # ================================================================

        identity = getattr(
            caregiver.user,
            "caregiver_identity_profile",
            None,
        )

        caregiver_name = (
            identity.full_name
            if identity
            else caregiver.user.username
        )

        # ================================================================
        # QUESTIONNAIRE INFORMATION
        # ================================================================

        flexibility_score = (
            caregiver_questionnaire.overall_flexibility_score()
            if caregiver_questionnaire
            else None
        )

        flexibility_sections = (
            caregiver_questionnaire.section_scores()
            if caregiver_questionnaire
            else None
        )

        # ================================================================
        # RESULT
        # ================================================================

        results.append(
            {
                # ------------------------------------------------------
                # Identity
                # ------------------------------------------------------
                "caregiver_user_id": caregiver.user_id,
                "caregiver_name": caregiver_name,
                "caregiver_gender": (
                    identity.gender
                    if identity
                    else ""
                ),

                # ------------------------------------------------------
                # Waterfall
                # ------------------------------------------------------
                "eligible": True,
                "rejection_reasons": rejection_reasons,

                # ------------------------------------------------------
                # Objective Fit
                # ------------------------------------------------------
                "objective_fit_score": objective_score,
                "objective_fit_criteria": objective_match["criteria"],
                "objective_fit_reasons": objective_match["reasons"],
                "location_match_level": objective_match["location_level"],

                # Backward-compatible alias
                "score": objective_score,

                # ------------------------------------------------------
                # Trait Matching
                # ------------------------------------------------------
                "trait_match_score": trait_score,
                "trait_dimension_scores": (
                    trait_match["dimension_scores"]
                    if trait_match
                    else {}
                ),
                "caregiver_cfi": (
                    trait_match["caregiver_cfi"]
                    if trait_match
                    else None
                ),

                # ------------------------------------------------------
                # Existing questionnaire metrics
                # ------------------------------------------------------
                "flexibility_score": flexibility_score,
                "flexibility_sections": flexibility_sections,

                # ------------------------------------------------------
                # Reputation / operational information
                # ------------------------------------------------------
                "avg_rating": (
                    round(caregiver.average_rating, 1)
                    if caregiver.average_rating is not None
                    else None
                ),
                "review_count": caregiver.review_count,
                "active_patient_count": caregiver.active_patient_count,

                # ------------------------------------------------------
                # Final ranking
                # ------------------------------------------------------
                "ranking_score": final_score,
            }
        )

    # ----------------------------------------------------------------------
    # FINAL SORT
    #
    # ranking_score is the primary ranking signal.
    #
    # Then:
    #   1. trait score
    #   2. objective score
    #   3. rating
    #
    # None values always go to the bottom.
    # ----------------------------------------------------------------------

    results.sort(
        key=lambda r: (
            r["ranking_score"] is not None,
            r["ranking_score"] or -1,
            r["trait_match_score"] is not None,
            r["trait_match_score"] or -1,
            r["objective_fit_score"] is not None,
            r["objective_fit_score"] or -1,
            r["avg_rating"] is not None,
            r["avg_rating"] or -1,
        ),
        reverse=True,
    )

    return results[:limit]