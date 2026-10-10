"""ثبت‌نام مراقب: بدون کد آژانس → ادمین پلتفرم؛ با کد آژانس → تأیید با کارکنان همان آژانس."""
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus
from apps.authentication.models import RegistrationOTP
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from tests.factories.user_factory import make_user

PHONE = "09125558001"
NO_MISSING = patch("apps.caregivers.views._missing_forms", return_value=[])


def _agency_client(username, phone):
    user = make_user(username, role=UserRole.AGENCY, phone_number=phone)
    c = APIClient(); c.force_authenticate(user)
    code = c.get("/api/agencies/me/").data["access_code"]
    return c, code


class RegistrationReviewRoutingTests(TestCase):
    def setUp(self):
        cache.clear()
        self.cg = APIClient()
        _, raw = RegistrationOTP.issue_for(PHONE)
        r = self.cg.post("/api/auth/register/", {
            "first_name": "سارا", "last_name": "مراقب", "phone_number": PHONE, "role": "caregiver", "code": raw,
        }, format="json")
        self.cg.credentials(HTTP_AUTHORIZATION="Bearer " + r.json()["tokens"]["access"])
        self.cg.put("/api/caregivers/me/service-types/", {"service_types": ["nezafatchi"]}, format="json")
        self.agency, self.code = _agency_client("ag_a", "09125558002")
        self.other_agency, _ = _agency_client("ag_b", "09125558003")

    def _submit(self, **body):
        with NO_MISSING:
            return self.cg.post("/api/caregivers/me/submit/", body, format="json")

    def test_without_code_goes_to_platform_admin(self):
        r = self._submit()
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["reviewer"], "platform")
        self.assertEqual(AgencyCaregiverLink.objects.count(), 0)
        self.assertEqual(self.agency.get("/api/agencies/me/caregivers/registrations/").json(), [])

    def test_invalid_code_rejected_and_nothing_submitted(self):
        r = self._submit(agency_code="AAA-ZZZZZZ")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(CaregiverProfile.objects.get(user__phone_number=PHONE).status, CaregiverStatus.DRAFT)

    def test_with_code_goes_to_that_agency_only(self):
        r = self._submit(agency_code=self.code)
        self.assertEqual(r.json()["reviewer"], "agency")
        link = AgencyCaregiverLink.objects.get()
        self.assertEqual(link.status, AgencyLinkStatus.PENDING)
        items = self.agency.get("/api/agencies/me/caregivers/registrations/").json()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["phone_number"], PHONE)
        self.assertEqual(self.agency.get("/api/agencies/me/dashboard/").json()["pending_registration_reviews"], 1)
        self.assertEqual(self.other_agency.get("/api/agencies/me/caregivers/registrations/").json(), [])
        self.assertEqual(self.cg.get("/api/caregivers/me/full/").json()["reviewing_agency"] is not None, True)

    def test_agency_approves_and_account_becomes_active(self):
        self._submit(agency_code=self.code)
        uid = CaregiverProfile.objects.get(user__phone_number=PHONE).user_id
        with NO_MISSING:
            r = self.agency.post(f"/api/agencies/me/caregivers/registrations/{uid}/approve/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(CaregiverProfile.objects.get(user_id=uid).status, CaregiverStatus.APPROVED)
        self.assertEqual(AgencyCaregiverLink.objects.get().status, AgencyLinkStatus.APPROVED)
        self.assertEqual(self.cg.get("/api/care/me/log-entries/").status_code, 200)

    def test_agency_reject_needs_reason(self):
        self._submit(agency_code=self.code)
        uid = CaregiverProfile.objects.get(user__phone_number=PHONE).user_id
        self.assertEqual(self.agency.post(f"/api/agencies/me/caregivers/registrations/{uid}/reject/", {}, format="json").status_code, 400)
        r = self.agency.post(f"/api/agencies/me/caregivers/registrations/{uid}/reject/", {"reason": "مدارک ناقص"}, format="json")
        self.assertEqual(r.status_code, 200)
        profile = CaregiverProfile.objects.get(user_id=uid)
        self.assertEqual(profile.status, CaregiverStatus.REJECTED)
        self.assertEqual(profile.rejection_reason, "مدارک ناقص")

    def test_other_agency_and_family_cannot_decide(self):
        self._submit(agency_code=self.code)
        uid = CaregiverProfile.objects.get(user__phone_number=PHONE).user_id
        self.assertEqual(self.other_agency.post(f"/api/agencies/me/caregivers/registrations/{uid}/approve/").status_code, 404)
        fam = APIClient(); fam.force_authenticate(make_user("fam_x", role=UserRole.FAMILY, phone_number="09125558009"))
        self.assertEqual(fam.get("/api/agencies/me/caregivers/registrations/").status_code, 403)
        self.assertEqual(CaregiverProfile.objects.get(user_id=uid).status, CaregiverStatus.PENDING)

    def test_agency_can_read_pending_profile_but_not_edit_it(self):
        self._submit(agency_code=self.code)
        uid = CaregiverProfile.objects.get(user__phone_number=PHONE).user_id
        self.assertEqual(self.agency.get(f"/api/supervisor/caregivers/{uid}/full/").status_code, 200)
        self.assertEqual(self.other_agency.get(f"/api/supervisor/caregivers/{uid}/full/").status_code, 404)
        self.assertEqual(self.agency.put(f"/api/supervisor/caregivers/{uid}/identity/", {}, format="json").status_code, 404)
