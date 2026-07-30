from tests.base import BaseAPITestCase
from rest_framework.test import APIClient

from tests.factories.user_factory import make_user

VALID_PAYLOAD = {
    "father_name": "رضا",
    "birth_certificate_number": "12345",
    "birth_certificate_issue_place": "تهران",
    "birth_date": "1990-05-01",
    "gender": "male",
    "marital_status": "single",
    "children_count": "none",
    "military_status": "completed",
    "has_chronic_disease": False,
    "takes_permanent_medication": False,
    "emergency_contact_phone": "09121110000",
    "emergency_contact_relation": "father",
    "province": "تهران",
    "city": "تهران",
    "district": "ونک",
    "postal_code": "1234567890",
    "full_address": "خیابان ولیعصر",
}


class IdentityProfileTests(BaseAPITestCase):
    def setUp(self):
        self.client = APIClient()
        make_user(username="caregiver1", password="StrongPass123", role="caregiver")
        login = self.client.post("/api/auth/login/", {
            "username": "caregiver1", "password": "StrongPass123",
        }, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['tokens']['access']}")

    def test_get_before_creation_returns_404(self):
        response = self.client.get("/api/auth/me/identity-profile/")
        self.assertEqual(response.status_code, 404)

    def test_put_valid_data_creates_profile(self):
        response = self.client.put("/api/auth/me/identity-profile/", VALID_PAYLOAD, format="json")
        self.assertEqual(response.status_code, 201)

        response = self.client.get("/api/auth/me/identity-profile/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["father_name"], "رضا")

    def test_put_again_updates_instead_of_creating_duplicate(self):
        self.client.put("/api/auth/me/identity-profile/", VALID_PAYLOAD, format="json")
        updated = dict(VALID_PAYLOAD, father_name="محمد")
        response = self.client.put("/api/auth/me/identity-profile/", updated, format="json")
        self.assertEqual(response.status_code, 200)  # 200, not 201 — this was an update
        self.assertEqual(response.data["father_name"], "محمد")

    def test_military_status_rejected_for_female(self):
        payload = dict(VALID_PAYLOAD, gender="female", military_status="completed")
        response = self.client.put("/api/auth/me/identity-profile/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("military_status", response.data)

    def test_female_without_military_status_is_valid(self):
        payload = dict(VALID_PAYLOAD, gender="female", military_status=None)
        response = self.client.put("/api/auth/me/identity-profile/", payload, format="json")
        self.assertEqual(response.status_code, 201)

    def test_chronic_disease_true_requires_disease_types(self):
        payload = dict(VALID_PAYLOAD, has_chronic_disease=True, chronic_disease_types=[])
        response = self.client.put("/api/auth/me/identity-profile/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("chronic_disease_types", response.data)

    def test_chronic_disease_true_with_types_is_valid(self):
        payload = dict(VALID_PAYLOAD, has_chronic_disease=True, chronic_disease_types=["diabetes"])
        response = self.client.put("/api/auth/me/identity-profile/", payload, format="json")
        self.assertEqual(response.status_code, 201)

    def test_medication_true_requires_medication_types(self):
        payload = dict(VALID_PAYLOAD, takes_permanent_medication=True, medication_types=[])
        response = self.client.put("/api/auth/me/identity-profile/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("medication_types", response.data)

    def test_identity_profile_requires_authentication(self):
        client = APIClient()
        response = client.get("/api/auth/me/identity-profile/")
        self.assertEqual(response.status_code, 401)
