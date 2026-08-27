from __future__ import annotations

from typing import Sequence

import numpy as np

"""
Vectorized with numpy — same public function names, signatures, and
input/output types (plain Python lists in, plain Python lists/floats
out) as before, specifically so nothing calling this module
(apps.care.matching.mcdm) needs to change at all. Every validation
check, every edge case (empty matrix, zero-denominator columns, zero
total distance), and every exception type/message is preserved
exactly — this is a vectorized rewrite of the same algorithm, not a
different one.

Why here specifically, not the per-candidate loop in engine.py: this
is a small, pure, already-isolated numerical function with no Django
ORM calls, no missing-data conditional branching (that's handled
upstream in mcdm.py's build_candidate_matrix, which already
redistributes weights for missing criteria before this function ever
runs), and an existing, extensive test suite
(tests.integration.test_mcdm's TOPSISRankingTests and
MCDMIntegrationTests) that already verifies its exact numerical
behavior — meaning correctness here can be verified against real,
pre-existing tests, not new ones written to match whatever the
rewrite happens to produce. The per-candidate loop in engine.py
(waterfall filtering, JSON-list membership checks, Django attribute
access) is real business logic that doesn't vectorize cleanly and
would be a much larger, riskier rewrite — deliberately not attempted
here without real profiling data first (see
measure_matching_performance --profile).
"""


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

    arr = np.array(matrix, dtype=float)
    denominators = np.sqrt(np.sum(arr ** 2, axis=0))

    with np.errstate(divide="ignore", invalid="ignore"):
        normalized = np.where(denominators == 0, 0.0, arr / denominators)

    return normalized.tolist()


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

    arr = np.array(normalized_matrix, dtype=float)
    weights_arr = np.array(weights, dtype=float)

    return (arr * weights_arr).tolist()


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

    normalized = normalize_matrix(matrix)
    weighted = np.array(apply_weights(normalized, weights), dtype=float)

    benefit_mask = np.array(benefit_criteria, dtype=bool)

    column_max = weighted.max(axis=0)
    column_min = weighted.min(axis=0)

    positive_ideal = np.where(benefit_mask, column_max, column_min)
    negative_ideal = np.where(benefit_mask, column_min, column_max)

    distance_positive = np.sqrt(np.sum((weighted - positive_ideal) ** 2, axis=1))
    distance_negative = np.sqrt(np.sum((weighted - negative_ideal) ** 2, axis=1))

    denominator = distance_positive + distance_negative

    with np.errstate(divide="ignore", invalid="ignore"):
        scores = np.where(denominator == 0, 1.0, distance_negative / denominator)

    return [round(float(score), 6) for score in scores]
