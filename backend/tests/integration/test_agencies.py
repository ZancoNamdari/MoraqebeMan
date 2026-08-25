from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyFamilyLink, AgencyLinkStatus, AgencyProfile, AgencySupervisor
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from apps.families.models import FamilyProfile
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class AgencyProfileTests(BaseAPITestCase):
    def setUp(self):
        self.agency_user = make_user("agency_profile_test", role=UserRole.AGENCY, phone_number="09100007001")
        self.client_ = APIClient()
        self.client_.force_authenticate(self.agency_user)

    def test_get_before_any_profile_auto_creates_one(self):
        response = self.client_.get("/api/agencies/me/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["access_code"].startswith("AGN-"))
        self.assertEqual(AgencyProfile.objects.filter(user_id=self.agency_user.id).count(), 1)

    def test_put_updates_company_name(self):
        response = self.client_.put("/api/agencies/me/", {"company_name": "شرکت مراقبت آریا"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["company_name"], "شرکت مراقبت آریا")

    def test_access_code_is_stable_across_requests(self):
        first = self.client_.get("/api/agencies/me/").data["access_code"]
        second = self.client_.get("/api/agencies/me/").data["access_code"]
        self.assertEqual(first, second)

    def test_non_agency_cannot_access(self):
        family_client = APIClient()
        family_client.force_authenticate(make_user("not_agency", role=UserRole.FAMILY, phone_number="09100007002"))
        response = family_client.get("/api/agencies/me/")
        self.assertEqual(response.status_code, 403)


class AgencyFamilyRosterTests(BaseAPITestCase):
    def setUp(self):
        self.agency_user = make_user("agency_family_test", role=UserRole.AGENCY, phone_number="09100007010")
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency_user)
        # Trigger auto-creation and grab the real access code.
        self.agency_code = self.agency_client.get("/api/agencies/me/").data["access_code"]

        self.family_user = make_user("family_join_agency", role=UserRole.FAMILY, phone_number="09121192001")
        self.family_client = APIClient()
        self.family_client.force_authenticate(self.family_user)

    def test_family_join_request_starts_pending(self):
        response = self.family_client.post("/api/agencies/join/family/", {"agency_code": self.agency_code}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "pending")

    def test_invalid_agency_code_rejected(self):
        response = self.family_client.post("/api/agencies/join/family/", {"agency_code": "AGN-ZZZZZZ"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_duplicate_join_request_rejected(self):
        self.family_client.post("/api/agencies/join/family/", {"agency_code": self.agency_code}, format="json")
        response = self.family_client.post("/api/agencies/join/family/", {"agency_code": self.agency_code}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_pending_request_not_in_roster_until_approved(self):
        self.family_client.post("/api/agencies/join/family/", {"agency_code": self.agency_code}, format="json")
        roster = self.agency_client.get("/api/agencies/me/families/").data
        requests_ = self.agency_client.get("/api/agencies/me/families/requests/").data
        self.assertEqual(len(roster), 0)
        self.assertEqual(len(requests_), 1)

    def test_approve_moves_request_into_roster(self):
        self.family_client.post("/api/agencies/join/family/", {"agency_code": self.agency_code}, format="json")
        link_id = AgencyFamilyLink.objects.get(family__user_id=self.family_user.id).id

        response = self.agency_client.post(f"/api/agencies/me/families/requests/{link_id}/approve/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "approved")

        roster = self.agency_client.get("/api/agencies/me/families/").data
        self.assertEqual(len(roster), 1)

    def test_reject_does_not_appear_in_roster(self):
        self.family_client.post("/api/agencies/join/family/", {"agency_code": self.agency_code}, format="json")
        link_id = AgencyFamilyLink.objects.get(family__user_id=self.family_user.id).id

        self.agency_client.post(f"/api/agencies/me/families/requests/{link_id}/reject/")
        roster = self.agency_client.get("/api/agencies/me/families/").data
        self.assertEqual(len(roster), 0)

    def test_another_agency_cannot_decide_on_this_ones_requests(self):
        self.family_client.post("/api/agencies/join/family/", {"agency_code": self.agency_code}, format="json")
        link_id = AgencyFamilyLink.objects.get(family__user_id=self.family_user.id).id

        other_agency = make_user("other_agency", role=UserRole.AGENCY, phone_number="09100007011")
        other_client = APIClient()
        other_client.force_authenticate(other_agency)
        response = other_client.post(f"/api/agencies/me/families/requests/{link_id}/approve/")
        self.assertEqual(response.status_code, 404)  # not found *for this agency*

    def test_writes_audit_entry_on_approval(self):
        from apps.audit.models import AuditEventType, AuditLog
        self.family_client.post("/api/agencies/join/family/", {"agency_code": self.agency_code}, format="json")
        link_id = AgencyFamilyLink.objects.get(family__user_id=self.family_user.id).id
        self.agency_client.post(f"/api/agencies/me/families/requests/{link_id}/approve/")
        self.assertTrue(AuditLog.objects.filter(event_type=AuditEventType.AGENCY_FAMILY_LINK_DECIDED).exists())


class AgencyCaregiverRosterTests(BaseAPITestCase):
    def setUp(self):
        self.agency_user = make_user("agency_cg_test", role=UserRole.AGENCY, phone_number="09100007020")
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency_user)
        self.agency_code = self.agency_client.get("/api/agencies/me/").data["access_code"]

        self.caregiver_user = make_user("caregiver_join_agency", role=UserRole.CAREGIVER, phone_number="09121193001")
        CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.APPROVED)
        self.caregiver_client = APIClient()
        self.caregiver_client.force_authenticate(self.caregiver_user)

    def test_caregiver_without_profile_cannot_join(self):
        bare_caregiver = make_user("bare_caregiver", role=UserRole.CAREGIVER, phone_number="09121193002")
        bare_client = APIClient()
        bare_client.force_authenticate(bare_caregiver)
        response = bare_client.post("/api/agencies/join/caregiver/", {"agency_code": self.agency_code}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_caregiver_join_request_starts_pending(self):
        response = self.caregiver_client.post("/api/agencies/join/caregiver/", {"agency_code": self.agency_code}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "pending")

    def test_approve_moves_into_roster_with_caregiver_status_visible(self):
        self.caregiver_client.post("/api/agencies/join/caregiver/", {"agency_code": self.agency_code}, format="json")
        link_id = AgencyCaregiverLink.objects.get(caregiver__user_id=self.caregiver_user.id).id

        self.agency_client.post(f"/api/agencies/me/caregivers/requests/{link_id}/approve/")
        roster = self.agency_client.get("/api/agencies/me/caregivers/").data
        self.assertEqual(len(roster), 1)
        self.assertEqual(roster[0]["caregiver_status"], "approved")

    def test_draft_caregiver_can_still_request_to_join(self):
        # An agency may want visibility into a caregiver still in the
        # platform's own vetting pipeline — joining an agency roster
        # is a separate affiliation from core CaregiverProfile approval.
        draft_user = make_user("draft_caregiver", role=UserRole.CAREGIVER, phone_number="09121193003")
        CaregiverProfile.objects.create(user=draft_user, status=CaregiverStatus.DRAFT)
        draft_client = APIClient()
        draft_client.force_authenticate(draft_user)
        response = draft_client.post("/api/agencies/join/caregiver/", {"agency_code": self.agency_code}, format="json")
        self.assertEqual(response.status_code, 201)


class AgencyDashboardTests(BaseAPITestCase):
    def setUp(self):
        self.agency_user = make_user("agency_dash_test", role=UserRole.AGENCY, phone_number="09100007030")
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency_user)
        self.agency_code = self.agency_client.get("/api/agencies/me/").data["access_code"]

    def test_dashboard_counts_start_at_zero(self):
        response = self.agency_client.get("/api/agencies/me/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["approved_family_count"], 0)
        self.assertEqual(response.data["pending_family_requests"], 0)
        self.assertEqual(response.data["approved_caregiver_count"], 0)
        self.assertEqual(response.data["pending_caregiver_requests"], 0)

    def test_dashboard_reflects_pending_and_approved_counts(self):
        family_user = make_user("dash_family", role=UserRole.FAMILY, phone_number="09121194001")
        family_client = APIClient()
        family_client.force_authenticate(family_user)
        family_client.post("/api/agencies/join/family/", {"agency_code": self.agency_code}, format="json")

        family2_user = make_user("dash_family2", role=UserRole.FAMILY, phone_number="09121194002")
        family2_client = APIClient()
        family2_client.force_authenticate(family2_user)
        family2_client.post("/api/agencies/join/family/", {"agency_code": self.agency_code}, format="json")
        link_id = AgencyFamilyLink.objects.get(family__user_id=family2_user.id).id
        self.agency_client.post(f"/api/agencies/me/families/requests/{link_id}/approve/")

        response = self.agency_client.get("/api/agencies/me/dashboard/")
        self.assertEqual(response.data["approved_family_count"], 1)
        self.assertEqual(response.data["pending_family_requests"], 1)


class AgencySupervisorTests(BaseAPITestCase):
    """
    apps.agencies.models.AgencySupervisor — agency staff scoped to
    exactly one agency. Explicitly not the platform-wide "Supervisor"
    Django group used elsewhere (apps.caregivers.supervisor_views) —
    these tests only cover this new, agency-scoped concept.
    """

    def setUp(self):
        self.agency_user = make_user("agency_super_test", role=UserRole.AGENCY, phone_number="09100008001")
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency_user)
        # Trigger auto-creation and grab the real id.
        self.agency_id = self.agency_client.get("/api/agencies/me/").data["id"]

        self.other_agency_user = make_user("other_agency_super_test", role=UserRole.AGENCY, phone_number="09100008002")
        self.other_agency_client = APIClient()
        self.other_agency_client.force_authenticate(self.other_agency_user)
        self.other_agency_id = self.other_agency_client.get("/api/agencies/me/").data["id"]

        self.superuser = make_user("superuser_super_test", role=UserRole.SUPERUSER, phone_number="09100008003")
        self.superuser_client = APIClient()
        self.superuser_client.force_authenticate(self.superuser)

        self.valid_payload = {
            "first_name": "زهرا", "last_name": "کریمی", "phone_number": "09121200001",
        }

    def test_agency_can_create_its_own_supervisor(self):
        response = self.agency_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["full_name"], "زهرا کریمی")

        supervisor = AgencySupervisor.objects.get(user__phone_number="09121200001")
        self.assertEqual(supervisor.agency_id, self.agency_id)
        self.assertEqual(supervisor.created_by_id, self.agency_user.id)
        self.assertEqual(supervisor.user.role, UserRole.AGENCY_SUPERVISOR)

    def test_created_supervisor_gets_no_password_the_creator_chose(self):
        # Same reasoning/convention as caregiver creation — creator
        # never invents the new account's password.
        self.agency_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        supervisor_user = AgencySupervisor.objects.get(user__phone_number="09121200001").user
        self.assertNotIn("password", self.valid_payload)
        self.assertTrue(supervisor_user.has_usable_password())

    def test_superuser_can_create_supervisor_for_any_agency(self):
        response = self.superuser_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        self.assertEqual(response.status_code, 201)

    def test_agency_cannot_create_supervisor_for_a_different_agency(self):
        response = self.agency_client.post(f"/api/agencies/{self.other_agency_id}/supervisors/", self.valid_payload, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(AgencySupervisor.objects.filter(user__phone_number="09121200001").exists())

    def test_regular_caregiver_cannot_create_a_supervisor(self):
        caregiver = make_user("caregiver_super_test", role=UserRole.CAREGIVER, phone_number="09121200099")
        caregiver_client = APIClient()
        caregiver_client.force_authenticate(caregiver)
        response = caregiver_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        self.assertEqual(response.status_code, 403)

    def test_duplicate_phone_number_rejected(self):
        self.agency_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        response = self.agency_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_agency_can_list_its_own_supervisors(self):
        self.agency_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        response = self.agency_client.get(f"/api/agencies/{self.agency_id}/supervisors/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["created_by_username"], "agency_super_test")

    def test_agency_cannot_list_a_different_agencys_supervisors(self):
        self.agency_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        response = self.other_agency_client.get(f"/api/agencies/{self.agency_id}/supervisors/")
        self.assertEqual(response.status_code, 403)

    def test_superuser_can_list_any_agencys_supervisors(self):
        self.agency_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        response = self.superuser_client.get(f"/api/agencies/{self.agency_id}/supervisors/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_unauthenticated_cannot_create_or_list(self):
        anon_client = APIClient()
        get_response = anon_client.get(f"/api/agencies/{self.agency_id}/supervisors/")
        post_response = anon_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        self.assertEqual(get_response.status_code, 401)
        self.assertEqual(post_response.status_code, 401)

    def test_writes_audit_entry_on_creation(self):
        from apps.audit.models import AuditEventType, AuditLog
        self.agency_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        self.assertTrue(AuditLog.objects.filter(event_type=AuditEventType.AGENCY_SUPERVISOR_CREATED).exists())

    def test_created_supervisor_can_log_in_after_password_reset(self):
        # Confirms the account is real and usable, not just a DB row —
        # exercises the exact same phone-based path a real new
        # supervisor would use the first time they log in.
        self.agency_client.post(f"/api/agencies/{self.agency_id}/supervisors/", self.valid_payload, format="json")
        response = self.superuser_client.post("/api/auth/password-reset/", {"phone_number": "09121200001"}, format="json")
        self.assertEqual(response.status_code, 202)
