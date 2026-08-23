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

    def test_adaptability(self):

        self.assertEqual(
            adaptability_score(
                80,
                100,
            ),
            80,
        )

        self.assertEqual(
            adaptability_score(
                80,
                50,
            ),
            40,
        )