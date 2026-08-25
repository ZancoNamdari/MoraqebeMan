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

    def test_trait_only_match_is_medium_not_low(self):
        # The bug this test guards against: a candidate with no
        # objective-fit data (no recorded gender/age/location
        # preference) but a complete, high-quality trait match (both
        # questionnaires filled in) previously fell through to "low"
        # confidence — even though real, complete matching information
        # existed. calculate_confidence's own docstring states
        # confidence should reflect information completeness; trait
        # data alone is complete information and should count exactly
        # like objective data alone does, not be treated as if no
        # information existed at all. Found live, via
        # /api/care/suggest-caregivers/, not by reading the code —
        # confirmed the fix against that same real scenario before
        # writing this test.

        candidate = {
            "objective_fit_score": None,
            "trait_match_score": 91,
            "review_count": 0,
        }

        confidence = calculate_confidence(
            candidate
        )

        self.assertEqual(
            confidence,
            "medium",
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