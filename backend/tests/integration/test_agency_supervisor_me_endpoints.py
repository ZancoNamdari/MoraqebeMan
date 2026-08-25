from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyFamilyLink, AgencyLinkStatus, AgencyProfile, AgencySupervisor
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class AgencySupervisorMeEndpointsTests(BaseAPITestCase):
    """
    Before this, /api/agencies/me/* (profile, dashboard, family/
    caregiver rosters and requests) was IsAgency-only — meaning an
    AGENCY_SUPERVISOR account (which the whole rest of this feature
    was built around) could not actually use agency-panel at all.
    This closes that gap.
    """

    def setUp(self):
        self.agency = AgencyProfile.objects.create(
            user=make_user("me_endpoints_owner", role=UserRole.AGENCY, phone_number="09100014001"),
            company_name="آژانس دسترسی من",
        )
        self.owner_client = APIClient()
        self.owner_client.force_authenticate(self.agency.user)

        self.supervisor_user = make_user("me_endpoints_supervisor", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100014002")
        AgencySupervisor.objects.create(user=self.supervisor_user, agency=self.agency, created_by=self.agency.user)
        self.supervisor_client = APIClient()
        self.supervisor_client.force_authenticate(self.supervisor_user)

        self.other_agency = AgencyProfile.objects.create(
            user=make_user("me_endpoints_owner2", role=UserRole.AGENCY, phone_number="09100014003"),
            company_name="آژانس دسترسی من دو",
        )
        self.other_supervisor_user = make_user("me_endpoints_supervisor2", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100014004")
        AgencySupervisor.objects.create(user=self.other_supervisor_user, agency=self.other_agency, created_by=self.other_agency.user)
        self.other_supervisor_client = APIClient()
        self.other_supervisor_client.force_authenticate(self.other_supervisor_user)

    # -----------------------------------------------------------
    # Profile
    # -----------------------------------------------------------

    def test_supervisor_can_get_own_agency_profile(self):
        response = self.supervisor_client.get("/api/agencies/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.agency.id)
        self.assertEqual(response.data["company_name"], "آژانس دسترسی من")

    def test_supervisor_gets_own_agency_not_a_new_one(self):
        # The real risk with a naive "resolve my agency" implementation
        # would be silently auto-creating a SECOND AgencyProfile for
        # the supervisor's own user_id, since _get_or_create_agency
        # keys off request.user.id — confirm that didn't happen.
        self.supervisor_client.get("/api/agencies/me/")
        self.assertEqual(AgencyProfile.objects.count(), 2)  # only the two created in setUp

    def test_supervisor_cannot_update_agency_profile(self):
        response = self.supervisor_client.put("/api/agencies/me/", {"company_name": "نام جدید"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.agency.refresh_from_db()
        self.assertEqual(self.agency.company_name, "آژانس دسترسی من")  # unchanged

    def test_owner_can_still_update_profile_unchanged(self):
        response = self.owner_client.put("/api/agencies/me/", {"company_name": "نام تازه"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.agency.refresh_from_db()
        self.assertEqual(self.agency.company_name, "نام تازه")

    # -----------------------------------------------------------
    # Dashboard
    # -----------------------------------------------------------

    def test_supervisor_can_view_dashboard(self):
        response = self.supervisor_client.get("/api/agencies/me/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["company_name"], "آژانس دسترسی من")

    def test_other_agencys_supervisor_sees_only_their_own_dashboard(self):
        response = self.other_supervisor_client.get("/api/agencies/me/dashboard/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["company_name"], "آژانس دسترسی من دو")

    # -----------------------------------------------------------
    # Family roster / requests / decisions
    # -----------------------------------------------------------

    def test_supervisor_can_view_family_roster_and_requests(self):
        roster_response = self.supervisor_client.get("/api/agencies/me/families/")
        requests_response = self.supervisor_client.get("/api/agencies/me/families/requests/")
        self.assertEqual(roster_response.status_code, 200)
        self.assertEqual(requests_response.status_code, 200)

    def test_supervisor_can_approve_a_family_join_request(self):
        family_user = make_user("me_endpoints_family", role=UserRole.FAMILY, phone_number="09121700001")
        family_client = APIClient()
        family_client.force_authenticate(family_user)
        family_client.post("/api/agencies/join/family/", {"agency_code": self.agency.access_code}, format="json")

        link_id = AgencyFamilyLink.objects.get(family__user=family_user).id
        response = self.supervisor_client.post(f"/api/agencies/me/families/requests/{link_id}/approve/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "approved")

    # -----------------------------------------------------------
    # Caregiver roster / requests / decisions
    # -----------------------------------------------------------

    def test_supervisor_can_view_caregiver_roster_and_requests(self):
        roster_response = self.supervisor_client.get("/api/agencies/me/caregivers/")
        requests_response = self.supervisor_client.get("/api/agencies/me/caregivers/requests/")
        self.assertEqual(roster_response.status_code, 200)
        self.assertEqual(requests_response.status_code, 200)

    def test_supervisor_can_approve_a_caregiver_join_request(self):
        from apps.caregivers.models import CaregiverProfile, CaregiverStatus
        caregiver_user = make_user("me_endpoints_caregiver", role=UserRole.CAREGIVER, phone_number="09121700002")
        CaregiverProfile.objects.create(user=caregiver_user, status=CaregiverStatus.APPROVED)
        caregiver_client = APIClient()
        caregiver_client.force_authenticate(caregiver_user)
        caregiver_client.post("/api/agencies/join/caregiver/", {"agency_code": self.agency.access_code}, format="json")

        link_id = AgencyCaregiverLink.objects.get(caregiver__user=caregiver_user).id
        response = self.supervisor_client.post(f"/api/agencies/me/caregivers/requests/{link_id}/approve/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "approved")

    # -----------------------------------------------------------
    # Role gate itself — plain roles still rejected everywhere
    # -----------------------------------------------------------

    def test_plain_caregiver_rejected_from_all_me_endpoints(self):
        caregiver = make_user("me_endpoints_plain_cg", role=UserRole.CAREGIVER, phone_number="09121700003")
        client = APIClient()
        client.force_authenticate(caregiver)
        for url in ("/api/agencies/me/", "/api/agencies/me/dashboard/", "/api/agencies/me/families/", "/api/agencies/me/caregivers/"):
            response = client.get(url)
            self.assertEqual(response.status_code, 403, f"{url} should reject a plain caregiver")
