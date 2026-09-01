from unittest.mock import patch

from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.care.models import AssignmentStatus, CaregiverAssignment
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from apps.families.models import PatientProfile
from apps.reviews.models import CaregiverNoteAboutPatient, PatientNoteCategory
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class PatientNoteFilingTests(BaseAPITestCase):
    def setUp(self):
        self.caregiver_user = make_user("note_caregiver", role=UserRole.CAREGIVER, phone_number="09100021001")
        self.caregiver_profile = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.APPROVED)
        self.caregiver_client = APIClient()
        self.caregiver_client.force_authenticate(self.caregiver_user)

        self.patient = PatientProfile.objects.create(full_name="سالمند تست یادداشت")
        CaregiverAssignment.objects.create(caregiver=self.caregiver_profile, patient=self.patient, status=AssignmentStatus.ACTIVE)

        self.family_user = make_user("note_family", role=UserRole.FAMILY, phone_number="09100021002")
        self.family_client = APIClient()
        self.family_client.force_authenticate(self.family_user)

    def test_caregiver_can_write_a_note_about_an_assigned_patient(self):
        response = self.caregiver_client.post("/api/reviews/patient-notes/me/", {
            "patient": self.patient.id,
            "category": PatientNoteCategory.ADDITIONAL_NEEDS,
            "note": "سالمند به کمک بیشتری در حرکت نیاز دارد که در پرونده ذکر نشده بود.",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        note = CaregiverNoteAboutPatient.objects.get(id=response.data["id"])
        self.assertEqual(note.caregiver, self.caregiver_profile)

    def test_caregiver_cannot_write_note_about_unassigned_patient(self):
        other_patient = PatientProfile.objects.create(full_name="سالمند بی‌ربط")
        response = self.caregiver_client.post("/api/reviews/patient-notes/me/", {
            "patient": other_patient.id,
            "category": PatientNoteCategory.OTHER,
            "note": "تست دسترسی غیرمجاز",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(CaregiverNoteAboutPatient.objects.filter(patient=other_patient).exists())

    def test_ended_assignment_still_allows_writing_a_note(self):
        # A caregiver reflecting after handoff is a legitimate case,
        # not just ongoing care — deliberately more permissive than
        # requiring an ACTIVE assignment specifically.
        ended_patient = PatientProfile.objects.create(full_name="سالمند پایان‌یافته")
        CaregiverAssignment.objects.create(
            caregiver=self.caregiver_profile, patient=ended_patient, status=AssignmentStatus.ENDED,
        )
        response = self.caregiver_client.post("/api/reviews/patient-notes/me/", {
            "patient": ended_patient.id,
            "category": PatientNoteCategory.GENERAL_OBSERVATION,
            "note": "یادداشت پس از پایان همکاری",
        }, format="json")
        self.assertEqual(response.status_code, 201)

    def test_flagged_urgent_defaults_to_false(self):
        response = self.caregiver_client.post("/api/reviews/patient-notes/me/", {
            "patient": self.patient.id, "category": PatientNoteCategory.OTHER, "note": "test",
        }, format="json")
        self.assertFalse(response.data["flagged_urgent"])

    def test_can_set_flagged_urgent_true(self):
        response = self.caregiver_client.post("/api/reviews/patient-notes/me/", {
            "patient": self.patient.id, "category": PatientNoteCategory.SAFETY_CONCERN,
            "note": "نگرانی فوری", "flagged_urgent": True,
        }, format="json")
        self.assertTrue(response.data["flagged_urgent"])

    def test_family_cannot_write_a_patient_note(self):
        response = self.family_client.post("/api/reviews/patient-notes/me/", {
            "patient": self.patient.id, "category": PatientNoteCategory.OTHER, "note": "test",
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_write(self):
        client = APIClient()
        response = client.post("/api/reviews/patient-notes/me/", {
            "patient": self.patient.id, "category": PatientNoteCategory.OTHER, "note": "test",
        }, format="json")
        self.assertEqual(response.status_code, 401)

    def test_caregiver_sees_only_their_own_notes(self):
        self.caregiver_client.post("/api/reviews/patient-notes/me/", {
            "patient": self.patient.id, "category": PatientNoteCategory.OTHER, "note": "یادداشت اول",
        }, format="json")

        other_caregiver_user = make_user("note_other_caregiver", role=UserRole.CAREGIVER, phone_number="09100021003")
        other_caregiver_profile = CaregiverProfile.objects.create(user=other_caregiver_user, status=CaregiverStatus.APPROVED)
        CaregiverAssignment.objects.create(caregiver=other_caregiver_profile, patient=self.patient, status=AssignmentStatus.ACTIVE)
        other_client = APIClient()
        other_client.force_authenticate(other_caregiver_user)
        other_client.post("/api/reviews/patient-notes/me/", {
            "patient": self.patient.id, "category": PatientNoteCategory.OTHER, "note": "یادداشت دوم",
        }, format="json")

        response = self.caregiver_client.get("/api/reviews/patient-notes/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)


class PatientNoteStaffReviewTests(BaseAPITestCase):
    """
    Confirms the family cannot see these notes at all — the core
    reasoning for why this feature exists as staff-only, distinct
    from Complaint which the family itself files and can see.
    """

    def setUp(self):
        self.admin = make_user("note_review_admin", role=UserRole.ADMIN, phone_number="09100021010")
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)

        caregiver_user = make_user("note_review_caregiver", role=UserRole.CAREGIVER, phone_number="09100021011")
        self.caregiver_profile = CaregiverProfile.objects.create(user=caregiver_user, status=CaregiverStatus.APPROVED)
        self.patient = PatientProfile.objects.create(full_name="سالمند بازبینی یادداشت")
        CaregiverAssignment.objects.create(caregiver=self.caregiver_profile, patient=self.patient, status=AssignmentStatus.ACTIVE)

        self.urgent_note = CaregiverNoteAboutPatient.objects.create(
            caregiver=self.caregiver_profile, patient=self.patient,
            category=PatientNoteCategory.SAFETY_CONCERN, note="نگرانی فوری", flagged_urgent=True,
        )
        self.routine_note = CaregiverNoteAboutPatient.objects.create(
            caregiver=self.caregiver_profile, patient=self.patient,
            category=PatientNoteCategory.GENERAL_OBSERVATION, note="مشاهده روتین",
        )

    def test_admin_can_list_all_notes(self):
        response = self.admin_client.get("/api/reviews/patient-notes/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    def test_admin_can_filter_by_flagged_urgent(self):
        response = self.admin_client.get("/api/reviews/patient-notes/?flagged_urgent=true")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.urgent_note.id)

    def test_admin_can_filter_by_unacknowledged(self):
        self.urgent_note.acknowledge(self.admin)
        response = self.admin_client.get("/api/reviews/patient-notes/?unacknowledged=true")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.routine_note.id)

    def test_admin_can_view_detail(self):
        response = self.admin_client.get(f"/api/reviews/patient-notes/{self.urgent_note.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["note"], "نگرانی فوری")

    def test_acknowledge_sets_acknowledger_and_timestamp(self):
        response = self.admin_client.post(f"/api/reviews/patient-notes/{self.urgent_note.id}/acknowledge/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.data["acknowledged_at"])

        self.urgent_note.refresh_from_db()
        self.assertEqual(self.urgent_note.acknowledged_by, self.admin)

    def test_nonexistent_note_returns_404(self):
        response = self.admin_client.get("/api/reviews/patient-notes/999999/")
        self.assertEqual(response.status_code, 404)

    def test_family_cannot_access_patient_notes_at_all(self):
        # The whole point of this feature — a note about "family
        # behavior" must never be reachable by the family themselves,
        # through any endpoint.
        family_user = make_user("note_review_family_denied", role=UserRole.FAMILY, phone_number="09100021012")
        client = APIClient()
        client.force_authenticate(family_user)
        list_response = client.get("/api/reviews/patient-notes/")
        detail_response = client.get(f"/api/reviews/patient-notes/{self.urgent_note.id}/")
        self.assertEqual(list_response.status_code, 403)
        self.assertEqual(detail_response.status_code, 403)

    def test_caregiver_cannot_access_staff_review_endpoints(self):
        caregiver_user = make_user("note_review_caregiver_denied", role=UserRole.CAREGIVER, phone_number="09100021013")
        client = APIClient()
        client.force_authenticate(caregiver_user)
        response = client.get("/api/reviews/patient-notes/")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_access_staff_endpoints(self):
        client = APIClient()
        response = client.get("/api/reviews/patient-notes/")
        self.assertEqual(response.status_code, 401)

    def test_superuser_can_also_review(self):
        superuser = make_user("note_review_superuser", role=UserRole.SUPERUSER, phone_number="09100021014")
        client = APIClient()
        client.force_authenticate(superuser)
        response = client.post(f"/api/reviews/patient-notes/{self.routine_note.id}/acknowledge/")
        self.assertEqual(response.status_code, 200)


class UrgentNoteSmsAlertTests(BaseAPITestCase):
    """
    Per an explicit product decision: urgent items can't rely on
    someone happening to check a dashboard. Confirms flagging a note
    urgent actually queues an SMS to every admin/superuser account,
    a routine note doesn't, and a queueing failure never blocks the
    note itself from being saved.
    """

    def setUp(self):
        self.caregiver_user = make_user("urgent_sms_caregiver", role=UserRole.CAREGIVER, phone_number="09100021020")
        self.caregiver_profile = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.APPROVED)
        self.caregiver_client = APIClient()
        self.caregiver_client.force_authenticate(self.caregiver_user)

        self.patient = PatientProfile.objects.create(full_name="سالمند تست هشدار فوری")
        CaregiverAssignment.objects.create(caregiver=self.caregiver_profile, patient=self.patient, status=AssignmentStatus.ACTIVE)

        self.admin1 = make_user("urgent_sms_admin1", role=UserRole.ADMIN, phone_number="09100021021")
        self.admin2 = make_user("urgent_sms_admin2", role=UserRole.SUPERUSER, phone_number="09100021022")

    @patch("apps.reviews.views.send_urgent_alert_sms")
    def test_urgent_note_queues_sms_to_every_admin_and_superuser(self, mock_sms):
        response = self.caregiver_client.post("/api/reviews/patient-notes/me/", {
            "patient": self.patient.id, "category": PatientNoteCategory.SAFETY_CONCERN,
            "note": "نگرانی فوری", "flagged_urgent": True,
        }, format="json")
        self.assertEqual(response.status_code, 201)

        called_phones = {call.args[0] for call in mock_sms.delay.call_args_list}
        self.assertEqual(called_phones, {"09100021021", "09100021022"})

    @patch("apps.reviews.views.send_urgent_alert_sms")
    def test_routine_note_does_not_queue_any_sms(self, mock_sms):
        response = self.caregiver_client.post("/api/reviews/patient-notes/me/", {
            "patient": self.patient.id, "category": PatientNoteCategory.OTHER, "note": "مشاهده عادی",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        mock_sms.delay.assert_not_called()

    @patch("apps.reviews.views.send_urgent_alert_sms")
    def test_message_includes_caregiver_and_patient_name(self, mock_sms):
        self.caregiver_client.post("/api/reviews/patient-notes/me/", {
            "patient": self.patient.id, "category": PatientNoteCategory.SAFETY_CONCERN,
            "note": "نگرانی فوری", "flagged_urgent": True,
        }, format="json")
        message = mock_sms.delay.call_args_list[0].args[1]
        self.assertIn("سالمند تست هشدار فوری", message)

    @patch("apps.reviews.views.send_urgent_alert_sms")
    def test_sms_queueing_failure_never_blocks_note_creation(self, mock_sms):
        mock_sms.delay.side_effect = Exception("broker unavailable")
        response = self.caregiver_client.post("/api/reviews/patient-notes/me/", {
            "patient": self.patient.id, "category": PatientNoteCategory.SAFETY_CONCERN,
            "note": "نگرانی فوری", "flagged_urgent": True,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(CaregiverNoteAboutPatient.objects.filter(id=response.data["id"]).exists())
