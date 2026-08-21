from __future__ import annotations

from typing import Sequence


def _validate_matrix(
    criteria_count: int,
    pairwise_matrix: Sequence[Sequence[float]],
) -> list[list[float]]:
    """Validate and convert the AHP pairwise matrix."""

    matrix = [
        [float(value) for value in row]
        for row in pairwise_matrix
    ]

    if len(matrix) != criteria_count:
        raise ValueError(
            "AHP matrix dimensions must match criteria count."
        )

    if any(
        len(row) != criteria_count
        for row in matrix
    ):
        raise ValueError(
            "AHP matrix must be square."
        )

    if any(
        value <= 0
        for row in matrix
        for value in row
    ):
        raise ValueError(
            "AHP pairwise values must be greater than zero."
        )

    return matrix


def _normalize_columns(
    matrix: list[list[float]],
) -> list[list[float]]:
    """
    Normalize each column of the pairwise comparison matrix.

    AHP normalized matrix:
        normalized[i][j] =
            matrix[i][j] / sum(matrix[*][j])
    """

    n = len(matrix)

    column_sums = [
        sum(
            matrix[row][column]
            for row in range(n)
        )
        for column in range(n)
    ]

    return [
        [
            (
                matrix[row][column]
                / column_sums[column]
                if column_sums[column] != 0
                else 0.0
            )
            for column in range(n)
        ]
        for row in range(n)
    ]


def calculate_ahp_weights(
    criteria: Sequence[str],
    pairwise_matrix: Sequence[Sequence[float]],
) -> dict[str, float]:
    """
    Calculate AHP criterion weights.

    This implementation uses the normalized-column / row-average
    method and requires no external dependencies.

    criteria:
        Ordered criterion names.

    pairwise_matrix:
        Saaty-style pairwise comparison matrix.

    Example:

        criteria = [
            "objective_fit",
            "trait_compatibility",
            "quality",
        ]

        pairwise_matrix = [
            [1,   3,   2],
            [1/3, 1,   1/2],
            [1/2, 2,   1],
        ]

    Returns:

        {
            "objective_fit": 0.5396,
            "trait_compatibility": 0.1638,
            "quality": 0.2966,
        }

    The returned weights always sum to 1.
    """

    n = len(criteria)

    if n == 0:
        raise ValueError(
            "At least one criterion is required."
        )

    matrix = _validate_matrix(
        criteria_count=n,
        pairwise_matrix=pairwise_matrix,
    )

    # ---------------------------------------------------------
    # Step 1:
    # Normalize every column.
    # ---------------------------------------------------------

    normalized_matrix = _normalize_columns(
        matrix
    )

    # ---------------------------------------------------------
    # Step 2:
    # Calculate the priority vector.
    #
    # Each criterion's weight is the average of its row.
    # ---------------------------------------------------------

    weights = [
        sum(row) / n
        for row in normalized_matrix
    ]

    # ---------------------------------------------------------
    # Step 3:
    # Make sure weights sum exactly to 1.
    # ---------------------------------------------------------

    total_weight = sum(weights)

    if total_weight == 0:
        raise ValueError(
            "Unable to calculate AHP weights."
        )

    weights = [
        weight / total_weight
        for weight in weights
    ]

    return {
        criterion: round(
            weight,
            6,
        )
        for criterion, weight in zip(
            criteria,
            weights,
        )
    }


def ahp_consistency_ratio(
    pairwise_matrix: Sequence[Sequence[float]],
) -> float:
    """
    Calculate AHP Consistency Ratio.

    CR < 0.10 is generally considered acceptable.

    This implementation requires no external dependencies.

    The function does not modify the pairwise matrix.
    """

    matrix = [
        [float(value) for value in row]
        for row in pairwise_matrix
    ]

    n = len(matrix)

    if n == 0:
        raise ValueError(
            "AHP matrix cannot be empty."
        )

    if any(
        len(row) != n
        for row in matrix
    ):
        raise ValueError(
            "AHP matrix must be square."
        )

    if any(
        value <= 0
        for row in matrix
        for value in row
    ):
        raise ValueError(
            "AHP pairwise values must be greater than zero."
        )

    # For 1x1 and 2x2 matrices, the consistency ratio
    # is conventionally treated as zero because Saaty's
    # Random Index is zero for these sizes.
    if n <= 2:
        return 0.0

    # ---------------------------------------------------------
    # Step 1:
    # Calculate AHP weights.
    # ---------------------------------------------------------

    criteria = [
        str(index)
        for index in range(n)
    ]

    weights_dict = calculate_ahp_weights(
        criteria=criteria,
        pairwise_matrix=matrix,
    )

    weights = [
        weights_dict[criterion]
        for criterion in criteria
    ]

    # ---------------------------------------------------------
    # Step 2:
    # Calculate A × W.
    # ---------------------------------------------------------

    weighted_sum = []

    for row in matrix:

        value = sum(
            row[index] * weights[index]
            for index in range(n)
        )

        weighted_sum.append(value)

    # ---------------------------------------------------------
    # Step 3:
    # Calculate lambda values.
    #
    # lambda_i = (A × W)_i / W_i
    # ---------------------------------------------------------

    lambda_values = [
        weighted_sum[index] / weights[index]
        for index in range(n)
        if weights[index] != 0
    ]

    if not lambda_values:
        raise ValueError(
            "Unable to calculate AHP consistency."
        )

    lambda_max = (
        sum(lambda_values)
        / len(lambda_values)
    )

    # ---------------------------------------------------------
    # Step 4:
    # Consistency Index.
    #
    # CI = (lambda_max - n) / (n - 1)
    # ---------------------------------------------------------

    consistency_index = (
        lambda_max - n
    ) / (n - 1)

    # ---------------------------------------------------------
    # Step 5:
    # Saaty's Random Index.
    # ---------------------------------------------------------

    random_index = {
        1: 0.00,
        2: 0.00,
        3: 0.58,
        4: 0.90,
        5: 1.12,
        6: 1.24,
        7: 1.32,
        8: 1.41,
        9: 1.45,
        10: 1.49,
    }

    ri = random_index.get(
        n,
        1.49,
    )

    if ri == 0:
        return 0.0

    # ---------------------------------------------------------
    # Step 6:
    # Consistency Ratio.
    #
    # CR = CI / RI
    # ---------------------------------------------------------

    return round(
        consistency_index / ri,
        6,
    )