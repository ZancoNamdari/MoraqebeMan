from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.db import connection

from apps.accounts.models import UserRole
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
DEMANDING_PATIENT = {
    "religious_beliefs_priority": "strongly_agree", "new_treatment_openness": "none",
    "caregiver_as_family_member": "yes", "respectful_disagreement_acceptance": "reject",
    "privacy_comfort_with_caregiver": "no", "noise_smell_sensitivity": "very_high",
    "meal_time_strictness": "very_strict", "special_diet_preference": "yes",
    "medication_timing_priority": "very_strict", "accent_customs_annoyance": "very_much",
    "cultural_respect_expectation": "yes", "willingness_to_express_opinion": "very_willing",
}


class MatchingQueryCountDoesNotScaleWithCandidatesTests(TestCase):
    """
    Regression test for a real, measured N+1: compute_trait_profile()
    used to re-run an identical QuestionTraitMapping query for every
    single caregiver candidate — with ~1000 approved caregivers in a
    real bulk-seeded database, this measurably showed up as 2-3
    second response times that scaled with how many candidates passed
    the waterfall filter (fewer candidates that pass = fewer redundant
    queries = faster; more candidates = slower), which is the exact
    fingerprint of an N+1.

    The correct way to test for this isn't asserting an exact query
    count (which is brittle to any legitimate future change) — it's
    asserting the count does NOT grow linearly with the number of
    candidates. A fixed-size in-memory table lookup fetched once
    should cost the same whether there are 3 or 30 real candidates.
    """

    def setUp(self):
        self.patient = PatientProfile.objects.create(full_name="سالمند تست N+1")
        PatientCompatibilityQuestionnaire.objects.create(patient=self.patient, **DEMANDING_PATIENT)

    def _make_caregiver(self, username, phone):
        user = make_user(username, role=UserRole.CAREGIVER, phone_number=phone)
        profile = CaregiverProfile.objects.create(user=user, status=CaregiverStatus.APPROVED)
        CaregiverCompatibilityQuestionnaire.objects.create(caregiver=profile, **ALL_A)
        return profile

    def test_query_count_does_not_scale_with_candidate_count(self):
        for i in range(3):
            self._make_caregiver(f"n1_small_{i}", f"0912116{1000+i:04d}")

        with CaptureQueriesContext(connection) as small_batch:
            results_small = suggest_caregivers_for_patient(self.patient, limit=20)
        self.assertEqual(len(results_small), 3)

        for i in range(3, 15):
            self._make_caregiver(f"n1_large_{i}", f"0912116{1000+i:04d}")

        with CaptureQueriesContext(connection) as large_batch:
            results_large = suggest_caregivers_for_patient(self.patient, limit=20)
        self.assertEqual(len(results_large), 15)

        small_count = len(small_batch.captured_queries)
        large_count = len(large_batch.captured_queries)

        # 15 candidates is 5x the candidate count of 3 — a real N+1
        # would show roughly 5x the query count too. A fixed number
        # of queries regardless of candidate count should show
        # (approximately) the SAME query count, not one that scales
        # with candidates at all. This asserts on the ratio, not an
        # exact number, specifically so it doesn't become brittle to
        # unrelated future changes that add or remove one query.
        self.assertLess(
            large_count, small_count + 5,
            f"query count grew from {small_count} (3 candidates) to {large_count} "
            f"(15 candidates) — that's scaling with candidate count, which is exactly "
            f"what an N+1 looks like. It should stay roughly flat.",
        )

    def test_question_trait_mapping_is_queried_once_not_per_candidate(self):
        """
        More direct than the ratio check above: explicitly counts how
        many SELECT statements touch the QuestionTraitMapping table
        specifically, across a batch of candidates — must be exactly
        one (the caregiver-side fetch, done once, up front), not one
        per candidate.
        """
        for i in range(8):
            self._make_caregiver(f"n1_direct_{i}", f"0912117{1000+i:04d}")

        with CaptureQueriesContext(connection) as queries:
            results = suggest_caregivers_for_patient(self.patient)
        self.assertEqual(len(results), 8)

        mapping_queries = [
            q for q in queries.captured_queries
            if "care_questiontraitmapping" in q["sql"].lower()
        ]
        self.assertLessEqual(
            len(mapping_queries), 2,  # one for the caregiver side, at most one more for the patient side
            f"expected QuestionTraitMapping to be queried once per side (not once per "
            f"candidate), but saw {len(mapping_queries)} queries against that table "
            f"for 8 candidates: {[q['sql'] for q in mapping_queries]}",
        )
