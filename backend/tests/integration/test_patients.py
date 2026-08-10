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


class FamilyLinkTests(TestCase):
    """The actual missing piece: multiple family members (siblings)
    sharing access to the same patient, not just whoever originally
    registered them."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.sibling1, self.token1 = make_authenticated_user("sibling1", role=UserRole.FAMILY, phone_number="09121110001")
        self.sibling2, self.token2 = make_authenticated_user("sibling2", role=UserRole.FAMILY, phone_number="09121110002")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token1}")

        create = self.client.post("/api/patients/", VALID_PATIENT, format="json")
        self.patient_id = create.data["id"]

    def test_second_sibling_has_no_access_before_being_linked(self):
        client2 = APIClient()
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token2}")
        response = client2.get(f"/api/patients/{self.patient_id}/")
        self.assertEqual(response.status_code, 404)

    def test_linking_a_second_sibling_grants_full_access(self):
        response = self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "phone_number": "09121110002", "relation": "فرزند",
        }, format="json")
        self.assertEqual(response.status_code, 201)

        client2 = APIClient()
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token2}")
        detail = client2.get(f"/api/patients/{self.patient_id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["full_name"], VALID_PATIENT["full_name"])

        listing = client2.get("/api/patients/")
        self.assertEqual(len(listing.data), 1)

    def test_family_links_list_shows_everyone_with_access(self):
        self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "phone_number": "09121110002", "relation": "فرزند",
        }, format="json")
        response = self.client.get(f"/api/patients/{self.patient_id}/family-links/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_linking_nonexistent_phone_number_rejected(self):
        response = self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "phone_number": "09129999999", "relation": "فرزند",
        }, format="json")
        self.assertEqual(response.status_code, 404)

    def test_linking_same_family_twice_rejected(self):
        self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "phone_number": "09121110002", "relation": "فرزند",
        }, format="json")
        response = self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "phone_number": "09121110002", "relation": "فرزند",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_unlinked_family_cannot_add_others_to_a_patient_they_cant_see(self):
        client2 = APIClient()
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token2}")
        response = client2.post(f"/api/patients/{self.patient_id}/family-links/", {
            "phone_number": "09121110001", "relation": "فرزند",
        }, format="json")
        self.assertEqual(response.status_code, 404)

    def test_cannot_remove_the_last_remaining_link(self):
        links = self.client.get(f"/api/patients/{self.patient_id}/family-links/").data
        link_id = links[0]["id"]
        response = self.client.delete(f"/api/patients/{self.patient_id}/family-links/{link_id}/")
        self.assertEqual(response.status_code, 400)

    def test_can_remove_a_link_when_another_remains(self):
        self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "phone_number": "09121110002", "relation": "فرزند",
        }, format="json")
        links = self.client.get(f"/api/patients/{self.patient_id}/family-links/").data
        second_link = next(l for l in links if l["family_phone_number"] == "09121110002")

        response = self.client.delete(f"/api/patients/{self.patient_id}/family-links/{second_link['id']}/")
        self.assertEqual(response.status_code, 204)

        client2 = APIClient()
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token2}")
        confirm = client2.get(f"/api/patients/{self.patient_id}/")
        self.assertEqual(confirm.status_code, 404)
