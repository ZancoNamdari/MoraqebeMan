from django.test import SimpleTestCase

from apps.care.matching.ahp import (
    ahp_consistency_ratio,
    calculate_ahp_weights,
)


class AHPTests(SimpleTestCase):

    def test_weights_sum_to_one(self):

        criteria = [
            "objective",
            "trait",
            "reputation",
        ]

        matrix = [
            [1, 2, 3],
            [1 / 2, 1, 2],
            [1 / 3, 1 / 2, 1],
        ]

        weights = calculate_ahp_weights(
            criteria,
            matrix,
        )

        self.assertAlmostEqual(
            sum(weights.values()),
            1.0,
            places=5,
        )

    def test_consistent_matrix_has_low_cr(self):

        matrix = [
            [1, 2, 4],
            [1 / 2, 1, 2],
            [1 / 4, 1 / 2, 1],
        ]

        cr = ahp_consistency_ratio(
            matrix
        )

        self.assertLess(
            cr,
            0.10,
        )

    def test_invalid_matrix_is_rejected(self):

        with self.assertRaises(
            ValueError
        ):

            calculate_ahp_weights(
                ["a", "b"],
                [[1, 2, 3]],
            )