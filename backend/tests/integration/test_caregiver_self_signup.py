"""ثبت‌نام مستقل مراقب + تأیید ادمین: تا تأیید، حساب «غیرفعال» است."""
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.authentication.models import RegistrationOTP
from apps.care.models import AssignmentStatus, CaregiverAssignment
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from apps.families.models import PatientProfile
from tests.factories.user_factory import make_user

PHONE = "09125557001"


class CaregiverSelfSignupTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def _register(self):
        otp, raw = RegistrationOTP.issue_for(PHONE)
        r = self.client.post("/api/auth/register/", {
            "first_name": "سارا", "last_name": "مراقب", "phone_number": PHONE,
            "role": "caregiver", "code": raw,
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + r.json()["tokens"]["access"])
        return r.json()["user"]

    def test_register_creates_inactive_caregiver_draft(self):
        user = self._register()
        self.assertEqual(user["role"], "caregiver")
        full = self.client.get("/api/caregivers/me/full/").json()
        self.assertEqual(full["status"], "draft")
        self.assertFalse(full["is_approved"])
        self.assertTrue(full["missing_forms"])  # چک‌لیست فرم‌های ناقص

    def test_unapproved_caregiver_cannot_start_activity(self):
        self._register()
        self.client.get("/api/caregivers/me/full/")  # profile auto-created
        self.assertEqual(self.client.get("/api/care/me/patients/").json(), [])
        self.assertEqual(self.client.get("/api/care/me/log-entries/").status_code, 403)
        self.assertEqual(self.client.get("/api/reviews/patient-notes/me/").status_code, 403)

    def test_submit_with_missing_forms_rejected_with_checklist(self):
        self._register()
        r = self.client.post("/api/caregivers/me/submit/")
        self.assertEqual(r.status_code, 400)
        self.assertTrue(r.json()["missing"])
        self.assertEqual(CaregiverProfile.objects.get(user__phone_number=PHONE).status, CaregiverStatus.DRAFT)

    def test_submit_complete_profile_goes_pending_then_admin_activates(self):
        self._register()
        with patch("apps.caregivers.views._missing_forms", return_value=[]):
            r = self.client.post("/api/caregivers/me/submit/")
        self.assertEqual(r.status_code, 200, r.content)
        profile = CaregiverProfile.objects.get(user__phone_number=PHONE)
        self.assertEqual(profile.status, CaregiverStatus.PENDING)
        self.assertTrue(profile.approval_logs.filter(new_status="pending").exists())
        # دوباره ارسال نمی‌شود
        with patch("apps.caregivers.views._missing_forms", return_value=[]):
            self.assertEqual(self.client.post("/api/caregivers/me/submit/").status_code, 400)
        # هنوز غیرفعال
        self.assertEqual(self.client.get("/api/care/me/log-entries/").status_code, 403)
        # تأیید ادمین → فعال
        admin = make_user("adm_signup", role=UserRole.ADMIN, phone_number="09125557002")
        profile.approve(admin)
        self.assertEqual(self.client.get("/api/care/me/log-entries/").status_code, 200)

    def test_rejected_caregiver_can_resubmit(self):
        user = self._register()
        self.client.get("/api/caregivers/me/full/")
        profile = CaregiverProfile.objects.get(user__phone_number=PHONE)
        admin = make_user("adm_signup2", role=UserRole.ADMIN, phone_number="09125557003")
        profile.reject(admin, reason="ناقص")
        with patch("apps.caregivers.views._missing_forms", return_value=[]):
            self.assertEqual(self.client.post("/api/caregivers/me/submit/").status_code, 200)
        profile.refresh_from_db()
        self.assertEqual(profile.status, CaregiverStatus.PENDING)

    def test_admin_cannot_assign_unapproved_caregiver(self):
        self._register()
        self.client.get("/api/caregivers/me/full/")
        admin = make_user("adm_signup3", role=UserRole.ADMIN, phone_number="09125557004")
        patient = PatientProfile.objects.create(full_name="بیمار")
        c = APIClient(); c.force_authenticate(admin)
        body = {"caregiver_user_id": CaregiverProfile.objects.get(user__phone_number=PHONE).user_id,
                "patient_code": patient.access_code}
        self.assertEqual(c.post("/api/care/assignments/", body, format="json").status_code, 400)
        CaregiverProfile.objects.get(user__phone_number=PHONE).approve(admin)
        self.assertEqual(c.post("/api/care/assignments/", body, format="json").status_code, 201)
        self.assertEqual(CaregiverAssignment.objects.filter(status=AssignmentStatus.ACTIVE).count(), 1)
