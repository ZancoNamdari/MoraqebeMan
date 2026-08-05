from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.authentication.services import SimpleJWTTokenIssuer


def _make_supervisor_client():
    user = User.objects.create(
        username="sup_optional", phone_number="09100005555", email="s@a.com",
        role=UserRole.SUPERUSER, first_name="ن", last_name="ی",
    )
    user.set_password("x")
    user.save()
    token = SimpleJWTTokenIssuer().issue(user)["access"]
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


class OptionalFieldsTests(TestCase):
    """
    Most caregiver-form fields are now optional by design — a
    supervisor rushing through 40-50 entries shouldn't be blocked from
    saving partial data. A small, deliberate set stays required
    (references need at least a name + phone to mean anything at all).
    This is the actual point of that change, verified directly rather
    than assumed from the model diff.
    """
    def setUp(self):
        self.client = _make_supervisor_client()
        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "کم", "last_name": "اطلاعات", "phone_number": "09121230001",
        }, format="json")
        self.caregiver_id = create.data["user_id"]

    def test_empty_identity_form_is_accepted(self):
        response = self.client.put(f"/api/supervisor/caregivers/{self.caregiver_id}/identity/", {}, format="json")
        self.assertEqual(response.status_code, 201)

    def test_minimal_work_preferences_is_accepted(self):
        response = self.client.put(
            f"/api/supervisor/caregivers/{self.caregiver_id}/work-preferences/",
            {"terms_accepted": True}, format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_empty_experience_and_skills_accepted(self):
        r1 = self.client.put(f"/api/supervisor/caregivers/{self.caregiver_id}/experience/", {}, format="json")
        self.assertEqual(r1.status_code, 201)
        r2 = self.client.put(f"/api/supervisor/caregivers/{self.caregiver_id}/skills/", {}, format="json")
        self.assertEqual(r2.status_code, 201)

    def test_reference_without_name_or_phone_still_rejected(self):
        # These two fields are the deliberately-kept-required exception
        # — an empty reference record would be meaningless.
        response = self.client.put(
            f"/api/supervisor/caregivers/{self.caregiver_id}/references/",
            {"references": [{}, {}]}, format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("full_name", response.data["references"][0])
        self.assertIn("phone_number", response.data["references"][0])

    def test_reference_with_only_name_and_phone_is_accepted(self):
        response = self.client.put(
            f"/api/supervisor/caregivers/{self.caregiver_id}/references/",
            {"references": [
                {"full_name": "علی", "phone_number": "09120000001"},
                {"full_name": "زهرا", "phone_number": "09120000002"},
            ]}, format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_zero_references_now_accepted(self):
        # References are no longer required at all — a supervisor
        # rushing through data entry shouldn't be blocked on this.
        response = self.client.put(
            f"/api/supervisor/caregivers/{self.caregiver_id}/references/",
            {"references": []}, format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data, [])

    def test_one_reference_also_accepted(self):
        response = self.client.put(
            f"/api/supervisor/caregivers/{self.caregiver_id}/references/",
            {"references": [{"full_name": "علی", "phone_number": "09120000001"}]}, format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 1)
