"""
Tests for the QuestionTraitMapping foundation — the architectural
piece the new matching spec requires: an answer is never scored
directly, it's looked up in a configurable table to find which
trait(s) it represents. These tests verify the seeded data is
complete and structurally sound, not the (not-yet-built) scoring
logic that will consume it.
"""
from django.core.management import call_command
from django.test import TestCase

from apps.care.models import MatchingProfileSide, QuestionTraitMapping, TraitName


class TraitMappingSeedTests(TestCase):
    def setUp(self):
        call_command("seed_trait_mappings")

    def test_all_sixteen_caregiver_questions_covered(self):
        fields = set(QuestionTraitMapping.objects.filter(
            profile_type=MatchingProfileSide.CAREGIVER,
        ).values_list("question_field", flat=True))
        self.assertEqual(len(fields), 16)

    def test_all_twelve_patient_questions_covered(self):
        fields = set(QuestionTraitMapping.objects.filter(
            profile_type=MatchingProfileSide.PATIENT,
        ).values_list("question_field", flat=True))
        self.assertEqual(len(fields), 12)

    def test_every_defined_trait_is_used_at_least_once(self):
        used = set(QuestionTraitMapping.objects.values_list("trait", flat=True))
        self.assertEqual(used, set(TraitName.values))

    def test_caregiver_q5_matches_the_one_worked_example_from_the_spec(self):
        # The only example the source spec actually gave numeric
        # values for — verifying these landed exactly as specified,
        # not approximated.
        rows = {
            (r.answer_option, r.trait): r.value
            for r in QuestionTraitMapping.objects.filter(
                profile_type=MatchingProfileSide.CAREGIVER, question_field="family_event_participation",
            )
        }
        self.assertEqual(rows[("a", TraitName.EMOTIONAL_INVOLVEMENT)], 100)
        self.assertEqual(rows[("a", TraitName.PROFESSIONAL_BOUNDARY)], 20)
        self.assertEqual(rows[("b", TraitName.EMOTIONAL_INVOLVEMENT)], 75)
        self.assertEqual(rows[("b", TraitName.PROFESSIONAL_BOUNDARY)], 70)
        self.assertEqual(rows[("c", TraitName.EMOTIONAL_INVOLVEMENT)], 20)
        self.assertEqual(rows[("c", TraitName.PROFESSIONAL_BOUNDARY)], 100)
        self.assertEqual(rows[("d", TraitName.EMOTIONAL_INVOLVEMENT)], 50)
        self.assertEqual(rows[("d", TraitName.PROFESSIONAL_BOUNDARY)], 40)

    def test_seed_command_is_idempotent(self):
        before = QuestionTraitMapping.objects.count()
        call_command("seed_trait_mappings")
        after = QuestionTraitMapping.objects.count()
        self.assertEqual(before, after)

    def test_all_values_within_zero_to_hundred_range(self):
        for row in QuestionTraitMapping.objects.all():
            self.assertGreaterEqual(row.value, 0)
            self.assertLessEqual(row.value, 100)

    def test_caregiver_answer_options_are_the_four_letter_scale(self):
        options = set(QuestionTraitMapping.objects.filter(
            profile_type=MatchingProfileSide.CAREGIVER,
        ).values_list("answer_option", flat=True))
        self.assertEqual(options, {"a", "b", "c", "d"})

    def test_patient_answer_options_match_real_questionnaire_choice_keys(self):
        # Spot check a few fields against the actual scale choices
        # used on PatientCompatibilityQuestionnaire, to catch a typo'd
        # answer_option that would silently never match a real answer.
        religious = set(QuestionTraitMapping.objects.filter(
            profile_type=MatchingProfileSide.PATIENT, question_field="religious_beliefs_priority",
        ).values_list("answer_option", flat=True))
        self.assertEqual(religious, {"strongly_agree", "somewhat_agree", "somewhat_disagree", "strongly_disagree"})

        privacy = set(QuestionTraitMapping.objects.filter(
            profile_type=MatchingProfileSide.PATIENT, question_field="privacy_comfort_with_caregiver",
        ).values_list("answer_option", flat=True))
        self.assertEqual(privacy, {"yes", "no", "partially"})

    def test_resolved_placeholder_fields_match_the_confirmed_option_keys(self):
        # meal_time_strictness/medication_timing_priority/
        # willingness_to_express_opinion used to sit on the generic
        # IntensityScale placeholder (very_high/moderate/low/none).
        # Their real option sets (TimingStrictnessScale,
        # ExpressionWillingnessScale — see docs/MATCHING.md) were
        # confirmed and the seed data updated to match; this guards
        # against the mapping table silently drifting back out of
        # sync with the model's actual choices, which would make
        # every answer to these three questions score as "no mapping
        # found" without raising any error.
        timing_fields = ["meal_time_strictness", "medication_timing_priority"]
        for field in timing_fields:
            options = set(QuestionTraitMapping.objects.filter(
                profile_type=MatchingProfileSide.PATIENT, question_field=field,
            ).values_list("answer_option", flat=True))
            self.assertEqual(
                options, {"very_strict", "moderately_strict", "flexible", "not_important"},
            )

        willingness = set(QuestionTraitMapping.objects.filter(
            profile_type=MatchingProfileSide.PATIENT, question_field="willingness_to_express_opinion",
        ).values_list("answer_option", flat=True))
        self.assertEqual(
            willingness, {"very_willing", "somewhat_willing", "rarely_willing", "not_willing"},
        )
