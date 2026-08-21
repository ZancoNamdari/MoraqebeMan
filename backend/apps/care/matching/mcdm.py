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
# Initial expert configuration.
#
# This is NOT claimed to be scientifically validated.
# It is our V1 configuration.
#
# Later move this to database configuration.
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


def rank_candidates_with_topsis(
    candidates: list[dict],
) -> list[dict]:

    if not candidates:
        return []

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
        criterion: AHP_WEIGHTS[criterion]
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
            AHP_CONSISTENCY_RATIO
        )

        ranked.append(result)

    ranked.sort(
        key=lambda item: (
            item["mcdm_score"]
            if item["mcdm_score"] is not None
            else -1
        ),
        reverse=True,
    )

    return ranked