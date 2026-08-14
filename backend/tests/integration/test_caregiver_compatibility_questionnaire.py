from tests.base import BaseAPITestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.caregivers.models import CaregiverProfile
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


class CaregiverCompatibilityQuestionnaireTests(BaseAPITestCase):
    """The caregiver-side counterpart to families.
    PatientCompatibilityQuestionnaire — 16 questions across 4 sections,
    every question sharing the same a(most flexible)-to-d(least
    flexible) structure, scored into a 0-100 flexibility index."""

    def setUp(self):
        self.supervisor = make_user("sup_cq", role=UserRole.SUPERUSER, phone_number="09100000096")
        self.sup_client = APIClient()
        self.sup_client.force_authenticate(self.supervisor)

        self.caregiver_user = make_user("cg_cq", role=UserRole.CAREGIVER, phone_number="09121120001")
        self.caregiver_profile = CaregiverProfile.objects.create(user=self.caregiver_user)

    def test_supervisor_can_fill_in_questionnaire(self):
        response = self.sup_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/", ALL_A, format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["overall_flexibility_score"], 100)

    def test_all_d_answers_score_zero(self):
        all_d = {k: "d" for k in ALL_A}
        response = self.sup_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/", all_d, format="json",
        )
        self.assertEqual(response.data["overall_flexibility_score"], 0)

    def test_scores_correctly_after_a_real_db_round_trip(self):
        # The exact class of bug caught earlier this session with
        # birth_date (jdatetime.date vs datetime.date on refetch) —
        # verifying explicitly that a GET after the PUT, which forces
        # a real database round trip rather than reusing the in-memory
        # object from the create step, still computes correctly.
        self.sup_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/", ALL_A, format="json",
        )
        response = self.sup_client.get(f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["overall_flexibility_score"], 100)

    def test_second_put_updates_rather_than_duplicating(self):
        from apps.caregivers.models import CaregiverCompatibilityQuestionnaire

        self.sup_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/", ALL_A, format="json",
        )
        all_d = {k: "d" for k in ALL_A}
        response = self.sup_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/", all_d, format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(CaregiverCompatibilityQuestionnaire.objects.filter(caregiver=self.caregiver_profile).count(), 1)
        self.assertEqual(response.data["overall_flexibility_score"], 0)

    def test_missing_before_first_save_returns_404(self):
        response = self.sup_client.get(f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/")
        self.assertEqual(response.status_code, 404)

    def test_non_supervisor_cannot_access(self):
        family_client = APIClient()
        family_client.force_authenticate(make_user("fam_cq", role=UserRole.FAMILY, phone_number="09121120002"))
        response = family_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/", ALL_A, format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_section_scores_reflect_mixed_answers_correctly(self):
        mixed = dict(ALL_A)
        mixed["religious_belief_accommodation"] = "b"  # 3 points
        mixed["physical_contact_sensitivity_adaptation"] = "d"  # 1 point
        # section 1 = [b(3), d(1), a(4), a(4)] -> avg 3.0 -> (3-1)/3*100 = 67
        response = self.sup_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/", mixed, format="json",
        )
        self.assertEqual(response.data["section_scores"]["عقیدتی و مناسکی"], 67)

    def test_incomplete_questionnaire_missing_a_field_rejected(self):
        incomplete = dict(ALL_A)
        del incomplete["dialect_communication_effort"]
        response = self.sup_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/", incomplete, format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_answer_letter_rejected(self):
        invalid = dict(ALL_A)
        invalid["dialect_communication_effort"] = "z"
        response = self.sup_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/", invalid, format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_questionnaire_not_required_for_caregiver_creation(self):
        # Deliberately optional, same reasoning already applied to
        # references — improves matching quality, isn't a hard gate.
        # (Full approval has its own separate, pre-existing
        # requirements around identity/work-preferences completion,
        # unrelated to this questionnaire — not re-tested here.)
        create = self.sup_client.post("/api/supervisor/caregivers/", {
            "first_name": "بدون", "last_name": "پرسشنامه", "phone_number": "09121120003",
        }, format="json")
        self.assertEqual(create.status_code, 201)
        new_user_id = create.data["user_id"]
        questionnaire_check = self.sup_client.get(f"/api/supervisor/caregivers/{new_user_id}/compatibility-questionnaire/")
        self.assertEqual(questionnaire_check.status_code, 404)  # simply "not filled in yet", not an error state


class MatchingIncludesFlexibilityScoreTests(BaseAPITestCase):
    """The matching module (built earlier this session) surfaces this
    questionnaire's score as informational data alongside its existing
    fit score and rating data — not fused into the numeric score."""

    def setUp(self):
        from apps.caregivers.models import CaregiverStatus
        from apps.families.models import PatientProfile

        self.supervisor = make_user("sup_match_flex", role=UserRole.SUPERUSER, phone_number="09100000097")
        self.sup_client = APIClient()
        self.sup_client.force_authenticate(self.supervisor)

        self.caregiver_user = make_user("cg_match_flex", role=UserRole.CAREGIVER, phone_number="09121120010")
        self.caregiver_profile = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.APPROVED)
        self.patient = PatientProfile.objects.create(full_name="بیمار تطابق")

    def test_suggestion_includes_flexibility_score_when_completed(self):
        self.sup_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/compatibility-questionnaire/", ALL_A, format="json",
        )
        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={self.patient.access_code}")
        match = next(s for s in response.data["suggestions"] if s["caregiver_user_id"] == self.caregiver_user.id)
        self.assertEqual(match["flexibility_score"], 100)

    def test_suggestion_shows_none_when_questionnaire_not_completed(self):
        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={self.patient.access_code}")
        match = next(s for s in response.data["suggestions"] if s["caregiver_user_id"] == self.caregiver_user.id)
        self.assertIsNone(match["flexibility_score"])
