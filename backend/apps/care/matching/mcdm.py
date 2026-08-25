from __future__ import annotations

from .ahp import (
    ahp_consistency_ratio,
    calculate_ahp_weights,
)
from .topsis import calculate_topsis


CRITERIA = (
    "objective_fit",
    "cultural_ritual",
    "values_professional",
    "lifestyle",
    "cultural_flexibility",
    "reputation",
)


# ------------------------------------------------------------------
# Default expert configuration — used as the fallback when no active
# apps.care.models.MCDMWeightConfig row exists in the database (a
# fresh deployment, or nobody has used the weight-editing endpoint
# yet). Once a supervisor sets an active config via that endpoint,
# get_active_ahp_config() below returns THAT instead of this.
#
# This default is NOT claimed to be scientifically validated.
# It is our V1 configuration, same as it always was.
# ------------------------------------------------------------------

AHP_PAIRWISE_MATRIX = [
    # objective, cultural, values, lifestyle, flexibility, reputation

    [1,   2,   2,   2,   2,   2],
    [1/2, 1,   2,   2,   1,   1],
    [1/2, 1/2, 1,   2,   1,   1],
    [1/2, 1/2, 1/2, 1,   1,   1],
    [1/2, 1,   1,   1,   1,   1],
    [1/2, 1,   1,   1,   1,   1],
]


AHP_WEIGHTS = calculate_ahp_weights(
    criteria=CRITERIA,
    pairwise_matrix=AHP_PAIRWISE_MATRIX,
)


AHP_CONSISTENCY_RATIO = (
    ahp_consistency_ratio(
        AHP_PAIRWISE_MATRIX
    )
)


def _reputation_score(
    average_rating: float | None,
) -> float | None:
    """
    Convert rating 1..5 to 0..100.

    Missing reviews remain missing.
    They are NOT interpreted as zero.
    """

    if average_rating is None:
        return None

    rating = max(
        1.0,
        min(
            5.0,
            float(average_rating),
        ),
    )

    return (
        (rating - 1)
        / 4
    ) * 100


def build_candidate_matrix(
    candidates: list[dict],
) -> tuple[
    list[dict],
    list[str],
    list[list[float]],
]:
    """
    Build TOPSIS matrix.

    Missing criteria remain missing here.
    The ranking function decides whether enough information
    exists to calculate a meaningful score.
    """

    rows = []

    for candidate in candidates:

        dimensions = (
            candidate.get(
                "trait_dimension_scores"
            )
            or {}
        )

        rows.append(
            {
                "objective_fit": candidate.get(
                    "objective_fit_score"
                ),

                "cultural_ritual": dimensions.get(
                    "cultural_ritual"
                ),

                "values_professional": dimensions.get(
                    "values_professional"
                ),

                "lifestyle": dimensions.get(
                    "lifestyle"
                ),

                "cultural_flexibility": dimensions.get(
                    "cultural_flexibility"
                ),

                "reputation": _reputation_score(
                    candidate.get(
                        "avg_rating"
                    )
                ),
            }
        )

    # --------------------------------------------------------------
    # Only criteria with at least one real value are considered.
    # --------------------------------------------------------------

    active_criteria = []

    for criterion in CRITERIA:

        if any(
            row.get(criterion) is not None
            for row in rows
        ):
            active_criteria.append(
                criterion
            )

    if not active_criteria:
        return (
            rows,
            [],
            [],
        )

    # --------------------------------------------------------------
    # For a criterion with partial missingness, use mean imputation.
    #
    # This is NOT used to represent "bad".
    # It represents "unknown / neutral relative to this candidate set".
    #
    # Confidence still records that information was missing.
    # --------------------------------------------------------------

    for criterion in active_criteria:

        available = [
            row[criterion]
            for row in rows
            if row[criterion] is not None
        ]

        mean_value = (
            sum(available)
            / len(available)
        )

        for row in rows:

            if row[criterion] is None:
                row[criterion] = mean_value

    matrix = [
        [
            row[criterion]
            for criterion in active_criteria
        ]
        for row in rows
    ]

    return (
        rows,
        active_criteria,
        matrix,
    )


def get_active_ahp_config() -> tuple[dict, float, list]:
    """
    Loads the currently-active weight configuration from the database
    (apps.care.models.MCDMWeightConfig) — the "later move this to
    database configuration" the module-level default above always
    anticipated. Falls back to the hardcoded default matrix if no
    active config exists yet (a fresh deployment, or nobody has ever
    used the weight-editing endpoint), or if a stored matrix is
    somehow invalid (e.g. wrong shape) — a broken stored config should
    never crash matching, it should silently fall back to a known-
    good default and let the supervisor notice and fix it via the
    same endpoint that set it.
    """
    from apps.care.models import MCDMWeightConfig

    active = MCDMWeightConfig.objects.filter(is_active=True).first()

    if active is None:
        return AHP_WEIGHTS, AHP_CONSISTENCY_RATIO, AHP_PAIRWISE_MATRIX

    try:
        weights = calculate_ahp_weights(
            criteria=CRITERIA,
            pairwise_matrix=active.pairwise_matrix,
        )
        consistency_ratio = ahp_consistency_ratio(
            active.pairwise_matrix
        )
    except (ValueError, TypeError, ZeroDivisionError):
        return AHP_WEIGHTS, AHP_CONSISTENCY_RATIO, AHP_PAIRWISE_MATRIX

    return weights, consistency_ratio, active.pairwise_matrix


def rank_candidates_with_topsis(
    candidates: list[dict],
) -> list[dict]:

    if not candidates:
        return []

    active_weights, active_consistency_ratio, _ = get_active_ahp_config()

    (
        rows,
        active_criteria,
        matrix,
    ) = build_candidate_matrix(
        candidates
    )

    if not active_criteria:

        return [
            {
                **candidate,
                "mcdm_score": None,
                "mcdm_method": "unavailable",
                "ahp_weights": {},
                "ahp_consistency_ratio": None,
            }
            for candidate in candidates
        ]

    # --------------------------------------------------------------
    # Renormalize AHP weights over currently available criteria.
    # --------------------------------------------------------------

    raw_weights = {
        criterion: active_weights[criterion]
        for criterion in active_criteria
    }

    total_weight = sum(
        raw_weights.values()
    )

    weights = [
        raw_weights[criterion]
        / total_weight
        for criterion in active_criteria
    ]

    # All current criteria are benefits.
    benefit_criteria = [
        True
        for _ in active_criteria
    ]

    scores = calculate_topsis(
        matrix=matrix,
        weights=weights,
        benefit_criteria=benefit_criteria,
    )

    ranked = []

    for candidate, score in zip(
        candidates,
        scores,
    ):

        result = dict(candidate)

        result["mcdm_score"] = round(
            score * 100,
            2,
        )

        result["mcdm_method"] = (
            "ahp_topsis"
        )

        result["ahp_weights"] = {
            criterion: round(
                raw_weights[criterion]
                / total_weight,
                6,
            )
            for criterion in active_criteria
        }

        result["ahp_consistency_ratio"] = (
            active_consistency_ratio
        )

        ranked.append(result)

    ranked.sort(
        key=_ranking_sort_key,
        reverse=True,
    )

    return ranked


def _ranking_sort_key(
    item: dict,
) -> tuple:
    """
    Primary sort is mcdm_score. Ties are broken using this project's
    own matching spec's (SAS-4) tie-break order: specialization,
    working hours, distance, cultural compatibility, lifestyle
    compatibility. Language/dialect is deliberately not a separate
    tie-break key — it's already one of the four traits inside
    cultural_flexibility (see trait_matching.py's DIMENSION_TRAITS),
    so a second, independent comparison on it here would double-count
    the same signal rather than add a new one.

    Specialization and working-hours scores come from
    specialization.py (physical_condition_match_score,
    shift_availability_score) — added specifically to close this
    gap; they were previously unavailable anywhere in the pipeline.
    """

    mcdm_score = (
        item["mcdm_score"]
        if item["mcdm_score"] is not None
        else -1
    )

    objective_criterion_scores = (
        item.get("objective_criterion_scores") or {}
    )

    trait_dimension_scores = (
        item.get("trait_dimension_scores") or {}
    )

    specialization_score = (
        item.get("physical_condition_match_score")
        if item.get("physical_condition_match_score") is not None
        else -1
    )

    hours_score = (
        item.get("shift_availability_score")
        if item.get("shift_availability_score") is not None
        else -1
    )

    location_score = (
        objective_criterion_scores.get("location")
        if objective_criterion_scores.get("location") is not None
        else -1
    )

    cultural_score = (
        trait_dimension_scores.get("cultural_ritual")
        if trait_dimension_scores.get("cultural_ritual") is not None
        else -1
    )

    lifestyle_score = (
        trait_dimension_scores.get("lifestyle")
        if trait_dimension_scores.get("lifestyle") is not None
        else -1
    )

    return (
        mcdm_score,
        specialization_score,
        hours_score,
        location_score,
        cultural_score,
        lifestyle_score,
    )