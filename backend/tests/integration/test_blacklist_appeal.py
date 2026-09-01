from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus, AgencyProfile, AgencySupervisor
from apps.caregivers.models import BlacklistAppeal, CaregiverProfile, CaregiverStatus
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class BlacklistAppealSubmissionTests(BaseAPITestCase):
    def setUp(self):
        self.caregiver_user = make_user("appeal_caregiver", role=UserRole.CAREGIVER, phone_number="09100024001")
        self.profile = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.APPROVED)
        self.client_ = APIClient()
        self.client_.force_authenticate(self.caregiver_user)

    def test_cannot_submit_appeal_while_not_suspended(self):
        response = self.client_.post("/api/caregivers/me/blacklist-appeal/", {"appeal_reason": "دلیل من"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_can_submit_appeal_while_suspended(self):
        self.profile.status = CaregiverStatus.SUSPENDED
        self.profile.save()
        response = self.client_.post("/api/caregivers/me/blacklist-appeal/", {"appeal_reason": "من دیگه این کار رو نمی‌کنم"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "pending")

    def test_cannot_submit_second_appeal_while_one_is_pending(self):
        self.profile.status = CaregiverStatus.SUSPENDED
        self.profile.save()
        self.client_.post("/api/caregivers/me/blacklist-appeal/", {"appeal_reason": "اول"}, format="json")
        response = self.client_.post("/api/caregivers/me/blacklist-appeal/", {"appeal_reason": "دوم"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(BlacklistAppeal.objects.filter(caregiver=self.profile).count(), 1)

    def test_can_see_own_appeal_history(self):
        self.profile.status = CaregiverStatus.SUSPENDED
        self.profile.save()
        self.client_.post("/api/caregivers/me/blacklist-appeal/", {"appeal_reason": "test"}, format="json")
        response = self.client_.get("/api/caregivers/me/blacklist-appeal/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_family_cannot_submit_an_appeal(self):
        family_user = make_user("appeal_family_denied", role=UserRole.FAMILY, phone_number="09100024002")
        client = APIClient()
        client.force_authenticate(family_user)
        response = client.post("/api/caregivers/me/blacklist-appeal/", {"appeal_reason": "test"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_submit(self):
        client = APIClient()
        response = client.post("/api/caregivers/me/blacklist-appeal/", {"appeal_reason": "test"}, format="json")
        self.assertEqual(response.status_code, 401)


class BlacklistAppealReviewTests(BaseAPITestCase):
    """
    The core of the feature: EITHER platform staff OR the caregiver's
    own agency (owner or supervisor, only with an approved roster
    link) can review — a deliberately different model from
    Complaint's staff-only review, per an explicit product decision.
    """

    def setUp(self):
        self.admin = make_user("appeal_review_admin", role=UserRole.ADMIN, phone_number="09100024010")
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)

        self.agency = AgencyProfile.objects.create(
            user=make_user("appeal_review_agency_owner", role=UserRole.AGENCY, phone_number="09100024011"),
            company_name="آژانس تست بازبینی",
        )
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency.user)

        self.supervisor_user = make_user("appeal_review_supervisor", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100024012")
        AgencySupervisor.objects.create(user=self.supervisor_user, agency=self.agency, created_by=self.agency.user)
        self.supervisor_client = APIClient()
        self.supervisor_client.force_authenticate(self.supervisor_user)

        self.unrelated_agency = AgencyProfile.objects.create(
            user=make_user("appeal_review_unrelated_agency", role=UserRole.AGENCY, phone_number="09100024013"),
            company_name="آژانس بی‌ربط",
        )
        self.unrelated_agency_client = APIClient()
        self.unrelated_agency_client.force_authenticate(self.unrelated_agency.user)

        self.caregiver_user = make_user("appeal_review_caregiver", role=UserRole.CAREGIVER, phone_number="09100024014")
        self.profile = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.SUSPENDED, blacklist_reason="شکایات مکرر")
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.profile, status=AgencyLinkStatus.APPROVED)

        self.appeal = BlacklistAppeal.objects.create(caregiver=self.profile, appeal_reason="من رفتارم را اصلاح کرده‌ام")

    def test_admin_sees_all_appeals(self):
        response = self.admin_client.get("/api/caregivers/blacklist-appeals/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_admin_can_filter_by_status(self):
        response = self.admin_client.get("/api/caregivers/blacklist-appeals/?status=pending")
        self.assertEqual(len(response.data), 1)
        response = self.admin_client.get("/api/caregivers/blacklist-appeals/?status=approved")
        self.assertEqual(len(response.data), 0)

    def test_linked_agency_sees_the_appeal(self):
        response = self.agency_client.get("/api/caregivers/blacklist-appeals/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_agency_supervisor_sees_the_same_appeal_as_the_owner(self):
        response = self.supervisor_client.get("/api/caregivers/blacklist-appeals/")
        self.assertEqual(len(response.data), 1)

    def test_unrelated_agency_sees_nothing(self):
        response = self.unrelated_agency_client.get("/api/caregivers/blacklist-appeals/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_admin_can_approve_and_it_actually_unblacklists(self):
        response = self.admin_client.post(f"/api/caregivers/blacklist-appeals/{self.appeal.id}/approve/", {"note": "قانع‌کننده بود"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "approved")

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, CaregiverStatus.APPROVED)
        self.assertEqual(self.profile.blacklist_reason, "")

    def test_linked_agency_can_approve(self):
        response = self.agency_client.post(f"/api/caregivers/blacklist-appeals/{self.appeal.id}/approve/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, CaregiverStatus.APPROVED)

    def test_agency_supervisor_can_approve(self):
        response = self.supervisor_client.post(f"/api/caregivers/blacklist-appeals/{self.appeal.id}/approve/", {}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_unrelated_agency_cannot_approve(self):
        response = self.unrelated_agency_client.post(f"/api/caregivers/blacklist-appeals/{self.appeal.id}/approve/", {}, format="json")
        self.assertEqual(response.status_code, 403)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, CaregiverStatus.SUSPENDED)

    def test_deny_keeps_caregiver_suspended(self):
        response = self.admin_client.post(f"/api/caregivers/blacklist-appeals/{self.appeal.id}/deny/", {"note": "کافی نبود"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "denied")

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, CaregiverStatus.SUSPENDED)

    def test_after_denial_a_new_appeal_can_be_submitted(self):
        self.admin_client.post(f"/api/caregivers/blacklist-appeals/{self.appeal.id}/deny/", {}, format="json")
        caregiver_client = APIClient()
        caregiver_client.force_authenticate(self.caregiver_user)
        response = caregiver_client.post("/api/caregivers/me/blacklist-appeal/", {"appeal_reason": "درخواست دوم"}, format="json")
        self.assertEqual(response.status_code, 201)

    def test_family_cannot_access_review_endpoints_at_all(self):
        family_user = make_user("appeal_review_family_denied", role=UserRole.FAMILY, phone_number="09100024015")
        client = APIClient()
        client.force_authenticate(family_user)
        response = client.get("/api/caregivers/blacklist-appeals/")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_access(self):
        client = APIClient()
        response = client.get("/api/caregivers/blacklist-appeals/")
        self.assertEqual(response.status_code, 401)

    def test_nonexistent_appeal_returns_404(self):
        response = self.admin_client.post("/api/caregivers/blacklist-appeals/999999/approve/", {}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_listing_reviewed_appeals_does_not_n_plus_one_on_reviewer_name(self):
        """
        Regression test for a real N+1 caught during a pre-deployment
        performance review: get_reviewer_name accesses
        obj.reviewed_by.caregiver_identity_profile per row — without
        select_related covering both that FK and its own nested
        OneToOne, viewing a page of already-reviewed appeals would
        trigger two extra queries per row.
        """
        from django.test.utils import CaptureQueriesContext
        from django.db import connection

        self.admin_client.post(f"/api/caregivers/blacklist-appeals/{self.appeal.id}/approve/", {}, format="json")

        second_caregiver_user = make_user("appeal_n1_caregiver", role=UserRole.CAREGIVER, phone_number="09100024016")
        second_profile = CaregiverProfile.objects.create(user=second_caregiver_user, status=CaregiverStatus.SUSPENDED)
        second_appeal = BlacklistAppeal.objects.create(caregiver=second_profile, appeal_reason="دومی")
        self.admin_client.post(f"/api/caregivers/blacklist-appeals/{second_appeal.id}/deny/", {}, format="json")

        with CaptureQueriesContext(connection) as ctx:
            response = self.admin_client.get("/api/caregivers/blacklist-appeals/?status=approved")
            self.assertEqual(response.status_code, 200)
        queries_for_one = len(ctx.captured_queries)

        third_caregiver_user = make_user("appeal_n1_caregiver2", role=UserRole.CAREGIVER, phone_number="09100024017")
        third_profile = CaregiverProfile.objects.create(user=third_caregiver_user, status=CaregiverStatus.SUSPENDED)
        third_appeal = BlacklistAppeal.objects.create(caregiver=third_profile, appeal_reason="سومی")
        self.admin_client.post(f"/api/caregivers/blacklist-appeals/{third_appeal.id}/approve/", {}, format="json")

        with CaptureQueriesContext(connection) as ctx:
            response = self.admin_client.get("/api/caregivers/blacklist-appeals/?status=approved")
            self.assertEqual(response.status_code, 200)
        queries_for_two = len(ctx.captured_queries)

        # Flat, not growing with row count — the real signal an N+1
        # is actually fixed, not just "happens to work with one row."
        self.assertEqual(queries_for_one, queries_for_two)
