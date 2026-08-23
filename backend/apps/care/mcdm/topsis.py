from __future__ import annotations

import math
from typing import Sequence


def _euclidean_distance(
    values: Sequence[float],
) -> float:

    return math.sqrt(
        sum(
            value ** 2
            for value in values
        )
    )


def normalize_matrix(
    matrix: list[list[float]],
) -> list[list[float]]:
    """
    Vector normalization used by TOPSIS.
    """

    if not matrix:
        return []

    columns = len(matrix[0])

    denominators = []

    for column in range(columns):
        denominator = _euclidean_distance(
            row[column]
            for row in matrix
        )

        denominators.append(
            denominator
        )

    normalized = []

    for row in matrix:
        normalized.append(
            [
                (
                    row[column]
                    / denominators[column]
                    if denominators[column] != 0
                    else 0
                )
                for column in range(columns)
            ]
        )

    return normalized


def apply_weights(
    normalized_matrix: list[list[float]],
    weights: Sequence[float],
) -> list[list[float]]:

    if not normalized_matrix:
        return []

    if len(normalized_matrix[0]) != len(weights):
        raise ValueError(
            "Number of weights must equal number of criteria."
        )

    return [
        [
            value * weights[column]
            for column, value in enumerate(row)
        ]
        for row in normalized_matrix
    ]


def calculate_topsis(
    matrix: list[list[float]],
    weights: Sequence[float],
    benefit_criteria: Sequence[bool],
) -> list[float]:
    """
    Calculate TOPSIS closeness coefficients.

    benefit_criteria:
        True  → higher is better
        False → lower is better

    Returns:
        One score between 0 and 1 per candidate.
        Higher is better.
    """

    if not matrix:
        return []

    criterion_count = len(matrix[0])

    if len(weights) != criterion_count:
        raise ValueError(
            "Weights count does not match criteria count."
        )

    if len(benefit_criteria) != criterion_count:
        raise ValueError(
            "Benefit/cost flags count does not match criteria count."
        )

    # ---------------------------------------------------------------
    # 1. Normalize
    # ---------------------------------------------------------------

    normalized = normalize_matrix(
        matrix
    )

    # ---------------------------------------------------------------
    # 2. Apply weights
    # ---------------------------------------------------------------

    weighted = apply_weights(
        normalized,
        weights,
    )

    # ---------------------------------------------------------------
    # 3. Positive / negative ideal solutions
    # ---------------------------------------------------------------

    positive_ideal = []
    negative_ideal = []

    for column in range(criterion_count):

        values = [
            row[column]
            for row in weighted
        ]

        if benefit_criteria[column]:
            positive_ideal.append(
                max(values)
            )
            negative_ideal.append(
                min(values)
            )
        else:
            positive_ideal.append(
                min(values)
            )
            negative_ideal.append(
                max(values)
            )

    # ---------------------------------------------------------------
    # 4. Distance from ideals
    # ---------------------------------------------------------------

    scores = []

    for row in weighted:

        distance_positive = math.sqrt(
            sum(
                (
                    row[column]
                    - positive_ideal[column]
                ) ** 2
                for column in range(
                    criterion_count
                )
            )
        )

        distance_negative = math.sqrt(
            sum(
                (
                    row[column]
                    - negative_ideal[column]
                ) ** 2
                for column in range(
                    criterion_count
                )
            )
        )

        denominator = (
            distance_positive
            + distance_negative
        )

        if denominator == 0:
            score = 1.0
        else:
            score = (
                distance_negative
                / denominator
            )

        scores.append(score)

    return scores