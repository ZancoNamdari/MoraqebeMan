from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus, AgencyProfile, AgencySupervisor
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from apps.families.models import PatientProfile
from apps.reviews.models import Complaint, ComplaintCategory
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class AgencyComplaintsAboutOwnRosterViewTests(BaseAPITestCase):
    """GET /api/agencies/<agency_id>/complaints/ — read-only, own roster only."""

    def setUp(self):
        self.agency = AgencyProfile.objects.create(
            user=make_user("agency_complaints_owner", role=UserRole.AGENCY, phone_number="09100022001"),
            company_name="آژانس تست شکایات",
        )
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency.user)

        self.supervisor_user = make_user("agency_complaints_super", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100022002")
        AgencySupervisor.objects.create(user=self.supervisor_user, agency=self.agency, created_by=self.agency.user)
        self.supervisor_client = APIClient()
        self.supervisor_client.force_authenticate(self.supervisor_user)

        self.other_agency = AgencyProfile.objects.create(
            user=make_user("agency_complaints_other", role=UserRole.AGENCY, phone_number="09100022003"),
            company_name="آژانس دیگر",
        )
        self.other_agency_client = APIClient()
        self.other_agency_client.force_authenticate(self.other_agency.user)

        # A caregiver on THIS agency's roster, with a complaint
        self.own_caregiver_user = make_user("agency_complaints_own_cg", role=UserRole.CAREGIVER, phone_number="09100022004")
        self.own_caregiver_profile = CaregiverProfile.objects.create(user=self.own_caregiver_user, status=CaregiverStatus.APPROVED)
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.own_caregiver_profile, status=AgencyLinkStatus.APPROVED)

        # A caregiver on a DIFFERENT agency's roster, also with a complaint
        other_caregiver_user = make_user("agency_complaints_other_cg", role=UserRole.CAREGIVER, phone_number="09100022005")
        other_caregiver_profile = CaregiverProfile.objects.create(user=other_caregiver_user, status=CaregiverStatus.APPROVED)
        AgencyCaregiverLink.objects.create(agency=self.other_agency, caregiver=other_caregiver_profile, status=AgencyLinkStatus.APPROVED)

        family_user = make_user("agency_complaints_family", role=UserRole.FAMILY, phone_number="09100022006")
        self.patient = PatientProfile.objects.create(full_name="سالمند تست")

        self.own_complaint = Complaint.objects.create(
            filed_by=family_user, patient=self.patient, about_caregiver=self.own_caregiver_profile,
            category=ComplaintCategory.BEHAVIOR, description="شکایت درباره مراقب همین آژانس",
        )
        Complaint.objects.create(
            filed_by=family_user, patient=self.patient, about_caregiver=other_caregiver_profile,
            category=ComplaintCategory.OTHER, description="شکایت درباره مراقب آژانس دیگر",
        )

    def test_agency_sees_only_complaints_about_its_own_roster(self):
        response = self.agency_client.get(f"/api/agencies/{self.agency.id}/complaints/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.own_complaint.id)

    def test_supervisor_can_also_view(self):
        response = self.supervisor_client.get(f"/api/agencies/{self.agency.id}/complaints/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_different_agency_cannot_view_this_agencys_complaints(self):
        response = self.other_agency_client.get(f"/api/agencies/{self.agency.id}/complaints/")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_rejected(self):
        client = APIClient()
        response = client.get(f"/api/agencies/{self.agency.id}/complaints/")
        self.assertEqual(response.status_code, 401)

    def test_no_resolve_action_exists_on_this_endpoint(self):
        # Deliberate — this is read-only visibility, not resolution
        # authority, which stays platform-wide staff-only.
        response = self.agency_client.post(f"/api/agencies/{self.agency.id}/complaints/")
        self.assertIn(response.status_code, (405, 403))
