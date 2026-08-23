from django.test import SimpleTestCase

from apps.care.matching.topsis import (
    calculate_topsis,
)


class TOPSISTests(SimpleTestCase):

    def test_scores_are_between_zero_and_one(self):

        matrix = [
            [90, 80, 70],
            [80, 90, 80],
            [70, 70, 95],
        ]

        scores = calculate_topsis(
            matrix=matrix,
            weights=[
                0.5,
                0.3,
                0.2,
            ],
            benefit_criteria=[
                True,
                True,
                True,
            ],
        )

        for score in scores:

            self.assertGreaterEqual(
                score,
                0,
            )

            self.assertLessEqual(
                score,
                1,
            )

    def test_identical_candidates_are_equal(self):

        matrix = [
            [80, 90],
            [80, 90],
        ]

        scores = calculate_topsis(
            matrix=matrix,
            weights=[
                0.5,
                0.5,
            ],
            benefit_criteria=[
                True,
                True,
            ],
        )

        self.assertEqual(
            scores[0],
            scores[1],
        )

    def test_cost_criterion(self):

        matrix = [
            [100, 10],
            [100, 20],
        ]

        scores = calculate_topsis(
            matrix=matrix,
            weights=[
                0.5,
                0.5,
            ],
            benefit_criteria=[
                True,
                False,
            ],
        )

        self.assertGreater(
            scores[0],
            scores[1],
        )