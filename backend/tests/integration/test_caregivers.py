from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from tests.factories.auth_helpers import make_authenticated_user

VALID_WORK_PREFS = {
    "collaboration_types": ["daily", "night"],
    "work_status": "full_time",
    "family_presence_preference": "no_preference",
    "accepted_gender": "no_preference",
    "accepted_age_ranges": ["60_70", "over_80"],
    "offered_services": ["companionship", "walking"],
    "accepted_physical_conditions": ["independent"],
    "lifting_capacity": "up_to_50kg",
    "service_locations": ["patient_home"],
    "available_days": ["saturday", "all_days"],
    "available_shifts": ["morning", "afternoon"],
    "terms_accepted": True,
}

VALID_EXPERIENCE = {
    "elderly_care_experience": "1_to_5_years",
    "other_services_experience": "none",
    "previous_workplaces": ["patient_home"],
    "patients_cared_for_count": "2_to_5",
    "special_conditions_experience": ["alzheimers"],
    "live_in_experience": True,
    "couple_care_experience": False,
    "solo_elderly_care_experience": True,
    "driving_for_patient_experience": False,
}

VALID_SKILLS = {
    "education_level": "diploma",
    "training_courses": ["first_aid"],
    "communication_skills": ["patience"],
    "caregiving_skills": ["blood_pressure"],
    "physical_ability": "weak",
    "mobility_assistance_ability": ["wheelchair_assist"],
    "household_skills": ["iranian_cooking"],
    "foreign_languages": ["english"],
    "local_languages": ["azeri"],
    "has_driving_license": True,
    "can_use_smartphone": True,
}

VALID_IDENTITY = {
    "father_name": "رضا", "birth_certificate_number": "123", "birth_certificate_issue_place": "تهران",
    "birth_date": "1363-10-11", "gender": "female", "marital_status": "single", "children_count": "none",
    "has_chronic_disease": False, "takes_permanent_medication": False,
    "emergency_contact_phone": "09121110000", "emergency_contact_relation": "father",
    "postal_code": "1234567890",
    "full_address": "خیابان ولیعصر",
}

TWO_REFERENCES = {"references": [
    {"full_name": "علی محمدی", "occupation": "پزشک", "relation_type": "family",
     "acquaintance_duration": "over_5_years", "phone_number": "09120000001", "callable_for_inquiry": True},
    {"full_name": "زهرا احمدی", "occupation": "پرستار", "relation_type": "former_colleague",
     "acquaintance_duration": "1_to_5_years", "phone_number": "09120000002", "callable_for_inquiry": True},
]}


class WorkPreferencesTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        _, token = make_authenticated_user("cg_workprefs", role=UserRole.CAREGIVER)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_valid_submission(self):
        response = self.client.put("/api/caregivers/me/work-preferences/", VALID_WORK_PREFS, format="json")
        self.assertEqual(response.status_code, 201)

    def test_24h_shift_cannot_combine_with_specific_shifts(self):
        bad = dict(VALID_WORK_PREFS, available_shifts=["24h", "morning"])
        response = self.client.put("/api/caregivers/me/work-preferences/", bad, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("available_shifts", response.data)

    def test_24h_alone_is_valid(self):
        ok = dict(VALID_WORK_PREFS, available_shifts=["24h"])
        response = self.client.put("/api/caregivers/me/work-preferences/", ok, format="json")
        self.assertEqual(response.status_code, 201)

    def test_terms_not_accepted_rejected(self):
        bad = dict(VALID_WORK_PREFS, terms_accepted=False)
        response = self.client.put("/api/caregivers/me/work-preferences/", bad, format="json")
        self.assertEqual(response.status_code, 400)

    def test_invalid_choice_value_rejected(self):
        bad = dict(VALID_WORK_PREFS, work_status="not_a_real_status")
        response = self.client.put("/api/caregivers/me/work-preferences/", bad, format="json")
        self.assertEqual(response.status_code, 400)

    def test_resubmit_updates_not_duplicates(self):
        self.client.put("/api/caregivers/me/work-preferences/", VALID_WORK_PREFS, format="json")
        response = self.client.put("/api/caregivers/me/work-preferences/", VALID_WORK_PREFS, format="json")
        self.assertEqual(response.status_code, 200)  # 200 not 201 — update, not create

    def test_non_caregiver_rejected(self):
        _, token = make_authenticated_user("family_user_x", role=UserRole.FAMILY)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.put("/api/caregivers/me/work-preferences/", VALID_WORK_PREFS, format="json")
        self.assertEqual(response.status_code, 403)


class ServiceAreaTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        _, token = make_authenticated_user("cg_areas", role=UserRole.CAREGIVER)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # province/city/district are real FKs into apps.locations —
        # use the actual seeded data rather than guessing names, since
        # not every plausible-looking Persian district name is
        # actually in the seed data (Tehran has 128 real entries, but
        # "ونک" specifically isn't one of them).
        from apps.locations.models import District, Province
        tehran = Province.objects.get(name="تهران")
        self.tehran_city = tehran.cities.get(name="تهران")
        districts = list(District.objects.filter(city=self.tehran_city)[:2])
        self.district_a, self.district_b = districts[0], districts[1]

    def test_add_multiple_areas(self):
        self.client.post("/api/caregivers/me/service-areas/", {
            "province": self.tehran_city.province_id, "city": self.tehran_city.id, "district": self.district_a.id,
        }, format="json")
        self.client.post("/api/caregivers/me/service-areas/", {
            "province": self.tehran_city.province_id, "city": self.tehran_city.id, "district": self.district_b.id,
        }, format="json")
        response = self.client.get("/api/caregivers/me/service-areas/")
        self.assertEqual(len(response.data), 2)

    def test_delete_area(self):
        create = self.client.post("/api/caregivers/me/service-areas/", {
            "province": self.tehran_city.province_id, "city": self.tehran_city.id, "district": self.district_a.id,
        }, format="json")
        area_id = create.data["id"]
        response = self.client.delete(f"/api/caregivers/me/service-areas/{area_id}/")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(len(self.client.get("/api/caregivers/me/service-areas/").data), 0)


class ReferencesTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        _, token = make_authenticated_user("cg_refs", role=UserRole.CAREGIVER)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_single_reference_now_accepted(self):
        # References are no longer required to come in pairs — a
        # supervisor rushing through data entry shouldn't be blocked
        # on this. (Previously this asserted a single reference was
        # rejected; that rule was intentionally removed.)
        response = self.client.put(
            "/api/caregivers/me/references/",
            {"references": TWO_REFERENCES["references"][:1]},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 1)

    def test_zero_references_now_accepted(self):
        response = self.client.put(
            "/api/caregivers/me/references/",
            {"references": []},
            format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_two_references_accepted(self):
        response = self.client.put("/api/caregivers/me/references/", TWO_REFERENCES, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 2)

    def test_resubmit_replaces_entire_set(self):
        self.client.put("/api/caregivers/me/references/", TWO_REFERENCES, format="json")
        replacement = {"references": [
            dict(TWO_REFERENCES["references"][0], full_name="نام جدید"),
            TWO_REFERENCES["references"][1],
        ]}
        response = self.client.put("/api/caregivers/me/references/", replacement, format="json")
        names = [r["full_name"] for r in response.data]
        self.assertIn("نام جدید", names)
        self.assertEqual(len(names), 2)  # old set replaced, not appended to


class FullProfileAndApprovalTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.caregiver_user, token = make_authenticated_user("cg_full", role=UserRole.CAREGIVER)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _complete_all_forms_except_identity(self):
        self.client.put("/api/caregivers/me/work-preferences/", VALID_WORK_PREFS, format="json")
        self.client.post("/api/caregivers/me/service-areas/", {}, format="json")
        self.client.put("/api/caregivers/me/experience/", VALID_EXPERIENCE, format="json")
        self.client.put("/api/caregivers/me/skills/", VALID_SKILLS, format="json")
        self.client.put("/api/caregivers/me/references/", TWO_REFERENCES, format="json")

    def test_full_profile_nested_view_reflects_all_parts(self):
        self._complete_all_forms_except_identity()
        response = self.client.get("/api/caregivers/me/full/")
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertIsNone(data["identity"])
        self.assertIsNotNone(data["work_preferences"])
        self.assertEqual(len(data["service_areas"]), 1)
        self.assertIsNotNone(data["experience"])
        self.assertIsNotNone(data["skills"])
        self.assertEqual(len(data["references"]), 2)
        self.assertFalse(data["is_approved"])

    def test_status_and_reasons_are_actually_returned_not_silently_dropped(self):
        """
        Regression test for a real, previously-hidden bug: the view's
        own data dict always included "status", but
        CaregiverFullProfileSerializer never declared it as a field —
        DRF silently drops undeclared dict keys rather than erroring,
        so every caregiver checking their OWN profile got
        is_approved=false for pending, rejected, AND suspended alike,
        with no way to tell which, and no reason text ever exposed.
        """
        response = self.client.get("/api/caregivers/me/full/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("status", response.data)
        self.assertEqual(response.data["status"], "draft")
        self.assertIn("rejection_reason", response.data)
        self.assertIn("blacklist_reason", response.data)

    def test_rejected_caregiver_sees_their_own_rejection_reason(self):
        from apps.caregivers.models import CaregiverProfile
        # setUp only creates the User, not a CaregiverProfile — that
        # only gets auto-created as a side effect of hitting a real
        # caregiver endpoint (see _get_or_create_profile). A plain
        # .get() here was a real bug in this test itself: it assumed
        # a profile already existed with nothing in setUp actually
        # creating one.
        profile, _ = CaregiverProfile.objects.get_or_create(user=self.caregiver_user)
        profile.reject(self.caregiver_user, reason="مدارک هویتی ناقص بود.")

        response = self.client.get("/api/caregivers/me/full/")
        self.assertEqual(response.data["status"], "rejected")
        self.assertEqual(response.data["rejection_reason"], "مدارک هویتی ناقص بود.")

    def test_blacklisted_caregiver_sees_their_own_blacklist_reason(self):
        from apps.caregivers.models import CaregiverProfile
        profile, _ = CaregiverProfile.objects.get_or_create(user=self.caregiver_user)
        profile.blacklist(self.caregiver_user, reason="شکایات مکرر خانواده‌ها.")

        response = self.client.get("/api/caregivers/me/full/")
        self.assertEqual(response.data["status"], "suspended")
        self.assertEqual(response.data["blacklist_reason"], "شکایات مکرر خانواده‌ها.")

    def test_approval_returns_404_when_no_profile_exists_yet(self):
        # caregiver never submitted any form — no CaregiverProfile row exists
        _, su_token = make_authenticated_user("su_approve0", role=UserRole.SUPERUSER)
        approver = APIClient()
        approver.credentials(HTTP_AUTHORIZATION=f"Bearer {su_token}")

        response = approver.post(f"/api/caregivers/{self.caregiver_user.id}/approve/")
        self.assertEqual(response.status_code, 404)

    def test_approval_rejected_when_incomplete(self):
        # submit exactly one form — CaregiverProfile now exists, but is
        # deliberately left incomplete (missing experience/skills/
        # references/identity) to exercise the "found but incomplete"
        # path, distinct from the "no profile at all" 404 case above.
        self.client.put("/api/caregivers/me/work-preferences/", VALID_WORK_PREFS, format="json")

        _, su_token = make_authenticated_user("su_approve1", role=UserRole.SUPERUSER)
        approver = APIClient()
        approver.credentials(HTTP_AUTHORIZATION=f"Bearer {su_token}")

        response = approver.post(f"/api/caregivers/{self.caregiver_user.id}/approve/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("missing", response.data)

    def test_approval_succeeds_when_all_four_forms_complete(self):
        self._complete_all_forms_except_identity()
        self.client.put("/api/caregivers/me/identity/", VALID_IDENTITY, format="json")

        _, su_token = make_authenticated_user("su_approve2", role=UserRole.SUPERUSER)
        approver = APIClient()
        approver.credentials(HTTP_AUTHORIZATION=f"Bearer {su_token}")

        response = approver.post(f"/api/caregivers/{self.caregiver_user.id}/approve/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "approved")

    def test_non_admin_cannot_approve(self):
        self._complete_all_forms_except_identity()
        self.client.put("/api/caregivers/me/identity/", VALID_IDENTITY, format="json")
        # caregiver trying to approve themself
        response = self.client.post(f"/api/caregivers/{self.caregiver_user.id}/approve/")
        self.assertEqual(response.status_code, 403)
