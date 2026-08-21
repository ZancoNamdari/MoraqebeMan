from __future__ import annotations

from .ahp import (
    calculate_ahp_weights,
    ahp_consistency_ratio,
)
from .topsis import calculate_topsis


CRITERIA = (
    "objective_fit",
    "cultural_ritual",
    "values_professional",
    "lifestyle",
    "cultural_flexibility",
    "caregiver_cfi",
    "reputation",
)


# ----------------------------------------------------------------------
# Initial expert judgment.
#
# IMPORTANT:
# These are product configuration values, NOT scientific truth.
#
# Replace/refine them after domain-expert interviews and real outcome
# data become available.
# ----------------------------------------------------------------------

AHP_PAIRWISE_MATRIX = [
    # objective, cultural, values, lifestyle, flexibility, cfi, reputation

    [1,   2,   2,   2,   2,   2,   2],
    [1/2, 1,   2,   2,   1,   1,   1],
    [1/2, 1/2, 1,   2,   1,   1,   1],
    [1/2, 1/2, 1/2, 1,   1,   1,   1],
    [1/2, 1,   1,   1,   1,   1,   1],
    [1/2, 1,   1,   1,   1,   1,   1],
    [1/2, 1,   1,   1,   1,   1,   1],
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


def _dimension_score(
    trait_match: dict | None,
    key: str,
) -> float | None:

    if not trait_match:
        return None

    return trait_match["dimension_scores"].get(
        key
    )


def _reputation_score(
    avg_rating: float | None,
) -> float | None:

    if avg_rating is None:
        return None

    # 1..5 → 0..100
    return (
        (avg_rating - 1)
        / 4
    ) * 100


def build_candidate_matrix(
    candidates: list[dict],
) -> tuple[list[dict], list[str]]:
    """
    Convert matching results into a TOPSIS decision matrix.

    Candidates without enough information are retained, but unavailable
    criteria are handled by per-column imputation using the mean of
    available values.

    This avoids treating missing information as zero.
    """

    rows = []
    criteria = list(CRITERIA)

    for candidate in candidates:

        trait_scores = candidate.get(
            "trait_dimension_scores",
            {},
        )

        row = {
            "objective_fit": candidate.get(
                "objective_fit_score"
            ),

            "cultural_ritual": (
                trait_scores.get(
                    "عقیدتی و مناسکی"
                )
                or trait_scores.get(
                    "cultural_ritual"
                )
            ),

            "values_professional": (
                trait_scores.get(
                    "ارزش‌های بنیادین و مرزهای حرفه‌ای"
                )
                or trait_scores.get(
                    "values_professional"
                )
            ),

            "lifestyle": (
                trait_scores.get(
                    "سبک زندگی و شرایط محیطی"
                )
                or trait_scores.get(
                    "lifestyle"
                )
            ),

            "cultural_flexibility": (
                trait_scores.get(
                    "متاانعطاف‌پذیری و هوش فرهنگی"
                )
                or trait_scores.get(
                    "cultural_flexibility"
                )
            ),

            "caregiver_cfi": candidate.get(
                "caregiver_cfi"
            ),

            "reputation": _reputation_score(
                candidate.get("avg_rating")
            ),
        }

        rows.append(row)

    # ---------------------------------------------------------------
    # Impute missing values by criterion mean — but only when at least
    # one candidate actually has data for that criterion. If EVERY
    # candidate is missing the same criterion (e.g. nobody has any
    # objective-fit signal because no gender/age/location preferences
    # were ever recorded on either side), there's no mean to impute
    # from, and leaving None in the matrix isn't a fallback anyone
    # chose — it crashes calculate_topsis's arithmetic outright. Caught
    # this by actually running the pipeline against real candidate
    # data, not by inspecting the code. Fixed by excluding a criterion
    # ENTIRELY when it has no data on any candidate, same "exclude and
    # renormalize" pattern already used everywhere else missing data is
    # handled in this matching system (compute_overall_score, etc.),
    # rather than inventing a synthetic neutral value here.
    # ---------------------------------------------------------------

    unavailable_criteria = set()

    for criterion in criteria:

        available = [
            row[criterion]
            for row in rows
            if row[criterion] is not None
        ]

        if not available:
            unavailable_criteria.add(criterion)
            continue

        mean_value = (
            sum(available)
            / len(available)
        )

        for row in rows:
            if row[criterion] is None:
                row[criterion] = mean_value

    usable_criteria = [
        criterion
        for criterion in criteria
        if criterion not in unavailable_criteria
    ]

    return rows, usable_criteria


def rank_candidates_with_topsis(
    candidates: list[dict],
) -> list[dict]:

    if not candidates:
        return []

    rows, criteria = build_candidate_matrix(
        candidates
    )

    if not criteria:
        # No criterion had data for ANY candidate — nothing to rank
        # on. Return candidates with mcdm_score explicitly None rather
        # than crash or omit the field only in this one edge case,
        # which would make callers handle two different response
        # shapes depending on data availability they can't predict.
        return [
            {**candidate, "mcdm_score": None, "ahp_weights": None, "ahp_consistency_ratio": None}
            for candidate in candidates
        ]

    matrix = [
        [
            row[criterion]
            for criterion in criteria
        ]
        for row in rows
    ]

    # Renormalize the AHP weights over only the criteria that actually
    # have data this time — the same principle as compute_overall_
    # score elsewhere in this matching system: a criterion missing for
    # everyone shouldn't silently zero out its share of the ranking,
    # it should be excluded and the rest scaled back up to sum to 1.
    raw_weights = [AHP_WEIGHTS[criterion] for criterion in criteria]
    weight_total = sum(raw_weights)
    weights = [w / weight_total for w in raw_weights]

    # Every criterion currently means: higher = better.
    benefit_criteria = [True] * len(criteria)

    topsis_scores = calculate_topsis(
        matrix=matrix,
        weights=weights,
        benefit_criteria=benefit_criteria,
    )

    ranked = []

    for candidate, score in zip(
        candidates,
        topsis_scores,
    ):

        result = dict(candidate)

        result["mcdm_score"] = round(
            score * 100,
            2,
        )

        result["ahp_weights"] = AHP_WEIGHTS

        result["ahp_consistency_ratio"] = (
            AHP_CONSISTENCY_RATIO
        )

        ranked.append(result)

    ranked.sort(
        key=lambda item: item["mcdm_score"],
        reverse=True,
    )

    return ranked