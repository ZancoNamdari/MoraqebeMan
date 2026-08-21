from __future__ import annotations

import math
from typing import Sequence


def normalize_matrix(
    matrix: list[list[float]],
) -> list[list[float]]:
    """
    TOPSIS vector normalization.

    r_ij = x_ij / sqrt(sum(x_ij²))
    """

    if not matrix:
        return []

    column_count = len(matrix[0])

    if any(
        len(row) != column_count
        for row in matrix
    ):
        raise ValueError(
            "All TOPSIS rows must have equal length."
        )

    normalized = [
        [0.0] * column_count
        for _ in matrix
    ]

    for column in range(column_count):

        denominator = math.sqrt(
            sum(
                row[column] ** 2
                for row in matrix
            )
        )

        for row_index in range(len(matrix)):

            if denominator == 0:
                normalized[row_index][column] = 0.0
            else:
                normalized[row_index][column] = (
                    matrix[row_index][column]
                    / denominator
                )

    return normalized


def apply_weights(
    normalized_matrix: list[list[float]],
    weights: Sequence[float],
) -> list[list[float]]:
    """Apply AHP weights to normalized TOPSIS values."""

    if not normalized_matrix:
        return []

    criterion_count = len(
        normalized_matrix[0]
    )

    if len(weights) != criterion_count:
        raise ValueError(
            "Weights count must equal criterion count."
        )

    if any(
        weight < 0
        for weight in weights
    ):
        raise ValueError(
            "Weights cannot be negative."
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
    Calculate TOPSIS closeness coefficient.

    True  = benefit criterion (higher is better)
    False = cost criterion (lower is better)

    Returns scores between 0 and 1.
    """

    if not matrix:
        return []

    criterion_count = len(matrix[0])

    if len(weights) != criterion_count:
        raise ValueError(
            "Weights count must equal criterion count."
        )

    if len(benefit_criteria) != criterion_count:
        raise ValueError(
            "Benefit flags count must equal criterion count."
        )

    if any(
        len(row) != criterion_count
        for row in matrix
    ):
        raise ValueError(
            "All TOPSIS rows must have equal length."
        )

    normalized = normalize_matrix(
        matrix
    )

    weighted = apply_weights(
        normalized,
        weights,
    )

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

    scores = []

    for row in weighted:

        distance_positive = math.sqrt(
            sum(
                (
                    row[column]
                    - positive_ideal[column]
                ) ** 2
                for column in range(criterion_count)
            )
        )

        distance_negative = math.sqrt(
            sum(
                (
                    row[column]
                    - negative_ideal[column]
                ) ** 2
                for column in range(criterion_count)
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

        scores.append(
            round(score, 6)
        )

    return scores