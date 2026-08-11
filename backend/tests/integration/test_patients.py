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
    "relation": "child",
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
        second = dict(VALID_PATIENT, full_name="زهرا احمدی", relation="mother")
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
    """Multiple family members (siblings) sharing access to the same
    patient — via access codes, matching the platform's actual
    intended connection model (not phone-number lookup, which this
    replaced)."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.sibling1, self.token1 = make_authenticated_user("sibling1", role=UserRole.FAMILY, phone_number="09121110001")
        self.sibling2, self.token2 = make_authenticated_user("sibling2", role=UserRole.FAMILY, phone_number="09121110002")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token1}")

        create = self.client.post("/api/patients/", VALID_PATIENT, format="json")
        self.patient_id = create.data["id"]

        # sibling2's FamilyProfile (and its access_code) only exists
        # once they've done SOMETHING as a family account — same as
        # in the real app, hitting their own /families/me/ creates it.
        self.client2 = APIClient()
        self.client2.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token2}")
        self.client2.post("/api/families/me/", {"display_name": "خواهر"}, format="json")
        self.sibling2_code = self.client2.get("/api/families/me/").data["access_code"]

    def test_second_sibling_has_no_access_before_being_linked(self):
        response = self.client2.get(f"/api/patients/{self.patient_id}/")
        self.assertEqual(response.status_code, 404)

    def test_inviting_by_code_grants_immediate_full_access(self):
        response = self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "family_code": self.sibling2_code, "relation": "child",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "approved")

        detail = self.client2.get(f"/api/patients/{self.patient_id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["full_name"], VALID_PATIENT["full_name"])

        listing = self.client2.get("/api/patients/")
        self.assertEqual(len(listing.data), 1)

    def test_family_links_list_shows_everyone_with_access(self):
        self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "family_code": self.sibling2_code, "relation": "child",
        }, format="json")
        response = self.client.get(f"/api/patients/{self.patient_id}/family-links/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_inviting_nonexistent_code_rejected(self):
        response = self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "family_code": "FAM-ZZZZZZ", "relation": "child",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_inviting_same_family_twice_rejected(self):
        self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "family_code": self.sibling2_code, "relation": "child",
        }, format="json")
        response = self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "family_code": self.sibling2_code, "relation": "child",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_unlinked_family_cannot_add_others_to_a_patient_they_cant_see(self):
        response = self.client2.post(f"/api/patients/{self.patient_id}/family-links/", {
            "family_code": self.sibling2_code, "relation": "child",
        }, format="json")
        self.assertEqual(response.status_code, 404)

    def test_cannot_remove_the_last_remaining_link(self):
        links = self.client.get(f"/api/patients/{self.patient_id}/family-links/").data
        link_id = links[0]["id"]
        response = self.client.delete(f"/api/patients/{self.patient_id}/family-links/{link_id}/")
        self.assertEqual(response.status_code, 400)

    def test_can_remove_a_link_when_another_remains(self):
        self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "family_code": self.sibling2_code, "relation": "child",
        }, format="json")
        links = self.client.get(f"/api/patients/{self.patient_id}/family-links/").data
        second_link = next(l for l in links if l["family_display_name"] == "خواهر")

        response = self.client.delete(f"/api/patients/{self.patient_id}/family-links/{second_link['id']}/")
        self.assertEqual(response.status_code, 204)

        confirm = self.client2.get(f"/api/patients/{self.patient_id}/")
        self.assertEqual(confirm.status_code, 404)

    def test_patch_hands_off_primary_contact(self):
        add = self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "family_code": self.sibling2_code, "relation": "child",
        }, format="json")
        link2_id = add.data["id"]

        response = self.client.patch(f"/api/patients/{self.patient_id}/family-links/{link2_id}/", {
            "is_primary_contact": True,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_primary_contact"])

        links = self.client.get(f"/api/patients/{self.patient_id}/family-links/").data
        link1 = next(l for l in links if l["family_display_name"] != "خواهر")
        self.assertFalse(link1["is_primary_contact"])

    def test_patch_can_update_relation_and_access_level(self):
        links = self.client.get(f"/api/patients/{self.patient_id}/family-links/").data
        link_id = links[0]["id"]
        response = self.client.patch(f"/api/patients/{self.patient_id}/family-links/{link_id}/", {
            "relation": "spouse", "access_level": "view_only",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["relation"], "spouse")
        self.assertEqual(response.data["access_level"], "view_only")

    def test_any_linked_family_member_can_delete_the_patient(self):
        self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "family_code": self.sibling2_code, "relation": "child",
        }, format="json")
        response = self.client2.delete(f"/api/patients/{self.patient_id}/")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(len(self.client.get("/api/patients/").data), 0)
        self.assertEqual(len(self.client2.get("/api/patients/").data), 0)

    def test_deleting_patient_writes_audit_entry(self):
        from apps.audit.models import AuditEventType, AuditLog
        self.client.delete(f"/api/patients/{self.patient_id}/")
        entry = AuditLog.objects.filter(event_type=AuditEventType.PATIENT_DELETED, metadata__patient_id=self.patient_id).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.actor_user_id, self.sibling1.id)

    def test_creating_patient_writes_audit_entry(self):
        from apps.audit.models import AuditEventType, AuditLog
        entry = AuditLog.objects.filter(event_type=AuditEventType.PATIENT_CREATED, metadata__patient_id=self.patient_id).first()
        self.assertIsNotNone(entry)

    def test_adding_family_link_writes_audit_entry(self):
        from apps.audit.models import AuditEventType, AuditLog
        self.client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "family_code": self.sibling2_code, "relation": "child",
        }, format="json")
        entry = AuditLog.objects.filter(event_type=AuditEventType.FAMILY_LINK_ADDED, target_user_id=self.sibling2.id).first()
        self.assertIsNotNone(entry)


class ConnectionRequestTests(TestCase):
    """The other direction: a family member connecting to a patient
    using the PATIENT's own code. This used to create a PENDING link
    needing another family member's approval — changed to immediate
    VIEW_ONLY access, since requiring a sibling to actively approve
    every other sibling who already holds the same code created a
    real bottleneck (one sibling forgetting, refusing, or being
    unavailable locked everyone else out of even seeing status/
    timeline). Every family member holding the same patient code now
    gets equal, immediate access — this class tests exactly that."""

    def setUp(self):
        cache.clear()
        self.owner_client = APIClient()
        self.owner, self.owner_token = make_authenticated_user("owner", role=UserRole.FAMILY, phone_number="09121110010")
        self.owner_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_token}")
        create = self.owner_client.post("/api/patients/", VALID_PATIENT, format="json")
        self.patient_id = create.data["id"]
        self.patient_code = create.data["access_code"]

        self.requester_client = APIClient()
        self.requester, self.requester_token = make_authenticated_user("requester", role=UserRole.FAMILY, phone_number="09121110011")
        self.requester_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.requester_token}")

    def test_connecting_with_patient_code_grants_immediate_access(self):
        response = self.requester_client.post("/api/patients/connect/", {
            "patient_code": self.patient_code, "relation": "child",
        }, format="json")
        self.assertEqual(response.status_code, 201)

        # immediate access — no approval step, no waiting
        detail = self.requester_client.get(f"/api/patients/{self.patient_id}/")
        self.assertEqual(detail.status_code, 200)

    def test_access_granted_is_view_only_not_full(self):
        # Immediate is safe specifically because it's limited — full
        # editing/access-management rights still require a deliberate
        # invite, not just holding the code. Uses a relation distinct
        # from the owner's own ("child", from VALID_PATIENT's fixture
        # relation) so the filter below unambiguously picks the
        # requester's link, not the owner's.
        self.requester_client.post("/api/patients/connect/", {
            "patient_code": self.patient_code, "relation": "sibling",
        }, format="json")
        links = self.owner_client.get(f"/api/patients/{self.patient_id}/family-links/").data
        connected = next(l for l in links if l["relation"] == "sibling")
        self.assertEqual(connected["access_level"], "view_only")
        self.assertEqual(connected["status"], "approved")

    def test_a_third_sibling_can_also_connect_independently_no_one_elses_approval_needed(self):
        # The actual point: one sibling not adding another is no
        # longer a blocker, because there's no "adding" step at all —
        # anyone with the code connects on their own.
        third_client = APIClient()
        _, third_token = make_authenticated_user("third_sibling", role=UserRole.FAMILY, phone_number="09121110013")
        third_client.credentials(HTTP_AUTHORIZATION=f"Bearer {third_token}")

        self.requester_client.post("/api/patients/connect/", {"patient_code": self.patient_code, "relation": "child"}, format="json")
        response = third_client.post("/api/patients/connect/", {"patient_code": self.patient_code, "relation": "sibling"}, format="json")
        self.assertEqual(response.status_code, 201)

        detail = third_client.get(f"/api/patients/{self.patient_id}/")
        self.assertEqual(detail.status_code, 200)

        links = self.owner_client.get(f"/api/patients/{self.patient_id}/family-links/").data
        self.assertEqual(len(links), 3)  # owner + requester + third_sibling, all equal

    def test_requesting_with_invalid_code_rejected(self):
        response = self.requester_client.post("/api/patients/connect/", {
            "patient_code": "ELD-ZZZZZZ", "relation": "child",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_connecting_twice_rejected(self):
        self.requester_client.post("/api/patients/connect/", {
            "patient_code": self.patient_code, "relation": "child",
        }, format="json")
        response = self.requester_client.post("/api/patients/connect/", {
            "patient_code": self.patient_code, "relation": "child",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_approve_reject_endpoints_still_function_for_a_pending_link_however_it_may_arise(self):
        # Nothing currently creates a PENDING link (both connection
        # paths are immediate now) — but the approve/reject mechanism
        # itself stays in place as a real, working feature (e.g. for a
        # future moderated flow), not dead code masquerading as
        # working. Constructs a pending link directly to confirm the
        # endpoints still behave correctly if one ever exists.
        from apps.families.models import FamilyPatientLink, LinkStatus, FamilyProfile

        requester_family = FamilyProfile.objects.get(user_id=self.requester.id) if FamilyProfile.objects.filter(user_id=self.requester.id).exists() else FamilyProfile.objects.create(user_id=self.requester.id, display_name="درخواست‌دهنده")
        from apps.families.models import PatientProfile
        patient = PatientProfile.objects.get(id=self.patient_id)
        link = FamilyPatientLink.objects.create(family=requester_family, patient=patient, relation="child", status=LinkStatus.PENDING, is_primary_contact=False)

        pending = self.owner_client.get(f"/api/patients/{self.patient_id}/access-requests/")
        self.assertEqual(len(pending.data), 1)

        approve = self.owner_client.post(f"/api/patients/{self.patient_id}/access-requests/{link.id}/approve/")
        self.assertEqual(approve.status_code, 200)
        self.assertEqual(approve.data["status"], "approved")


class PatientOwnAccountTests(TestCase):
    """A PATIENT-role user with their own account, managing their own
    record directly — the actual point of "the elderly person has
    their own account/profile"."""

    def setUp(self):
        cache.clear()
        self.patient_user, self.patient_token = make_authenticated_user("patient1", role=UserRole.PATIENT, phone_number="09121110020")
        self.patient_client = APIClient()
        self.patient_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.patient_token}")

        # A patient's own profile still gets created the normal way
        # (someone fills in the identity form) — here, directly, since
        # this test is about the /me/ access layer, not the creation
        # flow itself.
        from apps.families.models import PatientProfile
        self.patient = PatientProfile.objects.create(user_id=self.patient_user.id, full_name="بیمار خودحساب")

    def test_get_my_own_profile(self):
        response = self.patient_client.get("/api/patients/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["full_name"], "بیمار خودحساب")
        self.assertTrue(response.data["access_code"].startswith("ELD-"))

    def test_family_user_cannot_use_patient_me_endpoint(self):
        _, family_token = make_authenticated_user("fam_x", role=UserRole.FAMILY, phone_number="09121110021")
        family_client = APIClient()
        family_client.credentials(HTTP_AUTHORIZATION=f"Bearer {family_token}")
        response = family_client.get("/api/patients/me/")
        self.assertEqual(response.status_code, 403)

    def test_patient_invites_a_family_member_by_code_with_immediate_access(self):
        family_client = APIClient()
        family_user, family_token = make_authenticated_user("fam_y", role=UserRole.FAMILY, phone_number="09121110022")
        family_client.credentials(HTTP_AUTHORIZATION=f"Bearer {family_token}")
        family_client.post("/api/families/me/", {"display_name": "دختر"}, format="json")
        family_code = family_client.get("/api/families/me/").data["access_code"]

        response = self.patient_client.post("/api/patients/me/invite-family/", {
            "family_code": family_code, "relation": "child",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "approved")

        # the invited family member now genuinely has access
        detail = family_client.get(f"/api/patients/{self.patient.id}/")
        self.assertEqual(detail.status_code, 200)

    def test_family_connecting_via_patient_code_gets_immediate_access_no_patient_approval_needed(self):
        requester_client = APIClient()
        _, requester_token = make_authenticated_user("req_z", role=UserRole.FAMILY, phone_number="09121110023")
        requester_client.credentials(HTTP_AUTHORIZATION=f"Bearer {requester_token}")
        connect = requester_client.post("/api/patients/connect/", {
            "patient_code": self.patient.access_code, "relation": "spouse",
        }, format="json")
        self.assertEqual(connect.status_code, 201)

        # no pending state, nothing for the patient to approve
        pending = self.patient_client.get("/api/patients/me/access-requests/")
        self.assertEqual(len(pending.data), 0)

        # yet the requester genuinely has access already
        my_patients = requester_client.get("/api/patients/")
        self.assertEqual(len(my_patients.data), 1)

    def test_patient_sees_who_has_access_to_them(self):
        family_client = APIClient()
        _, family_token = make_authenticated_user("fam_w", role=UserRole.FAMILY, phone_number="09121110024")
        family_client.credentials(HTTP_AUTHORIZATION=f"Bearer {family_token}")
        family_client.post("/api/families/me/", {"display_name": "پسر"}, format="json")
        family_code = family_client.get("/api/families/me/").data["access_code"]
        self.patient_client.post("/api/patients/me/invite-family/", {"family_code": family_code, "relation": "child"}, format="json")

        response = self.patient_client.get("/api/patients/me/family-links/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["family_display_name"], "پسر")

    def test_patient_can_fill_own_questionnaire(self):
        payload = {
            "religious_beliefs_priority": "strongly_agree", "new_treatment_openness": "moderate",
            "caregiver_as_family_member": "yes", "respectful_disagreement_acceptance": "fully_accept",
            "privacy_comfort_with_caregiver": "yes", "noise_smell_sensitivity": "low",
            "meal_time_strictness": "moderate", "special_diet_preference": "no",
            "medication_timing_priority": "very_high", "accent_customs_annoyance": "not_at_all",
            "cultural_respect_expectation": "yes", "willingness_to_express_opinion": "moderate",
        }
        response = self.patient_client.put("/api/patients/me/questionnaire/", payload, format="json")
        self.assertEqual(response.status_code, 201)

        confirm = self.patient_client.get("/api/patients/me/questionnaire/")
        self.assertEqual(confirm.status_code, 200)
        self.assertEqual(confirm.data["religious_beliefs_priority"], "strongly_agree")

    def test_family_sees_the_questionnaire_the_patient_filled_in_themselves(self):
        payload = {
            "religious_beliefs_priority": "strongly_agree", "new_treatment_openness": "moderate",
            "caregiver_as_family_member": "yes", "respectful_disagreement_acceptance": "fully_accept",
            "privacy_comfort_with_caregiver": "yes", "noise_smell_sensitivity": "low",
            "meal_time_strictness": "moderate", "special_diet_preference": "no",
            "medication_timing_priority": "very_high", "accent_customs_annoyance": "not_at_all",
            "cultural_respect_expectation": "yes", "willingness_to_express_opinion": "moderate",
        }
        self.patient_client.put("/api/patients/me/questionnaire/", payload, format="json")

        family_client = APIClient()
        _, family_token = make_authenticated_user("fam_q", role=UserRole.FAMILY, phone_number="09121110025")
        family_client.credentials(HTTP_AUTHORIZATION=f"Bearer {family_token}")
        family_client.post("/api/families/me/", {"display_name": "دختر"}, format="json")
        family_code = family_client.get("/api/families/me/").data["access_code"]
        self.patient_client.post("/api/patients/me/invite-family/", {"family_code": family_code, "relation": "child"}, format="json")

        response = family_client.get(f"/api/patients/{self.patient.id}/questionnaire/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["religious_beliefs_priority"], "strongly_agree")


class PatientSelfServiceCreationTests(TestCase):
    """A freshly self-registered patient account with NO PatientProfile
    yet — deliberately isolated from PatientOwnAccountTests, whose
    setUp() creates the profile directly via the ORM and so never
    actually exercises the create-on-first-save path. Caught live (not
    by an existing test) that PUT /api/patients/me/ 404'd for a new
    account with no way to ever create one — this class exists so that
    specific bug can't come back silently."""

    def setUp(self):
        cache.clear()
        self.patient_user, self.patient_token = make_authenticated_user("newpatient", role=UserRole.PATIENT, phone_number="09121110030")
        self.patient_client = APIClient()
        self.patient_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.patient_token}")

    def test_get_before_any_profile_exists_returns_404(self):
        response = self.patient_client.get("/api/patients/me/")
        self.assertEqual(response.status_code, 404)

    def test_put_creates_the_profile_on_first_save(self):
        response = self.patient_client.put("/api/patients/me/", {"full_name": "بیمار جدید"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["access_code"].startswith("ELD-"))

        confirm = self.patient_client.get("/api/patients/me/")
        self.assertEqual(confirm.status_code, 200)
        self.assertEqual(confirm.data["full_name"], "بیمار جدید")

    def test_second_put_updates_rather_than_creating_a_duplicate(self):
        from apps.families.models import PatientProfile

        self.patient_client.put("/api/patients/me/", {"full_name": "نسخه اول"}, format="json")
        response = self.patient_client.put("/api/patients/me/", {"full_name": "نسخه دوم"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PatientProfile.objects.filter(user_id=self.patient_user.id).count(), 1)


class AccessLevelEnforcementTests(TestCase):
    """access_level was being stored on every FamilyPatientLink but
    never actually checked before allowing writes — a VIEW_ONLY family
    member could edit the patient's profile and questionnaire exactly
    the same as a FULL_ACCESS one. Reported directly, reproduced live
    before writing these, confirmed fixed. Read access must remain
    open to both levels; only writes are gated."""

    def setUp(self):
        cache.clear()
        self.owner_client = APIClient()
        self.owner, self.owner_token = make_authenticated_user("full_owner", role=UserRole.FAMILY, phone_number="09121110910")
        self.owner_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.owner_token}")
        create = self.owner_client.post("/api/patients/", VALID_PATIENT, format="json")
        self.patient_id = create.data["id"]
        self.patient_code = create.data["access_code"]

        self.viewer_client = APIClient()
        self.viewer, self.viewer_token = make_authenticated_user("view_only_member", role=UserRole.FAMILY, phone_number="09121110911")
        self.viewer_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.viewer_token}")
        self.viewer_client.post("/api/patients/connect/", {"patient_code": self.patient_code, "relation": "sibling"}, format="json")

    def test_view_only_cannot_edit_patient_profile(self):
        response = self.viewer_client.put(f"/api/patients/{self.patient_id}/", {"full_name": "دستکاری‌شده"}, format="json")
        self.assertEqual(response.status_code, 403)

        confirm = self.owner_client.get(f"/api/patients/{self.patient_id}/")
        self.assertEqual(confirm.data["full_name"], VALID_PATIENT["full_name"])

    def test_view_only_cannot_edit_questionnaire(self):
        response = self.viewer_client.put(f"/api/patients/{self.patient_id}/questionnaire/", {
            "religious_beliefs_priority": "strongly_agree",
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_view_only_cannot_delete_patient(self):
        response = self.viewer_client.delete(f"/api/patients/{self.patient_id}/")
        self.assertEqual(response.status_code, 403)

    def test_view_only_cannot_invite_other_family_members(self):
        third_client = APIClient()
        _, third_token = make_authenticated_user("third", role=UserRole.FAMILY, phone_number="09121110912")
        third_client.credentials(HTTP_AUTHORIZATION=f"Bearer {third_token}")
        third_client.post("/api/families/me/", {"display_name": "سوم"}, format="json")
        third_code = third_client.get("/api/families/me/").data["access_code"]

        response = self.viewer_client.post(f"/api/patients/{self.patient_id}/family-links/", {
            "family_code": third_code, "relation": "sibling",
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_view_only_cannot_remove_others_access(self):
        links = self.owner_client.get(f"/api/patients/{self.patient_id}/family-links/").data
        response = self.viewer_client.delete(f"/api/patients/{self.patient_id}/family-links/{links[0]['id']}/")
        self.assertEqual(response.status_code, 403)

    def test_view_only_can_still_read_profile_and_questionnaire(self):
        self.assertEqual(self.viewer_client.get(f"/api/patients/{self.patient_id}/").status_code, 200)
        self.owner_client.put(f"/api/patients/{self.patient_id}/questionnaire/", {
            "religious_beliefs_priority": "strongly_agree", "new_treatment_openness": "moderate",
            "caregiver_as_family_member": "yes", "respectful_disagreement_acceptance": "fully_accept",
            "privacy_comfort_with_caregiver": "yes", "noise_smell_sensitivity": "low",
            "meal_time_strictness": "moderate", "special_diet_preference": "no",
            "medication_timing_priority": "very_high", "accent_customs_annoyance": "not_at_all",
            "cultural_respect_expectation": "yes", "willingness_to_express_opinion": "moderate",
        }, format="json")
        response = self.viewer_client.get(f"/api/patients/{self.patient_id}/questionnaire/")
        self.assertEqual(response.status_code, 200)

    def test_full_access_owner_can_still_do_everything(self):
        self.assertEqual(self.owner_client.put(f"/api/patients/{self.patient_id}/", {"full_name": "بروزشده"}, format="json").status_code, 200)

    def test_stranger_with_no_link_at_all_gets_404_not_403(self):
        # Distinguishing "you have no relationship to this patient at
        # all" (404 — don't even confirm it exists) from "you can see
        # this patient but can't edit them" (403) matters.
        stranger_client = APIClient()
        _, stranger_token = make_authenticated_user("stranger_access", role=UserRole.FAMILY, phone_number="09121110913")
        stranger_client.credentials(HTTP_AUTHORIZATION=f"Bearer {stranger_token}")
        response = stranger_client.put(f"/api/patients/{self.patient_id}/", {"full_name": "x"}, format="json")
        self.assertEqual(response.status_code, 404)
