from django.test import SimpleTestCase

from apps.care.trait_matching import (
    adaptability_score,
    similarity_score,
)


class TraitMatchingTests(
    SimpleTestCase
):

    def test_identical_traits_have_full_similarity(self):

        self.assertEqual(
            similarity_score(
                80,
                80,
            ),
            100,
        )

    def test_similarity_decreases_with_distance(self):

        self.assertEqual(
            similarity_score(
                80,
                60,
            ),
            80,
        )

    def test_adaptability_exceeding_need_is_full_score(self):
        # Gap-based, not multiplicative (see adaptability_score's own
        # docstring + docs/MATCHING.md's "فرمول Adaptability" section
        # for why): a caregiver whose flexibility EXCEEDS what the
        # patient's sensitivity requires has left no need unmet, so
        # this scores 100 — not 80, which is what the old, deliberately
        # rejected sensitivity*flexibility/100 formula would give.
        self.assertEqual(
            adaptability_score(
                80,
                100,
            ),
            100,
        )

    def test_adaptability_shortfall_scores_the_gap(self):
        # flexibility (50) falls short of sensitivity (80) by 30 -> 70,
        # not 40 (which was the old multiplicative formula's answer).
        self.assertEqual(
            adaptability_score(
                80,
                50,
            ),
            70,
        )

    def test_adaptability_exact_match_is_full_score(self):
        self.assertEqual(
            adaptability_score(
                80,
                80,
            ),
            100,
        )
