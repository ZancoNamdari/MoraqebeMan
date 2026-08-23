from django.test import SimpleTestCase

from apps.care.matching.waterfall import (
    WaterfallResult,
)


class WaterfallResultTests(
    SimpleTestCase
):

    def test_eligible_result(self):

        result = WaterfallResult(
            eligible=True,
            reasons=[
                "approved",
            ],
            failed_rules=[],
        )

        self.assertTrue(
            result.eligible
        )

        self.assertEqual(
            result.failed_rules,
            [],
        )

    def test_rejected_result(self):

        result = WaterfallResult(
            eligible=False,
            reasons=[],
            failed_rules=[
                "not approved",
            ],
        )

        self.assertFalse(
            result.eligible
        )

        self.assertEqual(
            len(result.failed_rules),
            1,
        )