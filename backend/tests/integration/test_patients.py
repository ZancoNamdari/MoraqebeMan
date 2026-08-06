from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from tests.factories.auth_helpers import make_authenticated_user

VALID_PATIENT = {
    "full_name": "رضا احمدی",
    "father_name": "حسن",
    "birth_date": "1323-12-19",
    "national_id": "0012345678",
    "birth_certificate_number": "55",
    "birth_certificate_issue_place": "تهران",
    "full_address": "تهران، خیابان آزادی",
    "postal_code": "1234567890",
    "emergency_contact_phone": "09121110000",
    "guardianship_status": "none",
    "guardian_details": "",
    "language_dialect": "فارسی",
    "basic_medical_info": "فشار خون بالا",
    "relation": "فرزند",
}

VALID_QUESTIONNAIRE = {
    "religious_beliefs_priority": "strongly_agree",
    "new_treatment_openness": "moderate",
    "caregiver_as_family_member": "yes",
    "respectful_disagreement_acceptance": "mostly_accept",
    "privacy_comfort_with_caregiver": "partially",
    "noise_smell_sensitivity": "very_high",
    "meal_time_strictness": "moderate",
    "special_diet_preference": "yes",
    "medication_timing_priority": "very_high",
    "accent_customs_annoyance": "slightly",
    "cultural_respect_expectation": "yes",
    "willingness_to_express_opinion": "low",
}


class FamilyProfileTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user, self.token = make_authenticated_user("family_profile_user", role=UserRole.FAMILY)

    def _auth(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_requires_authentication(self):
        response = self.client.get("/api/families/me/")
        self.assertEqual(response.status_code, 401)

    def test_non_family_role_rejected(self):
        _, token = make_authenticated_user("caregiver_user", role=UserRole.CAREGIVER)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get("/api/families/me/")
        self.assertEqual(response.status_code, 403)

    def test_get_before_creation_returns_404(self):
        self._auth()
        response = self.client.get("/api/families/me/")
        self.assertEqual(response.status_code, 404)

    def test_create_and_retrieve_profile(self):
        self._auth()
        response = self.client.post("/api/families/me/", {"display_name": "خانواده احمدی"}, format="json")
        self.assertEqual(response.status_code, 201)

        response = self.client.get("/api/families/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["display_name"], "خانواده احمدی")

    def test_real_province_and_city_ids_accepted_with_name_display(self):
        from apps.locations.models import Province

        self._auth()
        tehran = Province.objects.get(name="تهران")
        tehran_city = tehran.cities.get(name="تهران")

        response = self.client.post("/api/families/me/", {
            "display_name": "خانواده رضایی", "province": tehran.id, "city": tehran_city.id,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["province_name"], "تهران")
        self.assertEqual(response.data["city_name"], "تهران")

    def test_string_city_value_rejected_like_caregivers(self):
        # Same class of error this exact endpoint's caregiver
        # counterpart hit in production — confirms this endpoint
        # genuinely enforces the FK type now, not just in theory.
        self._auth()
        response = self.client.post("/api/families/me/", {
            "display_name": "خانواده رضایی", "city": "تهران",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("city", response.data)


class PatientTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user, self.token = make_authenticated_user("patient_owner_family", role=UserRole.FAMILY)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_add_patient_success(self):
        response = self.client.post("/api/patients/", VALID_PATIENT, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["full_name"], "رضا احمدی")

    def test_add_patient_with_real_district_id(self):
        from apps.locations.models import Province

        tehran = Province.objects.get(name="تهران")
        tehran_city = tehran.cities.get(name="تهران")
        district = tehran_city.districts.first()

        payload = dict(VALID_PATIENT, province=tehran.id, city=tehran_city.id, district=district.id)
        response = self.client.post("/api/patients/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["district_name"], district.name)

    def test_guardianship_status_without_details_rejected(self):
        payload = dict(VALID_PATIENT, guardianship_status="legal_guardian", guardian_details="")
        response = self.client.post("/api/patients/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("guardian_details", response.data)

    def test_guardianship_status_with_details_accepted(self):
        payload = dict(VALID_PATIENT, guardianship_status="legal_guardian", guardian_details="آقای محمدی - 09120001111")
        response = self.client.post("/api/patients/", payload, format="json")
        self.assertEqual(response.status_code, 201)

    def test_family_can_have_multiple_patients(self):
        self.client.post("/api/patients/", VALID_PATIENT, format="json")
        second = dict(VALID_PATIENT, full_name="زهرا احمدی", relation="مادر")
        self.client.post("/api/patients/", second, format="json")

        response = self.client.get("/api/patients/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_different_family_cannot_see_this_patient(self):
        create = self.client.post("/api/patients/", VALID_PATIENT, format="json")
        patient_id = create.data["id"]

        _, other_token = make_authenticated_user("other_family_user", role=UserRole.FAMILY)
        other_client = APIClient()
        other_client.credentials(HTTP_AUTHORIZATION=f"Bearer {other_token}")

        response = other_client.get(f"/api/patients/{patient_id}/")
        self.assertEqual(response.status_code, 404)

    def test_update_patient(self):
        create = self.client.post("/api/patients/", VALID_PATIENT, format="json")
        patient_id = create.data["id"]

        updated = dict(VALID_PATIENT, full_name="رضا احمدی (به‌روزشده)")
        response = self.client.put(f"/api/patients/{patient_id}/", updated, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["full_name"], "رضا احمدی (به‌روزشده)")


class QuestionnaireTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        _, token = make_authenticated_user("questionnaire_family_user", role=UserRole.FAMILY)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        create = self.client.post("/api/patients/", VALID_PATIENT, format="json")
        self.patient_id = create.data["id"]

    def test_get_before_submission_returns_404(self):
        response = self.client.get(f"/api/patients/{self.patient_id}/questionnaire/")
        self.assertEqual(response.status_code, 404)

    def test_submit_and_retrieve_questionnaire(self):
        response = self.client.put(
            f"/api/patients/{self.patient_id}/questionnaire/", VALID_QUESTIONNAIRE, format="json"
        )
        self.assertEqual(response.status_code, 201)

        response = self.client.get(f"/api/patients/{self.patient_id}/questionnaire/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["religious_beliefs_priority"], "strongly_agree")

    def test_resubmitting_updates_instead_of_erroring(self):
        self.client.put(f"/api/patients/{self.patient_id}/questionnaire/", VALID_QUESTIONNAIRE, format="json")
        updated = dict(VALID_QUESTIONNAIRE, willingness_to_express_opinion="very_high")
        response = self.client.put(f"/api/patients/{self.patient_id}/questionnaire/", updated, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["willingness_to_express_opinion"], "very_high")

    def test_invalid_choice_value_rejected(self):
        bad = dict(VALID_QUESTIONNAIRE, religious_beliefs_priority="not_a_real_choice")
        response = self.client.put(f"/api/patients/{self.patient_id}/questionnaire/", bad, format="json")
        self.assertEqual(response.status_code, 400)

    def test_questionnaire_for_nonexistent_patient_returns_404(self):
        response = self.client.get("/api/patients/999999/questionnaire/")
        self.assertEqual(response.status_code, 404)
