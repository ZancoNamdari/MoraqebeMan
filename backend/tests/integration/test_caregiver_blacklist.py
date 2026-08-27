from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.care.matching import suggest_caregivers_for_patient
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from apps.families.models import PatientProfile
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class BlacklistCaregiverTests(BaseAPITestCase):
    def setUp(self):
        self.admin = make_user("blacklist_admin", role=UserRole.ADMIN, phone_number="09100016001")
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)

        self.caregiver_user = make_user("blacklist_caregiver", role=UserRole.CAREGIVER, phone_number="09100016002")
        self.profile = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.APPROVED)

    def test_admin_can_blacklist_an_approved_caregiver(self):
        response = self.admin_client.post(
            f"/api/caregivers/{self.caregiver_user.id}/blacklist/", {"reason": "شکایت مکرر خانواده‌ها"}, format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "suspended")

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, CaregiverStatus.SUSPENDED)
        self.assertEqual(self.profile.blacklist_reason, "شکایت مکرر خانواده‌ها")

    def test_blacklist_writes_approval_log_entry(self):
        self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/blacklist/", {"reason": "تست"}, format="json")
        log = self.profile.approval_logs.first()
        self.assertEqual(log.old_status, "approved")
        self.assertEqual(log.new_status, "suspended")
        self.assertEqual(log.performed_by_id, self.admin.id)

    def test_superuser_can_also_blacklist(self):
        superuser = make_user("blacklist_superuser", role=UserRole.SUPERUSER, phone_number="09100016003")
        client = APIClient()
        client.force_authenticate(superuser)
        response = client.post(f"/api/caregivers/{self.caregiver_user.id}/blacklist/", {}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_plain_caregiver_cannot_blacklist_anyone(self):
        other_caregiver = make_user("blacklist_plain", role=UserRole.CAREGIVER, phone_number="09100016004")
        client = APIClient()
        client.force_authenticate(other_caregiver)
        response = client.post(f"/api/caregivers/{self.caregiver_user.id}/blacklist/", {}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_blacklist(self):
        client = APIClient()
        response = client.post(f"/api/caregivers/{self.caregiver_user.id}/blacklist/", {}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_blacklist_nonexistent_caregiver_returns_404(self):
        response = self.admin_client.post("/api/caregivers/999999/blacklist/", {}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_unblacklist_returns_to_approved(self):
        self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/blacklist/", {"reason": "تست"}, format="json")
        response = self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/unblacklist/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "approved")

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, CaregiverStatus.APPROVED)
        self.assertEqual(self.profile.blacklist_reason, "")  # cleared

    def test_unblacklist_a_non_blacklisted_caregiver_rejected(self):
        response = self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/unblacklist/")
        self.assertEqual(response.status_code, 400)

    def test_unblacklist_writes_approval_log_entry(self):
        self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/blacklist/", {}, format="json")
        self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/unblacklist/")
        latest_log = self.profile.approval_logs.first()  # ordering = ["-created_at"]
        self.assertEqual(latest_log.old_status, "suspended")
        self.assertEqual(latest_log.new_status, "approved")

    def test_full_profile_view_shows_blacklist_reason(self):
        self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/blacklist/", {"reason": "دلیل آزمایشی"}, format="json")
        response = self.admin_client.get(f"/api/supervisor/caregivers/{self.caregiver_user.id}/full/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "suspended")
        self.assertEqual(response.data["blacklist_reason"], "دلیل آزمایشی")


class BlacklistedCaregiverExcludedFromMatchingTests(BaseAPITestCase):
    """
    The whole point of blacklisting — a suspended caregiver must never
    be suggested by matching, on either the platform-wide or the
    agency-scoped endpoint. Confirms this holds without any new
    blacklist-specific code in the matching pipeline itself — it's a
    direct consequence of waterfall.py's existing
    status == CaregiverStatus.APPROVED hard filter.
    """

    def setUp(self):
        self.admin = make_user("blacklist_matching_admin", role=UserRole.ADMIN, phone_number="09100016010")
        self.patient = PatientProfile.objects.create(full_name="سالمند تست بلک‌لیست")

        self.blacklisted_user = make_user("blacklist_matching_cg", role=UserRole.CAREGIVER, phone_number="09100016011")
        self.blacklisted_profile = CaregiverProfile.objects.create(user=self.blacklisted_user, status=CaregiverStatus.APPROVED)

        self.clean_user = make_user("blacklist_matching_clean", role=UserRole.CAREGIVER, phone_number="09100016012")
        CaregiverProfile.objects.create(user=self.clean_user, status=CaregiverStatus.APPROVED)

    def test_blacklisted_caregiver_never_appears_in_suggestions(self):
        # Confirm visible before blacklisting.
        results_before = suggest_caregivers_for_patient(self.patient)
        names_before = {r["caregiver_name"] for r in results_before}
        self.assertIn("blacklist_matching_cg", names_before)

        self.blacklisted_profile.blacklist(self.admin, reason="تست")

        results_after = suggest_caregivers_for_patient(self.patient)
        names_after = {r["caregiver_name"] for r in results_after}
        self.assertNotIn("blacklist_matching_cg", names_after)
        self.assertIn("blacklist_matching_clean", names_after)  # unaffected caregiver still shows up

    def test_unblacklisting_restores_visibility_in_matching(self):
        self.blacklisted_profile.blacklist(self.admin, reason="تست")
        self.blacklisted_profile.unblacklist(self.admin)

        results = suggest_caregivers_for_patient(self.patient)
        names = {r["caregiver_name"] for r in results}
        self.assertIn("blacklist_matching_cg", names)
