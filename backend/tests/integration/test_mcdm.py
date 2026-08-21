from django.core.management import call_command
from django.test import TestCase

from apps.accounts.models import UserRole
from apps.care.mcdm.ahp import ahp_consistency_ratio, calculate_ahp_weights
from apps.care.mcdm.ranking import AHP_CONSISTENCY_RATIO, AHP_WEIGHTS, CRITERIA, build_candidate_matrix, rank_candidates_with_topsis
from apps.care.mcdm.topsis import calculate_topsis
from apps.care.matching import suggest_caregivers_for_patient
from apps.caregivers.models import CaregiverCompatibilityQuestionnaire, CaregiverProfile, CaregiverStatus
from apps.families.models import PatientCompatibilityQuestionnaire, PatientProfile
from tests.factories.user_factory import make_user


ALL_A = {
    "religious_belief_accommodation": "a", "physical_contact_sensitivity_adaptation": "a",
    "prayer_time_scheduling_flexibility": "a", "traditional_belief_acceptance": "a",
    "family_event_participation": "a", "false_accusation_reaction": "a",
    "confidentiality_commitment": "a", "gender_based_task_flexibility": "a",
    "home_environment_adaptability": "a", "schedule_flexibility_for_family_events": "a",
    "traditional_food_treatment_openness": "a", "personal_conversation_patience": "a",
    "home_organization_adaptability": "a",
    "cultural_expression_tolerance": "a", "unfamiliar_custom_acceptance": "a", "dialect_communication_effort": "a",
}
ALL_D = {k: "d" for k in ALL_A}

DEMANDING_PATIENT = {
    "religious_beliefs_priority": "strongly_agree", "new_treatment_openness": "none",
    "caregiver_as_family_member": "yes", "respectful_disagreement_acceptance": "reject",
    "privacy_comfort_with_caregiver": "no", "noise_smell_sensitivity": "very_high",
    "meal_time_strictness": "very_high", "special_diet_preference": "yes",
    "medication_timing_priority": "very_high", "accent_customs_annoyance": "very_much",
    "cultural_respect_expectation": "yes", "willingness_to_express_opinion": "very_high",
}


class AHPWeightCalculationTests(TestCase):
    """The generic AHP module — no Django/app dependencies, tested in
    isolation from the specific 7-criterion matrix this project uses."""

    def test_weights_sum_to_one(self):
        weights = calculate_ahp_weights(
            criteria=["a", "b", "c"],
            pairwise_matrix=[[1, 3, 2], [1/3, 1, 1/2], [1/2, 2, 1]],
        )
        self.assertAlmostEqual(sum(weights.values()), 1.0, places=6)

    def test_equal_importance_matrix_gives_equal_weights(self):
        weights = calculate_ahp_weights(
            criteria=["a", "b", "c"],
            pairwise_matrix=[[1, 1, 1], [1, 1, 1], [1, 1, 1]],
        )
        self.assertAlmostEqual(weights["a"], weights["b"], places=6)
        self.assertAlmostEqual(weights["b"], weights["c"], places=6)

    def test_consistency_ratio_zero_for_a_perfectly_consistent_matrix(self):
        # A>B>C by exactly consistent ratios
        cr = ahp_consistency_ratio([[1, 2, 4], [1/2, 1, 2], [1/4, 1/2, 1]])
        self.assertLess(cr, 0.01)

    def test_matrix_must_be_square(self):
        with self.assertRaises(ValueError):
            calculate_ahp_weights(criteria=["a", "b"], pairwise_matrix=[[1, 2, 3], [1, 1, 1]])


class TOPSISRankingTests(TestCase):
    """The generic TOPSIS module in isolation."""

    def test_higher_values_on_benefit_criteria_rank_first(self):
        scores = calculate_topsis(
            matrix=[[90, 90], [50, 50], [10, 10]],
            weights=[0.5, 0.5],
            benefit_criteria=[True, True],
        )
        self.assertGreater(scores[0], scores[1])
        self.assertGreater(scores[1], scores[2])

    def test_scores_are_bounded_zero_to_one(self):
        scores = calculate_topsis(
            matrix=[[90, 10], [10, 90], [50, 50]],
            weights=[0.5, 0.5],
            benefit_criteria=[True, True],
        )
        for score in scores:
            self.assertGreaterEqual(score, 0.0)
            self.assertLessEqual(score, 1.0)

    def test_weight_count_must_match_criteria_count(self):
        with self.assertRaises(ValueError):
            calculate_topsis(matrix=[[1, 2, 3]], weights=[0.5, 0.5], benefit_criteria=[True, True, True])


class ProjectAHPConfigurationTests(TestCase):
    """The specific 7-criterion AHP matrix this project actually
    uses — computed once at module import, not per-request."""

    def test_seven_criteria_weights_sum_to_one(self):
        self.assertEqual(len(AHP_WEIGHTS), len(CRITERIA))
        self.assertAlmostEqual(sum(AHP_WEIGHTS.values()), 1.0, places=6)

    def test_project_matrix_is_internally_consistent(self):
        # CR < 0.10 is the conventional AHP acceptability threshold —
        # confirms the pairwise judgments in ranking.py aren't
        # contradictory nonsense, a real property worth guarding with
        # a test given these values are hand-authored expert judgment.
        self.assertLess(AHP_CONSISTENCY_RATIO, 0.10)


class MCDMIntegrationTests(TestCase):
    """The full pipeline: real questionnaire data -> matching.py's
    suggestions -> mcdm.ranking's TOPSIS re-ranking. This is the exact
    scenario that crashed before a real fix: candidates with zero
    objective-fit data on any side (no gender/age/location preferences
    recorded anywhere) left None values in the decision matrix, which
    calculate_topsis's arithmetic can't handle. Caught by running the
    actual pipeline, not by reading the code."""

    def setUp(self):
        call_command("seed_trait_mappings")
        self.patient = PatientProfile.objects.create(full_name="بیمار MCDM تست")
        PatientCompatibilityQuestionnaire.objects.create(patient=self.patient, **DEMANDING_PATIENT)

    def _make_caregiver(self, username, phone, answers):
        user = make_user(username, role=UserRole.CAREGIVER, phone_number=phone)
        profile = CaregiverProfile.objects.create(user=user, status=CaregiverStatus.APPROVED)
        CaregiverCompatibilityQuestionnaire.objects.create(caregiver=profile, **answers)
        return user

    def test_ranking_with_zero_objective_fit_data_does_not_crash(self):
        # No CaregiverWorkPreferences created for either candidate —
        # objective_fit_score is None for both, on every candidate.
        self._make_caregiver("cg_mcdm_flex", "09121151001", ALL_A)
        self._make_caregiver("cg_mcdm_rigid", "09121151002", ALL_D)

        candidates = suggest_caregivers_for_patient(self.patient)
        ranked = rank_candidates_with_topsis(candidates)  # must not raise
        self.assertEqual(len(ranked), 2)
        for r in ranked:
            self.assertIsNotNone(r["mcdm_score"])

    def test_flexible_caregiver_ranks_above_rigid_one(self):
        self._make_caregiver("cg_mcdm_flex2", "09121151003", ALL_A)
        self._make_caregiver("cg_mcdm_rigid2", "09121151004", ALL_D)

        candidates = suggest_caregivers_for_patient(self.patient)
        ranked = rank_candidates_with_topsis(candidates)
        self.assertEqual(ranked[0]["caregiver_name"], "cg_mcdm_flex2")
        self.assertEqual(ranked[-1]["caregiver_name"], "cg_mcdm_rigid2")

    def test_every_ranked_result_includes_ahp_metadata(self):
        self._make_caregiver("cg_mcdm_meta", "09121151005", ALL_A)
        candidates = suggest_caregivers_for_patient(self.patient)
        ranked = rank_candidates_with_topsis(candidates)
        self.assertIn("ahp_weights", ranked[0])
        self.assertIn("ahp_consistency_ratio", ranked[0])

    def test_empty_candidate_list_returns_empty_not_error(self):
        self.assertEqual(rank_candidates_with_topsis([]), [])

    def test_build_candidate_matrix_excludes_criteria_missing_for_every_candidate(self):
        self._make_caregiver("cg_mcdm_matrix", "09121151006", ALL_A)
        candidates = suggest_caregivers_for_patient(self.patient)
        rows, usable_criteria = build_candidate_matrix(candidates)
        self.assertNotIn("objective_fit", usable_criteria)
        self.assertIn("cultural_ritual", usable_criteria)
