from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.authentication.services import SimpleJWTTokenIssuer

VALID_IDENTITY = {
    "father_name": "رضا", "birth_certificate_number": "123", "birth_certificate_issue_place": "تهران",
    "birth_date": "1363-10-11", "gender": "female", "marital_status": "single", "children_count": "none",
    "has_chronic_disease": False, "takes_permanent_medication": False,
    "emergency_contact_phone": "09121110000", "emergency_contact_relation": "father",
    "postal_code": "1234567890", "full_address": "خیابان ولیعصر",
}

VALID_WORK_PREFS = {
    "collaboration_types": ["daily"], "work_status": "full_time", "family_presence_preference": "no_preference",
    "accepted_gender": "no_preference", "accepted_age_ranges": ["60_70"], "offered_services": ["companionship"],
    "accepted_physical_conditions": ["independent"], "lifting_capacity": "up_to_50kg",
    "service_locations": ["patient_home"], "available_days": ["saturday"], "available_shifts": ["morning"],
    "terms_accepted": True,
}


def _make_supervisor():
    user = User.objects.create(
        username="reviewer1", phone_number="09100009999", email="r@a.com",
        role=UserRole.SUPERUSER, first_name="ناظر", last_name="بازبین",
    )
    user.set_password("pass12345")
    user.save()
    return user


class SupervisorFullProfileReviewTests(TestCase):
    def setUp(self):
        self.supervisor = _make_supervisor()
        self.client = APIClient()
        token = SimpleJWTTokenIssuer().issue(self.supervisor)["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "علی", "last_name": "محمدی", "phone_number": "09121230099",
        }, format="json")
        self.cg_id = create.data["user_id"]

    def test_full_profile_shows_draft_status_before_anything_filled(self):
        response = self.client.get(f"/api/supervisor/caregivers/{self.cg_id}/full/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "draft")
        self.assertIsNone(response.data["identity"])
        self.assertFalse(response.data["is_approved"])

    def test_full_profile_reflects_saved_data(self):
        self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/identity/", VALID_IDENTITY, format="json")
        self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/work-preferences/", VALID_WORK_PREFS, format="json")

        response = self.client.get(f"/api/supervisor/caregivers/{self.cg_id}/full/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.data["identity"])
        self.assertEqual(response.data["identity"]["father_name"], "رضا")
        self.assertIsNotNone(response.data["work_preferences"])

    def test_approve_incomplete_profile_rejected_with_missing_list(self):
        response = self.client.post(f"/api/caregivers/{self.cg_id}/approve/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("missing", response.data)
        self.assertGreater(len(response.data["missing"]), 0)

    def test_approve_succeeds_with_zero_references(self):
        # References are explicitly not required, at any stage
        # including approval — the whole point of the earlier fix.
        # Caught and fixed a real inconsistency here: saving 0
        # references worked, but the separate approval-readiness check
        # still silently required at least 1 until this test's failure
        # surfaced it.
        self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/identity/", {}, format="json")
        self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/work-preferences/", {"terms_accepted": True}, format="json")
        self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/experience/", {}, format="json")
        self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/skills/", {}, format="json")
        self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/references/", {"references": []}, format="json")

        response = self.client.post(f"/api/caregivers/{self.cg_id}/approve/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "approved")

    def test_reject_with_reason_reflected_in_full_profile(self):
        response = self.client.post(f"/api/caregivers/{self.cg_id}/reject/", {"reason": "شماره تماس اضطراری نامعتبر است."}, format="json")
        self.assertEqual(response.status_code, 200)

        full = self.client.get(f"/api/supervisor/caregivers/{self.cg_id}/full/")
        self.assertEqual(full.data["status"], "rejected")
        self.assertEqual(full.data["rejection_reason"], "شماره تماس اضطراری نامعتبر است.")

    def test_full_profile_nonexistent_caregiver_404(self):
        response = self.client.get("/api/supervisor/caregivers/999999/full/")
        self.assertEqual(response.status_code, 404)
