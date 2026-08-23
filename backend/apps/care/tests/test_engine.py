from django.test import SimpleTestCase

from apps.care.matching.explanations import (
    calculate_confidence,
)


class MatchingEngineTests(
    SimpleTestCase
):

    def test_complete_match_has_high_or_medium_confidence(self):

        candidate = {
            "objective_fit_score": 90,
            "trait_match_score": 92,
            "review_count": 10,
        }

        confidence = calculate_confidence(
            candidate
        )

        self.assertEqual(
            confidence,
            "high",
        )

    def test_objective_only_match_is_medium(self):

        candidate = {
            "objective_fit_score": 90,
            "trait_match_score": None,
            "review_count": 0,
        }

        confidence = calculate_confidence(
            candidate
        )

        self.assertEqual(
            confidence,
            "medium",
        )

    def test_no_objective_information_is_low(self):

        candidate = {
            "objective_fit_score": None,
            "trait_match_score": None,
            "review_count": 0,
        }

        confidence = calculate_confidence(
            candidate
        )

        self.assertEqual(
            confidence,
            "low",
        )