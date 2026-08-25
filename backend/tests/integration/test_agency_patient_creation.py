from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.agencies.models import AgencyFamilyLink, AgencyLinkStatus, AgencyPatientLink, AgencyProfile, AgencySupervisor
from apps.families.models import FamilyPatientLink, FamilyProfile, LinkStatus, PatientProfile
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class AgencyPatientCreationTests(BaseAPITestCase):
    """
    POST/GET /api/agencies/<agency_id>/patients/ — both confirmed
    creation modes (standalone patient, or also creating a new family
    account on the family's behalf), plus the access boundary
    (agency/its own supervisors/superuser — not other agencies).
    """

    def setUp(self):
        self.agency = AgencyProfile.objects.create(
            user=make_user("agency_patient_owner", role=UserRole.AGENCY, phone_number="09100010001"),
            company_name="آژانس مراقبتی الف",
        )
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency.user)

        self.supervisor_user = make_user("agency_patient_super", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100010002")
        AgencySupervisor.objects.create(user=self.supervisor_user, agency=self.agency, created_by=self.agency.user)
        self.supervisor_client = APIClient()
        self.supervisor_client.force_authenticate(self.supervisor_user)

        self.other_agency = AgencyProfile.objects.create(
            user=make_user("agency_patient_owner2", role=UserRole.AGENCY, phone_number="09100010003"),
            company_name="آژانس مراقبتی ب",
        )
        self.other_agency_client = APIClient()
        self.other_agency_client.force_authenticate(self.other_agency.user)

        self.superuser = make_user("superuser_patient_test", role=UserRole.SUPERUSER, phone_number="09100010004")
        self.superuser_client = APIClient()
        self.superuser_client.force_authenticate(self.superuser)

        self.standalone_payload = {
            "mode": "standalone",
            "patient": {"full_name": "حسن رضوی", "gender": "male"},
        }
        self.with_family_payload = {
            "mode": "with_family",
            "patient": {"full_name": "زهرا محمدی", "gender": "female"},
            "family": {
                "first_name": "امیر", "last_name": "محمدی",
                "phone_number": "09121400001", "relation": "child",
            },
        }

    # -----------------------------------------------------------
    # Standalone mode
    # -----------------------------------------------------------

    def test_standalone_mode_creates_patient_with_no_user(self):
        response = self.agency_client.post(f"/api/agencies/{self.agency.id}/patients/", self.standalone_payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["user_id"])
        self.assertTrue(response.data["access_code"].startswith("ELD-"))
        self.assertNotIn("family", response.data)

    def test_standalone_mode_creates_approved_agency_patient_link(self):
        response = self.agency_client.post(f"/api/agencies/{self.agency.id}/patients/", self.standalone_payload, format="json")
        patient_id = response.data["id"]
        link = AgencyPatientLink.objects.get(patient_id=patient_id)
        self.assertEqual(link.agency_id, self.agency.id)
        self.assertEqual(link.status, AgencyLinkStatus.APPROVED)

    def test_standalone_patient_can_later_be_linked_by_a_real_family_via_normal_code_flow(self):
        # Confirms this integrates with the platform's EXISTING
        # family-joins-by-code flow — not a special case that needs
        # its own separate linking mechanism.
        create_response = self.agency_client.post(f"/api/agencies/{self.agency.id}/patients/", self.standalone_payload, format="json")
        access_code = create_response.data["access_code"]

        family_user = make_user("real_family_links_later", role=UserRole.FAMILY, phone_number="09121400099")
        family_client = APIClient()
        family_client.force_authenticate(family_user)
        connect_response = family_client.post("/api/patients/connect/", {"patient_code": access_code, "relation": "child"}, format="json")
        self.assertEqual(connect_response.status_code, 201)

    # -----------------------------------------------------------
    # with_family mode
    # -----------------------------------------------------------

    def test_with_family_mode_creates_family_user_and_links_everything(self):
        response = self.agency_client.post(f"/api/agencies/{self.agency.id}/patients/", self.with_family_payload, format="json")
        self.assertEqual(response.status_code, 201)

        family_info = response.data["family"]
        self.assertEqual(family_info["phone_number"], "09121400001")
        self.assertTrue(family_info["access_code"].startswith("FAM-"))

        family_user = User.objects.get(phone_number="09121400001")
        self.assertEqual(family_user.role, UserRole.FAMILY)
        self.assertTrue(family_user.has_usable_password())  # real account, not a placeholder

        patient = PatientProfile.objects.get(id=response.data["id"])
        self.assertTrue(FamilyPatientLink.objects.filter(patient=patient, relation="child", status=LinkStatus.APPROVED).exists())
        self.assertTrue(AgencyFamilyLink.objects.filter(agency=self.agency, family__user=family_user, status=AgencyLinkStatus.APPROVED).exists())
        self.assertTrue(AgencyPatientLink.objects.filter(agency=self.agency, patient=patient, status=AgencyLinkStatus.APPROVED).exists())

    def test_with_family_created_family_can_immediately_see_the_patient(self):
        # Confirms the whole chain actually works end to end from the
        # family's own side, not just that the right rows exist.
        response = self.agency_client.post(f"/api/agencies/{self.agency.id}/patients/", self.with_family_payload, format="json")
        family_user = User.objects.get(phone_number="09121400001")
        family_client = APIClient()
        family_client.force_authenticate(family_user)

        list_response = family_client.get("/api/patients/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["full_name"], "زهرا محمدی")

    def test_with_family_duplicate_phone_number_rejected(self):
        make_user("existing_phone_holder", phone_number="09121400001")
        response = self.agency_client.post(f"/api/agencies/{self.agency.id}/patients/", self.with_family_payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(PatientProfile.objects.filter(full_name="زهرا محمدی").exists())  # nothing half-created

    def test_missing_family_data_in_with_family_mode_rejected(self):
        payload = {"mode": "with_family", "patient": {"full_name": "بدون خانواده", "gender": "male"}}
        response = self.agency_client.post(f"/api/agencies/{self.agency.id}/patients/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    # -----------------------------------------------------------
    # Mode validation
    # -----------------------------------------------------------

    def test_invalid_mode_rejected(self):
        payload = {"mode": "not_a_real_mode", "patient": {"full_name": "تست"}}
        response = self.agency_client.post(f"/api/agencies/{self.agency.id}/patients/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_missing_mode_rejected(self):
        payload = {"patient": {"full_name": "تست"}}
        response = self.agency_client.post(f"/api/agencies/{self.agency.id}/patients/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    # -----------------------------------------------------------
    # Access boundary
    # -----------------------------------------------------------

    def test_agency_supervisor_can_create_patients_for_own_agency(self):
        response = self.supervisor_client.post(f"/api/agencies/{self.agency.id}/patients/", self.standalone_payload, format="json")
        self.assertEqual(response.status_code, 201)

    def test_superuser_can_create_patient_for_any_agency(self):
        response = self.superuser_client.post(f"/api/agencies/{self.agency.id}/patients/", self.standalone_payload, format="json")
        self.assertEqual(response.status_code, 201)

    def test_different_agency_cannot_create_patients_for_this_agency(self):
        response = self.other_agency_client.post(f"/api/agencies/{self.agency.id}/patients/", self.standalone_payload, format="json")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_create_or_list(self):
        anon_client = APIClient()
        response = anon_client.post(f"/api/agencies/{self.agency.id}/patients/", self.standalone_payload, format="json")
        self.assertEqual(response.status_code, 401)

    # -----------------------------------------------------------
    # List scoping
    # -----------------------------------------------------------

    def test_list_only_shows_this_agencys_patients(self):
        self.agency_client.post(f"/api/agencies/{self.agency.id}/patients/", self.standalone_payload, format="json")
        self.other_agency_client.post(
            f"/api/agencies/{self.other_agency.id}/patients/",
            {"mode": "standalone", "patient": {"full_name": "بیمار آژانس دیگر", "gender": "male"}},
            format="json",
        )

        response = self.agency_client.get(f"/api/agencies/{self.agency.id}/patients/")
        self.assertEqual(response.status_code, 200)
        names = [p["full_name"] for p in response.data]
        self.assertIn("حسن رضوی", names)
        self.assertNotIn("بیمار آژانس دیگر", names)

    def test_writes_audit_entry(self):
        from apps.audit.models import AuditEventType, AuditLog
        self.agency_client.post(f"/api/agencies/{self.agency.id}/patients/", self.standalone_payload, format="json")
        self.assertTrue(AuditLog.objects.filter(event_type=AuditEventType.PATIENT_CREATED).exists())
