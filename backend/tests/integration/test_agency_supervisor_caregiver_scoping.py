from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus, AgencyProfile, AgencySupervisor
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class AgencySupervisorCaregiverScopingTests(BaseAPITestCase):
    """
    Scoping added to the existing /api/supervisor/caregivers/* wizard
    endpoints so an AGENCY_SUPERVISOR only ever sees/touches
    caregivers actually linked to their own agency — not a full
    retest of the wizard's own behavior (test_supervisor_api.py and
    test_supervisor_review.py already cover that in depth for
    ADMIN/SUPERUSER), just the new agency boundary.
    """

    def setUp(self):
        self.agency = AgencyProfile.objects.create(
            user=make_user("agency_scope_owner", role=UserRole.AGENCY, phone_number="09100009001"),
            company_name="آژانس یک",
        )
        self.supervisor_user = make_user("agency_super_scope", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100009002")
        AgencySupervisor.objects.create(user=self.supervisor_user, agency=self.agency, created_by=self.agency.user)
        self.supervisor_client = APIClient()
        self.supervisor_client.force_authenticate(self.supervisor_user)

        self.other_agency = AgencyProfile.objects.create(
            user=make_user("agency_scope_owner2", role=UserRole.AGENCY, phone_number="09100009003"),
            company_name="آژانس دو",
        )
        self.other_supervisor_user = make_user("agency_super_scope2", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100009004")
        AgencySupervisor.objects.create(user=self.other_supervisor_user, agency=self.other_agency, created_by=self.other_agency.user)
        self.other_supervisor_client = APIClient()
        self.other_supervisor_client.force_authenticate(self.other_supervisor_user)

        self.superuser = make_user("superuser_scope", role=UserRole.SUPERUSER, phone_number="09100009005")
        self.superuser_client = APIClient()
        self.superuser_client.force_authenticate(self.superuser)

        self.new_caregiver_payload = {
            "first_name": "مریم", "last_name": "رضایی", "phone_number": "09121300001",
        }

    # -----------------------------------------------------------
    # Creation + auto-linking
    # -----------------------------------------------------------

    def test_agency_supervisor_creates_caregiver_auto_linked_and_approved(self):
        response = self.supervisor_client.post("/api/supervisor/caregivers/", self.new_caregiver_payload, format="json")
        self.assertEqual(response.status_code, 201)

        user_id = response.data["user_id"]
        link = AgencyCaregiverLink.objects.get(caregiver__user_id=user_id)
        self.assertEqual(link.agency_id, self.agency.id)
        self.assertEqual(link.status, AgencyLinkStatus.APPROVED)
        self.assertEqual(link.decided_by_id, self.supervisor_user.id)

    def test_caregiver_created_by_supervisor_immediately_visible_to_same_supervisor(self):
        create_response = self.supervisor_client.post("/api/supervisor/caregivers/", self.new_caregiver_payload, format="json")
        user_id = create_response.data["user_id"]

        detail_response = self.supervisor_client.get(f"/api/supervisor/caregivers/{user_id}/")
        self.assertEqual(detail_response.status_code, 200)

    # -----------------------------------------------------------
    # List scoping
    # -----------------------------------------------------------

    def test_agency_supervisor_list_only_shows_own_agencys_caregivers(self):
        self.supervisor_client.post("/api/supervisor/caregivers/", self.new_caregiver_payload, format="json")
        self.other_supervisor_client.post(
            "/api/supervisor/caregivers/",
            {"first_name": "علی", "last_name": "احمدی", "phone_number": "09121300002"},
            format="json",
        )

        response = self.supervisor_client.get("/api/supervisor/caregivers/")
        self.assertEqual(response.status_code, 200)
        names = [row["full_name"] for row in response.data]
        self.assertIn("مریم رضایی", names)
        self.assertNotIn("علی احمدی", names)

    def test_superuser_list_still_sees_everyone_unchanged(self):
        self.supervisor_client.post("/api/supervisor/caregivers/", self.new_caregiver_payload, format="json")
        self.other_supervisor_client.post(
            "/api/supervisor/caregivers/",
            {"first_name": "علی", "last_name": "احمدی", "phone_number": "09121300002"},
            format="json",
        )

        response = self.superuser_client.get("/api/supervisor/caregivers/")
        names = [row["full_name"] for row in response.data]
        self.assertIn("مریم رضایی", names)
        self.assertIn("علی احمدی", names)

    # -----------------------------------------------------------
    # Cross-agency isolation on every sub-resource
    # -----------------------------------------------------------

    def test_other_agency_supervisor_gets_404_not_403_on_detail(self):
        # 404, not 403 — matches this platform's established
        # "don't confirm the record even exists" convention.
        create_response = self.supervisor_client.post("/api/supervisor/caregivers/", self.new_caregiver_payload, format="json")
        user_id = create_response.data["user_id"]

        response = self.other_supervisor_client.get(f"/api/supervisor/caregivers/{user_id}/")
        self.assertEqual(response.status_code, 404)

    def test_other_agency_supervisor_cannot_edit_identity(self):
        create_response = self.supervisor_client.post("/api/supervisor/caregivers/", self.new_caregiver_payload, format="json")
        user_id = create_response.data["user_id"]

        response = self.other_supervisor_client.put(
            f"/api/supervisor/caregivers/{user_id}/identity/", {}, format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_other_agency_supervisor_cannot_view_full_profile(self):
        create_response = self.supervisor_client.post("/api/supervisor/caregivers/", self.new_caregiver_payload, format="json")
        user_id = create_response.data["user_id"]

        response = self.other_supervisor_client.get(f"/api/supervisor/caregivers/{user_id}/full/")
        self.assertEqual(response.status_code, 404)

    def test_other_agency_supervisor_cannot_view_progress(self):
        create_response = self.supervisor_client.post("/api/supervisor/caregivers/", self.new_caregiver_payload, format="json")
        user_id = create_response.data["user_id"]

        response = self.other_supervisor_client.get(f"/api/supervisor/caregivers/{user_id}/progress/")
        self.assertEqual(response.status_code, 404)

    def test_other_agency_supervisor_cannot_delete(self):
        create_response = self.supervisor_client.post("/api/supervisor/caregivers/", self.new_caregiver_payload, format="json")
        user_id = create_response.data["user_id"]

        response = self.other_supervisor_client.delete(f"/api/supervisor/caregivers/{user_id}/")
        self.assertEqual(response.status_code, 404)
        # Confirm it really wasn't deleted, not just a mismatched status code.
        self.assertTrue(CaregiverProfile.objects.filter(user_id=user_id).exists())

    def test_pending_unapproved_link_is_not_yet_visible(self):
        # A caregiver who self-initiated a join request to this agency
        # (still PENDING, per apps.agencies's normal join flow) should
        # NOT be visible to the supervisor yet — only APPROVED links
        # grant visibility, matching the agency's own dashboard
        # behavior (roster vs. pending requests are separate lists).
        caregiver_user = make_user("pending_caregiver_scope", role=UserRole.CAREGIVER, phone_number="09121300099")
        profile = CaregiverProfile.objects.create(user=caregiver_user, status=CaregiverStatus.APPROVED)
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=profile, status=AgencyLinkStatus.PENDING)

        response = self.supervisor_client.get(f"/api/supervisor/caregivers/{caregiver_user.id}/")
        self.assertEqual(response.status_code, 404)

    # -----------------------------------------------------------
    # Role gate itself
    # -----------------------------------------------------------

    def test_plain_caregiver_still_rejected(self):
        caregiver = make_user("plain_caregiver_scope", role=UserRole.CAREGIVER, phone_number="09121300098")
        client = APIClient()
        client.force_authenticate(caregiver)
        response = client.get("/api/supervisor/caregivers/")
        self.assertEqual(response.status_code, 403)

    def test_plain_agency_account_not_a_supervisor_still_rejected(self):
        # The agency OWNER account (role=AGENCY) is a different role
        # than AGENCY_SUPERVISOR — this endpoint is supervisor-only,
        # the agency owner manages caregivers through /api/agencies/*
        # instead (its own roster endpoints), not this wizard.
        client = APIClient()
        client.force_authenticate(self.agency.user)
        response = client.get("/api/supervisor/caregivers/")
        self.assertEqual(response.status_code, 403)
