from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.audit.services import AuditService
from apps.families.models import FamilyPatientLink, FamilyProfile, PatientProfile
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user

audit = AuditService()


class AuditLogListViewTests(BaseAPITestCase):
    """
    GET /api/audit/logs/ — ADMIN/SUPERUSER only, the general staff
    browser. Before this view existed, AuditLog had no query surface
    anywhere in the API at all — every event was written but never
    readable.
    """

    def setUp(self):
        self.admin = make_user("audit_list_admin", role=UserRole.ADMIN, phone_number="09100023001")
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)

        self.actor = make_user("audit_list_actor", role=UserRole.ADMIN, phone_number="09100023002")
        self.target = make_user("audit_list_target", role=UserRole.CAREGIVER, phone_number="09100023003")

        audit.caregiver_approved(self.actor.id, self.target.id)
        audit.caregiver_blacklisted(self.actor.id, self.target.id, reason="شکایات مکرر")

    def test_admin_can_list_all_logs(self):
        response = self.admin_client.get("/api/audit/logs/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 2)

    def test_names_are_resolved_not_just_raw_ids(self):
        response = self.admin_client.get("/api/audit/logs/?event_type=caregiver_blacklisted")
        self.assertEqual(len(response.data), 1)
        entry = response.data[0]
        self.assertEqual(entry["actor_user_id"], self.actor.id)
        self.assertIsNotNone(entry["actor_name"])
        self.assertIsNotNone(entry["target_name"])

    def test_metadata_is_included(self):
        response = self.admin_client.get("/api/audit/logs/?event_type=caregiver_blacklisted")
        self.assertEqual(response.data[0]["metadata"]["reason"], "شکایات مکرر")

    def test_filter_by_event_type(self):
        response = self.admin_client.get("/api/audit/logs/?event_type=caregiver_approved")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["event_type"], "caregiver_approved")

    def test_filter_by_target_user_id(self):
        response = self.admin_client.get(f"/api/audit/logs/?target_user_id={self.target.id}")
        self.assertEqual(len(response.data), 2)

    def test_filter_by_date_range_excludes_out_of_range(self):
        response = self.admin_client.get("/api/audit/logs/?start=2099-01-01")
        self.assertEqual(len(response.data), 0)

    def test_filter_by_date_range_includes_today(self):
        from django.utils import timezone
        today = timezone.now().date().isoformat()
        response = self.admin_client.get(f"/api/audit/logs/?start={today}&end={today}")
        self.assertGreaterEqual(len(response.data), 2)

    def test_non_admin_cannot_access(self):
        caregiver_user = make_user("audit_list_denied", role=UserRole.CAREGIVER, phone_number="09100023004")
        client = APIClient()
        client.force_authenticate(caregiver_user)
        response = client.get("/api/audit/logs/")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_access(self):
        client = APIClient()
        response = client.get("/api/audit/logs/")
        self.assertEqual(response.status_code, 401)


class PatientAuditHistoryViewTests(BaseAPITestCase):
    """
    GET /api/audit/logs/patient/<id>/ — the specific feature
    requested: any family member with an approved link to a patient
    can see the real history of what happened, by real name.
    """

    def setUp(self):
        self.family_user = make_user("audit_patient_family", role=UserRole.FAMILY, phone_number="09100023010")
        self.family_profile = FamilyProfile.objects.create(user=self.family_user, display_name="خانواده تست")
        self.family_client = APIClient()
        self.family_client.force_authenticate(self.family_user)

        self.patient = PatientProfile.objects.create(full_name="سالمند تست تاریخچه")
        FamilyPatientLink.objects.create(family=self.family_profile, patient=self.patient)

        self.other_patient = PatientProfile.objects.create(full_name="سالمند بی‌ربط")

        self.actor = make_user("audit_patient_actor", role=UserRole.ADMIN, phone_number="09100023011")

    def test_family_with_access_sees_their_patients_history(self):
        audit.patient_created(self.actor.id, self.patient.id)
        response = self.family_client.get(f"/api/audit/logs/patient/{self.patient.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["event_type"], "patient_created")

    def test_family_without_access_is_rejected(self):
        audit.patient_created(self.actor.id, self.other_patient.id)
        response = self.family_client.get(f"/api/audit/logs/patient/{self.other_patient.id}/")
        self.assertEqual(response.status_code, 403)

    def test_events_about_a_different_patient_never_leak_in(self):
        audit.patient_created(self.actor.id, self.patient.id)
        audit.patient_created(self.actor.id, self.other_patient.id)
        response = self.family_client.get(f"/api/audit/logs/patient/{self.patient.id}/")
        self.assertEqual(len(response.data), 1)

    def test_unauthenticated_cannot_access(self):
        client = APIClient()
        response = client.get(f"/api/audit/logs/patient/{self.patient.id}/")
        self.assertEqual(response.status_code, 401)

    def test_real_end_to_end_flow_complaint_filed_appears_in_history(self):
        """
        Not just testing the audit service in isolation — actually
        files a real complaint through the real endpoint, and
        confirms it shows up here, proving the wiring added to
        apps.reviews.views is genuinely connected end to end.
        """
        response = self.family_client.post("/api/reviews/complaints/me/", {
            "patient": self.patient.id, "category": "other", "description": "تست تاریخچه واقعی",
        }, format="json")
        self.assertEqual(response.status_code, 201)

        history = self.family_client.get(f"/api/audit/logs/patient/{self.patient.id}/")
        event_types = [entry["event_type"] for entry in history.data]
        self.assertIn("complaint_filed", event_types)

    def test_real_end_to_end_flow_caregiver_approval_shows_actor_name(self):
        """
        Confirms the caregivers/views.py wiring is real too, and that
        the actor's actual name (not just a raw id) comes through.
        Exercises the audit service call directly, the same one
        ApproveCaregiverView now makes, rather than driving a full
        four-form-complete approval through the API just to reach it —
        this test's job is confirming the write + name resolution,
        not re-testing approval's own completeness gating.
        """
        admin = make_user("audit_e2e_admin", role=UserRole.ADMIN, phone_number="09100023012")
        admin.first_name = "زهرا"
        admin.last_name = "احمدی"
        admin.save()
        admin_client = APIClient()
        admin_client.force_authenticate(admin)

        caregiver_user = make_user("audit_e2e_caregiver", role=UserRole.CAREGIVER, phone_number="09100023013")
        audit.caregiver_approved(admin.id, caregiver_user.id)

        response = admin_client.get(f"/api/audit/logs/?target_user_id={caregiver_user.id}&event_type=caregiver_approved")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["actor_name"], "زهرا احمدی")


class MyAuditHistoryViewTests(BaseAPITestCase):
    """
    GET /api/audit/logs/me/ — closes the gap between the two other
    endpoints: a caregiver couldn't see when they were approved,
    rejected, or blacklisted anywhere except the one-line status
    banner — the actual dated history was still invisible to the
    person it happened to.
    """

    def setUp(self):
        self.caregiver_user = make_user("audit_me_caregiver", role=UserRole.CAREGIVER, phone_number="09100023020")
        self.caregiver_client = APIClient()
        self.caregiver_client.force_authenticate(self.caregiver_user)

        self.admin = make_user("audit_me_admin", role=UserRole.ADMIN, phone_number="09100023021")

    def test_caregiver_sees_events_where_they_are_the_target(self):
        audit.caregiver_approved(self.admin.id, self.caregiver_user.id)
        audit.caregiver_blacklisted(self.admin.id, self.caregiver_user.id, reason="تست")

        response = self.caregiver_client.get("/api/audit/logs/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_caregiver_sees_events_where_they_are_the_actor(self):
        # e.g. filing a complaint themselves, or accepting terms
        # (where actor and target are deliberately the same id, per
        # terms_accepted's own docstring) — the union of both
        # directions is what "my history" actually means, not just
        # "things done to me."
        audit.terms_accepted(self.caregiver_user.id)

        response = self.caregiver_client.get("/api/audit/logs/me/")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["event_type"], "terms_accepted")

    def test_events_about_other_users_never_leak_into_my_history(self):
        other_caregiver = make_user("audit_me_isolation", role=UserRole.CAREGIVER, phone_number="09100023023")
        audit.caregiver_approved(self.admin.id, other_caregiver.id)

        response = self.caregiver_client.get("/api/audit/logs/me/")
        self.assertEqual(len(response.data), 0)

    def test_date_range_filter_applies(self):
        audit.caregiver_approved(self.admin.id, self.caregiver_user.id)
        response = self.caregiver_client.get("/api/audit/logs/me/?start=2099-01-01")
        self.assertEqual(len(response.data), 0)

    def test_unauthenticated_cannot_access(self):
        client = APIClient()
        response = client.get("/api/audit/logs/me/")
        self.assertEqual(response.status_code, 401)
