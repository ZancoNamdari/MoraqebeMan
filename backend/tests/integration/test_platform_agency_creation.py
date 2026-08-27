from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.agencies.models import AgencyProfile
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class PlatformAgencyListCreateViewTests(BaseAPITestCase):
    """
    POST /api/agencies/ — the one-step onboarding flow that replaces
    the previous awkward "promote an existing account via role
    change, then wait for it to auto-create its own profile" path.
    """

    def setUp(self):
        self.superuser = make_user("create_agency_superuser", role=UserRole.SUPERUSER, phone_number="09100017001")
        self.superuser_client = APIClient()
        self.superuser_client.force_authenticate(self.superuser)

        self.valid_payload = {
            "company_name": "آژانس مراقبتی نمونه",
            "license_number": "LIC-1234",
            "first_name": "رضا", "last_name": "کریمی",
            "phone_number": "09121800001",
        }

    def test_superuser_can_create_a_new_agency_in_one_step(self):
        response = self.superuser_client.post("/api/agencies/", self.valid_payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["company_name"], "آژانس مراقبتی نمونه")
        self.assertTrue(response.data["access_code"].startswith("AGN-"))

        owner = User.objects.get(phone_number="09121800001")
        self.assertEqual(owner.role, UserRole.AGENCY)
        self.assertTrue(owner.has_usable_password())  # real account
        self.assertTrue(AgencyProfile.objects.filter(user=owner, company_name="آژانس مراقبتی نمونه").exists())

    def test_created_agency_owner_can_immediately_log_in_and_use_their_profile(self):
        # End-to-end proof, not just DB rows — the created account must
        # actually work through the platform's normal flows.
        self.superuser_client.post("/api/agencies/", self.valid_payload, format="json")
        owner = User.objects.get(phone_number="09121800001")

        owner_client = APIClient()
        owner_client.force_authenticate(owner)
        response = owner_client.get("/api/agencies/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["company_name"], "آژانس مراقبتی نمونه")

    def test_license_number_and_email_are_optional(self):
        payload = {
            "company_name": "آژانس بدون مجوز",
            "first_name": "سارا", "last_name": "احمدی", "phone_number": "09121800002",
        }
        response = self.superuser_client.post("/api/agencies/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["license_number"], "")

    def test_duplicate_phone_number_rejected(self):
        self.superuser_client.post("/api/agencies/", self.valid_payload, format="json")
        response = self.superuser_client.post("/api/agencies/", self.valid_payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(AgencyProfile.objects.filter(company_name="آژانس مراقبتی نمونه").count(), 1)  # not double-created

    def test_missing_company_name_rejected(self):
        payload = dict(self.valid_payload)
        del payload["company_name"]
        response = self.superuser_client.post("/api/agencies/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_agency_owner_cannot_create_another_agency(self):
        agency_user = make_user("create_agency_existing_owner", role=UserRole.AGENCY, phone_number="09100017002")
        client = APIClient()
        client.force_authenticate(agency_user)
        response = client.post("/api/agencies/", self.valid_payload, format="json")
        self.assertEqual(response.status_code, 403)

    def test_admin_cannot_create_an_agency(self):
        # Deliberately SUPERUSER-only, not ADMIN — agency onboarding is
        # a business/contractual action, matching the platform's own
        # RBAC framing of AGENCY accounts needing deliberate setup.
        admin = make_user("create_agency_admin", role=UserRole.ADMIN, phone_number="09100017003")
        client = APIClient()
        client.force_authenticate(admin)
        response = client.post("/api/agencies/", self.valid_payload, format="json")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_create_agency(self):
        client = APIClient()
        response = client.post("/api/agencies/", self.valid_payload, format="json")
        self.assertEqual(response.status_code, 401)

    def test_writes_audit_entry(self):
        from apps.audit.models import AuditEventType, AuditLog
        self.superuser_client.post("/api/agencies/", self.valid_payload, format="json")
        self.assertTrue(AuditLog.objects.filter(event_type=AuditEventType.AGENCY_CREATED).exists())

    def test_superuser_can_list_all_agencies(self):
        self.superuser_client.post("/api/agencies/", self.valid_payload, format="json")
        response = self.superuser_client.get("/api/agencies/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["owner_phone_number"], "09121800001")

    def test_list_response_created_at_is_json_serializable_string(self):
        # Regression test for a real bug: the GET response builds raw
        # dicts by hand (not through a serializer), and
        # AgencyProfile.created_at is a django_jalali datetime — DRF's
        # JSON renderer cannot encode that on its own outside a
        # serializer field, and previously crashed with a 500 here.
        # isinstance(..., str) is the actual regression check; a
        # non-string (or a crash reaching this line at all) means the
        # bug is back.
        self.superuser_client.post("/api/agencies/", self.valid_payload, format="json")
        response = self.superuser_client.get("/api/agencies/")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data[0]["created_at"], str)

    def test_non_superuser_cannot_list_agencies(self):
        agency_user = make_user("create_agency_list_denied", role=UserRole.AGENCY, phone_number="09100017004")
        client = APIClient()
        client.force_authenticate(agency_user)
        response = client.get("/api/agencies/")
        self.assertEqual(response.status_code, 403)
