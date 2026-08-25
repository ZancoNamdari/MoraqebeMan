from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyFamilyLink, AgencyLinkStatus, AgencyPatientLink, AgencyProfile, AgencySupervisor
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from apps.families.models import FamilyProfile, PatientProfile
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class PlatformAnalyticsViewTests(BaseAPITestCase):
    """
    GET /api/agencies/analytics/ — SUPERUSER-only cross-agency
    aggregate view. Per the confirmed decision, this is NOT a fake
    "sees everything" agency account — these tests exist partly to
    confirm regular agency-scoped endpoints (test_agencies.py,
    test_cross_agency_isolation_audit.py) still can't reach any of
    this, since it's a structurally separate view, not a special-
    cased tenant.
    """

    def setUp(self):
        self.superuser = make_user("analytics_superuser", role=UserRole.SUPERUSER, phone_number="09100015001")
        self.superuser_client = APIClient()
        self.superuser_client.force_authenticate(self.superuser)

        self.agency_a = AgencyProfile.objects.create(
            user=make_user("analytics_agency_a", role=UserRole.AGENCY, phone_number="09100015002"),
            company_name="آژانس الف",
        )
        self.agency_b = AgencyProfile.objects.create(
            user=make_user("analytics_agency_b", role=UserRole.AGENCY, phone_number="09100015003"),
            company_name="آژانس ب",
        )

        # Agency A: 1 supervisor, 2 approved caregivers, 1 pending, 1 patient
        AgencySupervisor.objects.create(
            user=make_user("analytics_super_a", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100015004"),
            agency=self.agency_a, created_by=self.agency_a.user,
        )
        for i in range(2):
            cg_user = make_user(f"analytics_cg_a_{i}", role=UserRole.CAREGIVER, phone_number=f"0912150001{i}")
            profile = CaregiverProfile.objects.create(user=cg_user, status=CaregiverStatus.APPROVED)
            AgencyCaregiverLink.objects.create(agency=self.agency_a, caregiver=profile, status=AgencyLinkStatus.APPROVED)
        pending_user = make_user("analytics_cg_a_pending", role=UserRole.CAREGIVER, phone_number="09121500020")
        pending_profile = CaregiverProfile.objects.create(user=pending_user, status=CaregiverStatus.APPROVED)
        AgencyCaregiverLink.objects.create(agency=self.agency_a, caregiver=pending_profile, status=AgencyLinkStatus.PENDING)

        patient_a = PatientProfile.objects.create(full_name="سالمند آژانس الف")
        AgencyPatientLink.objects.create(agency=self.agency_a, patient=patient_a, status=AgencyLinkStatus.APPROVED)

        # Agency B: 0 supervisors, 1 approved caregiver, 0 patients
        cg_user_b = make_user("analytics_cg_b", role=UserRole.CAREGIVER, phone_number="09121500021")
        profile_b = CaregiverProfile.objects.create(user=cg_user_b, status=CaregiverStatus.APPROVED)
        AgencyCaregiverLink.objects.create(agency=self.agency_b, caregiver=profile_b, status=AgencyLinkStatus.APPROVED)

    def test_superuser_sees_platform_wide_totals(self):
        response = self.superuser_client.get("/api/agencies/analytics/")
        self.assertEqual(response.status_code, 200)
        totals = response.data["totals"]
        self.assertEqual(totals["agency_count"], 2)
        self.assertEqual(totals["supervisor_count"], 1)
        self.assertGreaterEqual(totals["caregiver_count"], 4)  # 2 approved + 1 pending (agency A) + 1 (agency B)
        self.assertGreaterEqual(totals["approved_caregiver_count"], 3)
        self.assertGreaterEqual(totals["patient_count"], 1)

    def test_superuser_sees_per_agency_breakdown(self):
        response = self.superuser_client.get("/api/agencies/analytics/")
        rows = {row["company_name"]: row for row in response.data["agencies"]}

        self.assertEqual(rows["آژانس الف"]["supervisor_count"], 1)
        self.assertEqual(rows["آژانس الف"]["approved_caregiver_count"], 2)
        self.assertEqual(rows["آژانس الف"]["pending_caregiver_requests"], 1)
        self.assertEqual(rows["آژانس الف"]["patient_count"], 1)

        self.assertEqual(rows["آژانس ب"]["supervisor_count"], 0)
        self.assertEqual(rows["آژانس ب"]["approved_caregiver_count"], 1)
        self.assertEqual(rows["آژانس ب"]["patient_count"], 0)

    def test_agency_owner_cannot_access_analytics(self):
        client = APIClient()
        client.force_authenticate(self.agency_a.user)
        response = client.get("/api/agencies/analytics/")
        self.assertEqual(response.status_code, 403)

    def test_agency_supervisor_cannot_access_analytics(self):
        supervisor = AgencySupervisor.objects.first().user
        client = APIClient()
        client.force_authenticate(supervisor)
        response = client.get("/api/agencies/analytics/")
        self.assertEqual(response.status_code, 403)

    def test_admin_cannot_access_analytics(self):
        # Deliberately ADMIN-excluded too — the confirmed requirement
        # was specifically SUPERUSER, not "platform staff generally".
        admin = make_user("analytics_admin", role=UserRole.ADMIN, phone_number="09100015005")
        client = APIClient()
        client.force_authenticate(admin)
        response = client.get("/api/agencies/analytics/")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_rejected(self):
        client = APIClient()
        response = client.get("/api/agencies/analytics/")
        self.assertEqual(response.status_code, 401)

    def test_empty_platform_returns_zeroed_totals_not_error(self):
        AgencyPatientLink.objects.all().delete()
        AgencyCaregiverLink.objects.all().delete()
        AgencyFamilyLink.objects.all().delete()
        AgencySupervisor.objects.all().delete()
        AgencyProfile.objects.all().delete()
        CaregiverProfile.objects.all().delete()
        PatientProfile.objects.all().delete()
        FamilyProfile.objects.all().delete()

        response = self.superuser_client.get("/api/agencies/analytics/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totals"]["agency_count"], 0)
        self.assertEqual(response.data["agencies"], [])
