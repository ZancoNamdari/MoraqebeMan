from django.core.management import call_command
from django.test import TestCase

from apps.accounts.models import UserRole
from apps.care.matching.ahp import ahp_consistency_ratio, calculate_ahp_weights
from apps.care.matching.mcdm import (
    AHP_CONSISTENCY_RATIO,
    AHP_WEIGHTS,
    CRITERIA,
    _ranking_sort_key,
    build_candidate_matrix,
    rank_candidates_with_topsis,
)
from apps.care.matching.topsis import calculate_topsis
from apps.care.matching import suggest_caregivers_for_patient
from apps.caregivers.models import CaregiverCompatibilityQuestionnaire, CaregiverProfile, CaregiverStatus, CaregiverWorkPreferences
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
    "meal_time_strictness": "very_strict", "special_diet_preference": "yes",
    "medication_timing_priority": "very_strict", "accent_customs_annoyance": "very_much",
    "cultural_respect_expectation": "yes", "willingness_to_express_opinion": "very_willing",
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


class RankingTieBreakTests(TestCase):
    """
    _ranking_sort_key — covers all 5 of this project's spec's 6
    stated tie-break criteria that map to an actual computed signal:
    specialization (physical_condition_match_score), working hours
    (shift_availability_score), location, cultural compatibility, and
    lifestyle compatibility. Language/dialect is intentionally not a
    separate key — see the function's own docstring for why.
    """

    def test_equal_mcdm_score_broken_by_specialization(self):
        weaker = {"mcdm_score": 80, "physical_condition_match_score": 0, "shift_availability_score": None, "objective_criterion_scores": {}, "trait_dimension_scores": {}}
        stronger = {"mcdm_score": 80, "physical_condition_match_score": 100, "shift_availability_score": None, "objective_criterion_scores": {}, "trait_dimension_scores": {}}
        self.assertGreater(_ranking_sort_key(stronger), _ranking_sort_key(weaker))

    def test_specialization_outranks_location(self):
        better_location_no_specialization = {
            "mcdm_score": 80, "physical_condition_match_score": 0, "shift_availability_score": None,
            "objective_criterion_scores": {"location": 100}, "trait_dimension_scores": {},
        }
        worse_location_with_specialization = {
            "mcdm_score": 80, "physical_condition_match_score": 100, "shift_availability_score": None,
            "objective_criterion_scores": {"location": 0}, "trait_dimension_scores": {},
        }
        self.assertGreater(
            _ranking_sort_key(worse_location_with_specialization),
            _ranking_sort_key(better_location_no_specialization),
        )

    def test_equal_through_specialization_broken_by_hours(self):
        weaker_hours = {"mcdm_score": 80, "physical_condition_match_score": 100, "shift_availability_score": 0, "objective_criterion_scores": {}, "trait_dimension_scores": {}}
        stronger_hours = {"mcdm_score": 80, "physical_condition_match_score": 100, "shift_availability_score": 100, "objective_criterion_scores": {}, "trait_dimension_scores": {}}
        self.assertGreater(_ranking_sort_key(stronger_hours), _ranking_sort_key(weaker_hours))

    def test_equal_mcdm_score_broken_by_location(self):
        weaker_location = {"mcdm_score": 80, "objective_criterion_scores": {"location": 60}, "trait_dimension_scores": {}}
        stronger_location = {"mcdm_score": 80, "objective_criterion_scores": {"location": 100}, "trait_dimension_scores": {}}
        self.assertGreater(_ranking_sort_key(stronger_location), _ranking_sort_key(weaker_location))

    def test_equal_score_and_location_broken_by_cultural_ritual(self):
        weaker_cultural = {"mcdm_score": 80, "objective_criterion_scores": {"location": 60}, "trait_dimension_scores": {"cultural_ritual": 50}}
        stronger_cultural = {"mcdm_score": 80, "objective_criterion_scores": {"location": 60}, "trait_dimension_scores": {"cultural_ritual": 90}}
        self.assertGreater(_ranking_sort_key(stronger_cultural), _ranking_sort_key(weaker_cultural))

    def test_equal_through_cultural_broken_by_lifestyle(self):
        weaker_lifestyle = {"mcdm_score": 80, "objective_criterion_scores": {"location": 60}, "trait_dimension_scores": {"cultural_ritual": 50, "lifestyle": 40}}
        stronger_lifestyle = {"mcdm_score": 80, "objective_criterion_scores": {"location": 60}, "trait_dimension_scores": {"cultural_ritual": 50, "lifestyle": 95}}
        self.assertGreater(_ranking_sort_key(stronger_lifestyle), _ranking_sort_key(weaker_lifestyle))

    def test_higher_mcdm_score_always_wins_regardless_of_tie_break_fields(self):
        # The tie-break fields only matter when mcdm_score is equal —
        # a real score difference must never be overridden by them.
        lower_score_better_everything_else = {
            "mcdm_score": 70,
            "physical_condition_match_score": 100, "shift_availability_score": 100,
            "objective_criterion_scores": {"location": 100},
            "trait_dimension_scores": {"cultural_ritual": 100, "lifestyle": 100},
        }
        higher_score_worse_everything_else = {
            "mcdm_score": 71,
            "physical_condition_match_score": 0, "shift_availability_score": 0,
            "objective_criterion_scores": {"location": 0},
            "trait_dimension_scores": {"cultural_ritual": 0, "lifestyle": 0},
        }
        self.assertGreater(
            _ranking_sort_key(higher_score_worse_everything_else),
            _ranking_sort_key(lower_score_better_everything_else),
        )

    def test_missing_tie_break_fields_do_not_crash(self):
        bare = {"mcdm_score": 80}
        self.assertEqual(_ranking_sort_key(bare), (80, -1, -1, -1, -1, -1))


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

    def test_specialization_and_hours_scores_flow_through_the_real_pipeline(self):
        # Not a unit test of the pure functions (see test_specialization.py)
        # — confirms suggest_caregivers_for_patient() actually attaches
        # physical_condition_match_score/shift_availability_score onto
        # real candidate dicts built from real DB objects, and that the
        # tie-breaker can read them straight off rank_candidates_with_topsis's
        # output without any extra wiring.
        self.patient.physical_condition = "alzheimers"
        self.patient.needed_shifts = ["night"]
        self.patient.save()

        matching_user = self._make_caregiver("cg_mcdm_match_spec", "09121151007", ALL_A)
        CaregiverWorkPreferences.objects.create(
            profile=CaregiverProfile.objects.get(user=matching_user),
            accepted_physical_conditions=["alzheimers"],
            available_shifts=["night"],
        )

        non_matching_user = self._make_caregiver("cg_mcdm_no_spec", "09121151008", ALL_A)
        CaregiverWorkPreferences.objects.create(
            profile=CaregiverProfile.objects.get(user=non_matching_user),
            accepted_physical_conditions=["low_mobility"],
            available_shifts=["morning"],
        )

        candidates = suggest_caregivers_for_patient(self.patient)
        ranked = rank_candidates_with_topsis(candidates)

        by_name = {r["caregiver_name"]: r for r in ranked}
        self.assertEqual(by_name["cg_mcdm_match_spec"]["physical_condition_match_score"], 100)
        self.assertEqual(by_name["cg_mcdm_match_spec"]["shift_availability_score"], 100)
        self.assertEqual(by_name["cg_mcdm_no_spec"]["physical_condition_match_score"], 0)
        self.assertEqual(by_name["cg_mcdm_no_spec"]["shift_availability_score"], 0)

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
        rows, usable_criteria, matrix = build_candidate_matrix(candidates)
        self.assertNotIn("objective_fit", usable_criteria)
        self.assertIn("cultural_ritual", usable_criteria)
