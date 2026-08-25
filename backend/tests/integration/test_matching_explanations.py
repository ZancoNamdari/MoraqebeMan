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

    def test_trait_only_match_is_medium_not_low(self):
        # Regression test for the symmetry fix in calculate_confidence:
        # a candidate with no objective-fit data (no recorded gender/
        # age/location preference) but a complete, high-quality trait
        # match (both questionnaires filled in) previously fell
        # through to "low" confidence — even though real, complete
        # matching information existed and explanation.summary could
        # simultaneously say "پیشنهاد بسیار قوی". Trait data alone is
        # complete information and should count exactly like objective
        # data alone does, not be treated as if no information existed
        # at all.

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