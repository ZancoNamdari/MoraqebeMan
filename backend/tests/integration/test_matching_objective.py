from django.test import SimpleTestCase

from apps.care.matching.objective import (
    age_bracket,
)


class ObjectiveTests(
    SimpleTestCase
):

    def test_age_brackets(self):

        self.assertEqual(
            age_bracket(60),
            "60_70",
        )

        self.assertEqual(
            age_bracket(70),
            "60_70",
        )

        self.assertEqual(
            age_bracket(71),
            "70_80",
        )

        self.assertEqual(
            age_bracket(80),
            "70_80",
        )

        self.assertEqual(
            age_bracket(81),
            "over_80",
        )

    def test_under_60_has_no_matching_bracket(self):

        self.assertIsNone(
            age_bracket(59)
        )