from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.caregivers.models import CaregiverProfile, CaregiverStatus, CaregiverWorkPreferences
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class TermsAcceptanceCannotBeDelegatedTests(BaseAPITestCase):
    """
    Regression test for a confirmed decision: accepting the platform's
    terms-and-conditions is framed in the legal text itself as the
    caregiver's own personal electronic signature ("امضای الکترونیکی
    معتبر اینجانب") — a category of consent that isn't delegable the
    way a supervisor recording someone's ordinary profile data is,
    even though the same supervisor legitimately fills out every
    other field in this same form on the caregiver's behalf.
    """

    def setUp(self):
        self.supervisor = make_user("terms_supervisor", role=UserRole.ADMIN, phone_number="09100019001")
        self.supervisor_client = APIClient()
        self.supervisor_client.force_authenticate(self.supervisor)

        self.caregiver_user = make_user("terms_caregiver", role=UserRole.CAREGIVER, phone_number="09100019002")
        self.profile = CaregiverProfile.objects.create(user=self.caregiver_user)
        self.caregiver_client = APIClient()
        self.caregiver_client.force_authenticate(self.caregiver_user)

    def test_supervisor_cannot_set_terms_accepted(self):
        response = self.supervisor_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/work-preferences/",
            {"accepted_gender": "no_preference", "terms_accepted": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        prefs = CaregiverWorkPreferences.objects.get(profile=self.profile)
        self.assertFalse(prefs.terms_accepted)
        self.assertIsNone(prefs.terms_accepted_at)

    def test_supervisor_response_does_not_even_include_terms_fields(self):
        response = self.supervisor_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/work-preferences/",
            {"accepted_gender": "no_preference"},
            format="json",
        )
        self.assertNotIn("terms_accepted", response.data)
        self.assertNotIn("terms_accepted_at", response.data)

    def test_supervisor_can_still_save_every_other_field_normally(self):
        # The restriction is scoped to exactly one field — everything
        # else about this endpoint must keep working unchanged.
        response = self.supervisor_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/work-preferences/",
            {"accepted_gender": "female_only", "accepted_age_ranges": ["60_70", "70_80"]},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        prefs = CaregiverWorkPreferences.objects.get(profile=self.profile)
        self.assertEqual(prefs.accepted_gender, "female_only")

    def test_caregiver_can_set_terms_accepted_on_their_own_account(self):
        response = self.caregiver_client.put(
            "/api/caregivers/me/work-preferences/",
            {"accepted_gender": "no_preference", "terms_accepted": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        prefs = CaregiverWorkPreferences.objects.get(profile=self.profile)
        self.assertTrue(prefs.terms_accepted)
        self.assertIsNotNone(prefs.terms_accepted_at)

    def test_caregiver_cannot_save_without_accepting_terms(self):
        # Unchanged pre-existing behavior on the caregiver's own
        # endpoint — only the error message wording changed.
        response = self.caregiver_client.put(
            "/api/caregivers/me/work-preferences/",
            {"accepted_gender": "no_preference", "terms_accepted": False},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_approval_blocked_when_supervisor_entered_everything_except_terms(self):
        self.supervisor_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/work-preferences/",
            {"accepted_gender": "no_preference"}, format="json",
        )
        self.supervisor_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/identity/",
            {"gender": "male"}, format="json",
        )
        self.supervisor_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/experience/", {}, format="json",
        )
        self.supervisor_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/skills/", {}, format="json",
        )

        response = self.supervisor_client.post(f"/api/caregivers/{self.caregiver_user.id}/approve/")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(any("شرایط و تعهدات" in item for item in response.data["missing"]))

    def test_approval_succeeds_once_caregiver_personally_accepts_terms(self):
        self.supervisor_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/identity/", {"gender": "male"}, format="json",
        )
        self.supervisor_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/experience/", {}, format="json",
        )
        self.supervisor_client.put(
            f"/api/supervisor/caregivers/{self.caregiver_user.id}/skills/", {}, format="json",
        )
        # The one form the supervisor cannot complete — the caregiver
        # does it themselves, from their own account.
        self.caregiver_client.put(
            "/api/caregivers/me/work-preferences/",
            {"accepted_gender": "no_preference", "terms_accepted": True}, format="json",
        )

        response = self.supervisor_client.post(f"/api/caregivers/{self.caregiver_user.id}/approve/")
        self.assertEqual(response.status_code, 200)
