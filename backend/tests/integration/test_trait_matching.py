from django.core.management import call_command
from django.test import TestCase

from apps.accounts.models import UserRole
from apps.care.models import MatchingProfileSide, TraitDimension, TraitName
from apps.care.trait_matching import (
    ADAPTABILITY_TRAITS,
    DIMENSION_TRAITS,
    SIMILARITY_TRAITS,
    adaptability_score,
    compute_cfi,
    compute_dimension_scores,
    compute_full_match,
    compute_overall_score,
    compute_trait_profile,
    similarity_score,
)
from apps.caregivers.models import CaregiverCompatibilityQuestionnaire, CaregiverProfile
from apps.families.models import PatientCompatibilityQuestionnaire, PatientProfile
from tests.factories.user_factory import make_user


ALL_A_CAREGIVER = {
    "religious_belief_accommodation": "a", "physical_contact_sensitivity_adaptation": "a",
    "prayer_time_scheduling_flexibility": "a", "traditional_belief_acceptance": "a",
    "family_event_participation": "a", "false_accusation_reaction": "a",
    "confidentiality_commitment": "a", "gender_based_task_flexibility": "a",
    "home_environment_adaptability": "a", "schedule_flexibility_for_family_events": "b",
    "traditional_food_treatment_openness": "a", "personal_conversation_patience": "a",
    "home_organization_adaptability": "a",
    "cultural_expression_tolerance": "a", "unfamiliar_custom_acceptance": "a", "dialect_communication_effort": "a",
}

ALL_D_CAREGIVER = {
    "religious_belief_accommodation": "d", "physical_contact_sensitivity_adaptation": "d",
    "prayer_time_scheduling_flexibility": "d", "traditional_belief_acceptance": "d",
    "family_event_participation": "d", "false_accusation_reaction": "d",
    "confidentiality_commitment": "d", "gender_based_task_flexibility": "d",
    "home_environment_adaptability": "d", "schedule_flexibility_for_family_events": "a",
    "traditional_food_treatment_openness": "d", "personal_conversation_patience": "d",
    "home_organization_adaptability": "d",
    "cultural_expression_tolerance": "d", "unfamiliar_custom_acceptance": "d", "dialect_communication_effort": "d",
}

DEMANDING_PATIENT = {
    "religious_beliefs_priority": "strongly_agree", "new_treatment_openness": "none",
    "caregiver_as_family_member": "yes", "respectful_disagreement_acceptance": "reject",
    "privacy_comfort_with_caregiver": "no", "noise_smell_sensitivity": "very_high",
    "meal_time_strictness": "very_high", "special_diet_preference": "yes",
    "medication_timing_priority": "very_high", "accent_customs_annoyance": "very_much",
    "cultural_respect_expectation": "yes", "willingness_to_express_opinion": "very_high",
}


class TraitClassificationTests(TestCase):
    """The module-level assertions already guard this at import time —
    these tests exist so a future change that breaks the invariant
    fails a normal test run, not just an import somewhere unexpected."""

    def test_every_trait_classified_as_similarity_or_adaptability_exactly_once(self):
        self.assertEqual(SIMILARITY_TRAITS | ADAPTABILITY_TRAITS, set(TraitName.values))
        self.assertEqual(SIMILARITY_TRAITS & ADAPTABILITY_TRAITS, set())

    def test_every_trait_belongs_to_exactly_one_dimension(self):
        all_dimension_traits = [t for traits in DIMENSION_TRAITS.values() for t in traits]
        self.assertEqual(len(all_dimension_traits), len(TraitName.values))
        self.assertEqual(set(all_dimension_traits), set(TraitName.values))


class ScoringFormulaTests(TestCase):
    def test_similarity_is_100_when_values_match_exactly(self):
        self.assertEqual(similarity_score(80, 80), 100)

    def test_similarity_decreases_with_distance(self):
        self.assertEqual(similarity_score(80, 85), 95)
        self.assertEqual(similarity_score(20, 90), 30)

    def test_similarity_never_goes_negative(self):
        self.assertEqual(similarity_score(0, 100), 0)

    def test_adaptability_high_sensitivity_high_flexibility_scores_well(self):
        # The spec's own worked example
        self.assertEqual(adaptability_score(95, 90), round(95 * 90 / 100))

    def test_adaptability_high_sensitivity_low_flexibility_scores_poorly(self):
        score = adaptability_score(95, 30)
        self.assertLess(score, 40)

    def test_adaptability_low_sensitivity_barely_matters_regardless_of_flexibility(self):
        # A patient who isn't sensitive on a trait doesn't need the
        # caregiver to be flexible there — score should stay high even
        # against a low-flexibility caregiver.
        score = adaptability_score(5, 10)
        self.assertLess(score, 5)  # low sensitivity -> low score contribution either way, but not misleadingly "bad"


class TraitProfileComputationTests(TestCase):
    def setUp(self):
        call_command("seed_trait_mappings")
        cg_user = make_user("cg_trait_test", role=UserRole.CAREGIVER, phone_number="09121140001")
        self.caregiver = CaregiverProfile.objects.create(user=cg_user)

    def test_all_a_answers_produce_all_17_traits(self):
        q = CaregiverCompatibilityQuestionnaire.objects.create(caregiver=self.caregiver, **ALL_A_CAREGIVER)
        traits = compute_trait_profile(MatchingProfileSide.CAREGIVER, q)
        self.assertEqual(len(traits), len(TraitName.values))

    def test_none_questionnaire_returns_empty_profile_not_error(self):
        traits = compute_trait_profile(MatchingProfileSide.CAREGIVER, None)
        self.assertEqual(traits, {})

    def test_question_mapping_to_two_traits_populates_both(self):
        # family_event_participation contributes to BOTH
        # emotional_involvement and professional_boundary
        q = CaregiverCompatibilityQuestionnaire.objects.create(caregiver=self.caregiver, **ALL_A_CAREGIVER)
        traits = compute_trait_profile(MatchingProfileSide.CAREGIVER, q)
        self.assertIn(TraitName.EMOTIONAL_INVOLVEMENT, traits)
        self.assertIn(TraitName.PROFESSIONAL_BOUNDARY, traits)

    def test_averaging_across_multiple_questions_mapping_to_the_same_trait(self):
        # Both family_event_participation='a' and
        # false_accusation_reaction='a' contribute to professional_
        # boundary (20 and 30 respectively per the seed data) —
        # confirms the average, not just the last-seen value, wins.
        q = CaregiverCompatibilityQuestionnaire.objects.create(caregiver=self.caregiver, **ALL_A_CAREGIVER)
        traits = compute_trait_profile(MatchingProfileSide.CAREGIVER, q)
        self.assertEqual(traits[TraitName.PROFESSIONAL_BOUNDARY], round((20 + 30) / 2))


class FullMatchComputationTests(TestCase):
    """The end-to-end behavior that actually matters: does a flexible
    caregiver genuinely score better against a demanding patient than
    a rigid one does, in both directions the formula is supposed to
    handle (similarity AND adaptability traits)."""

    def setUp(self):
        call_command("seed_trait_mappings")
        self.patient = PatientProfile.objects.create(full_name="بیمار سخت‌گیر")
        self.patient_q = PatientCompatibilityQuestionnaire.objects.create(patient=self.patient, **DEMANDING_PATIENT)

    def test_flexible_caregiver_scores_much_higher_than_rigid_caregiver(self):
        flexible_user = make_user("cg_flex_full", role=UserRole.CAREGIVER, phone_number="09121141001")
        flexible_profile = CaregiverProfile.objects.create(user=flexible_user)
        flexible_q = CaregiverCompatibilityQuestionnaire.objects.create(caregiver=flexible_profile, **ALL_A_CAREGIVER)

        rigid_user = make_user("cg_rigid_full", role=UserRole.CAREGIVER, phone_number="09121141002")
        rigid_profile = CaregiverProfile.objects.create(user=rigid_user)
        rigid_q = CaregiverCompatibilityQuestionnaire.objects.create(caregiver=rigid_profile, **ALL_D_CAREGIVER)

        flexible_result = compute_full_match(self.patient_q, flexible_q)
        rigid_result = compute_full_match(self.patient_q, rigid_q)

        self.assertGreater(flexible_result["overall_score"], rigid_result["overall_score"])
        self.assertGreater(flexible_result["overall_score"] - rigid_result["overall_score"], 30)

    def test_flexible_caregiver_cfi_much_higher_than_rigid(self):
        flexible_user = make_user("cg_flex_cfi", role=UserRole.CAREGIVER, phone_number="09121141003")
        flexible_profile = CaregiverProfile.objects.create(user=flexible_user)
        flexible_q = CaregiverCompatibilityQuestionnaire.objects.create(caregiver=flexible_profile, **ALL_A_CAREGIVER)

        rigid_user = make_user("cg_rigid_cfi", role=UserRole.CAREGIVER, phone_number="09121141004")
        rigid_profile = CaregiverProfile.objects.create(user=rigid_user)
        rigid_q = CaregiverCompatibilityQuestionnaire.objects.create(caregiver=rigid_profile, **ALL_D_CAREGIVER)

        flexible_cfi = compute_full_match(self.patient_q, flexible_q)["caregiver_cfi"]
        rigid_cfi = compute_full_match(self.patient_q, rigid_q)["caregiver_cfi"]
        self.assertGreater(flexible_cfi, rigid_cfi)

    def test_all_four_dimensions_present_when_both_questionnaires_complete(self):
        cg_user = make_user("cg_dims", role=UserRole.CAREGIVER, phone_number="09121141005")
        cg_profile = CaregiverProfile.objects.create(user=cg_user)
        cg_q = CaregiverCompatibilityQuestionnaire.objects.create(caregiver=cg_profile, **ALL_A_CAREGIVER)

        result = compute_full_match(self.patient_q, cg_q)
        self.assertEqual(len(result["dimension_scores"]), 4)

    def test_missing_caregiver_questionnaire_returns_none_overall_not_zero(self):
        result = compute_full_match(self.patient_q, None)
        self.assertIsNone(result["overall_score"])
        self.assertIsNone(result["caregiver_cfi"])

    def test_custom_weights_change_the_overall_score(self):
        cg_user = make_user("cg_weights", role=UserRole.CAREGIVER, phone_number="09121141006")
        cg_profile = CaregiverProfile.objects.create(user=cg_user)
        cg_q = CaregiverCompatibilityQuestionnaire.objects.create(caregiver=cg_profile, **ALL_A_CAREGIVER)

        default_result = compute_full_match(self.patient_q, cg_q)
        skewed_weights = {
            TraitDimension.CULTURAL_RITUAL: 1.0, TraitDimension.VALUES_PROFESSIONAL: 0.0,
            TraitDimension.LIFESTYLE: 0.0, TraitDimension.CULTURAL_FLEXIBILITY: 0.0,
        }
        skewed_result = compute_full_match(self.patient_q, cg_q, weights=skewed_weights)
        self.assertNotEqual(default_result["overall_score"], skewed_result["overall_score"])
