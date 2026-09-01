import io

from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from apps.families.models import FamilyPatientLink, FamilyProfile, PatientProfile
from apps.reviews.models import MAX_VOICE_NOTE_SIZE_BYTES, Complaint, ComplaintCategory
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class ComplaintFilingTests(BaseAPITestCase):
    def setUp(self):
        self.family_user = make_user("complaint_family", role=UserRole.FAMILY, phone_number="09100020001")
        self.family_profile = FamilyProfile.objects.create(user=self.family_user, display_name="خانواده تست")
        self.family_client = APIClient()
        self.family_client.force_authenticate(self.family_user)

        self.patient = PatientProfile.objects.create(full_name="سالمند تست شکایت")
        FamilyPatientLink.objects.create(family=self.family_profile, patient=self.patient)

        self.caregiver_user = make_user("complaint_caregiver", role=UserRole.CAREGIVER, phone_number="09100020002")
        self.caregiver_profile = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.APPROVED)
        self.caregiver_client = APIClient()
        self.caregiver_client.force_authenticate(self.caregiver_user)

    def test_family_can_file_a_complaint_about_their_own_patient(self):
        response = self.family_client.post("/api/reviews/complaints/me/", {
            "patient": self.patient.id,
            "about_caregiver": self.caregiver_profile.id,
            "category": ComplaintCategory.BEHAVIOR,
            "description": "مراقب دیر سر کار حاضر شد.",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "open")

        complaint = Complaint.objects.get(id=response.data["id"])
        self.assertEqual(complaint.filed_by, self.family_user)
        self.assertEqual(complaint.patient, self.patient)

    def test_family_cannot_file_complaint_about_a_patient_they_have_no_access_to(self):
        other_patient = PatientProfile.objects.create(full_name="سالمند بی‌ربط")
        response = self.family_client.post("/api/reviews/complaints/me/", {
            "patient": other_patient.id,
            "category": ComplaintCategory.OTHER,
            "description": "تست دسترسی غیرمجاز",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Complaint.objects.filter(patient=other_patient).exists())

    def test_about_caregiver_is_optional(self):
        response = self.family_client.post("/api/reviews/complaints/me/", {
            "patient": self.patient.id,
            "category": ComplaintCategory.SAFETY_CONCERN,
            "description": "نگرانی بدون مشخص کردن مراقب خاص",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["caregiver_name"])

    def test_voice_note_upload_succeeds_with_allowed_extension(self):
        fake_audio = io.BytesIO(b"fake audio content")
        fake_audio.name = "complaint.mp3"
        response = self.family_client.post("/api/reviews/complaints/me/", {
            "patient": self.patient.id,
            "category": ComplaintCategory.BEHAVIOR,
            "description": "شکایت صوتی",
            "voice_note": fake_audio,
        }, format="multipart")
        self.assertEqual(response.status_code, 201)
        complaint = Complaint.objects.get(id=response.data["id"])
        self.assertTrue(complaint.voice_note.name.endswith(".mp3"))

    def test_voice_note_upload_rejected_for_disallowed_extension(self):
        fake_file = io.BytesIO(b"not audio")
        fake_file.name = "complaint.exe"
        response = self.family_client.post("/api/reviews/complaints/me/", {
            "patient": self.patient.id,
            "category": ComplaintCategory.OTHER,
            "description": "تست فرمت نامعتبر",
            "voice_note": fake_file,
        }, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_voice_note_rejected_when_too_large(self):
        oversized = io.BytesIO(b"x" * (MAX_VOICE_NOTE_SIZE_BYTES + 1))
        oversized.name = "big.mp3"
        response = self.family_client.post("/api/reviews/complaints/me/", {
            "patient": self.patient.id,
            "category": ComplaintCategory.OTHER,
            "description": "تست حجم زیاد",
            "voice_note": oversized,
        }, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_missing_description_rejected(self):
        response = self.family_client.post("/api/reviews/complaints/me/", {
            "patient": self.patient.id,
            "category": ComplaintCategory.OTHER,
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_non_family_role_cannot_file_a_complaint(self):
        response = self.caregiver_client.post("/api/reviews/complaints/me/", {
            "patient": self.patient.id, "category": ComplaintCategory.OTHER, "description": "test",
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_file(self):
        client = APIClient()
        response = client.post("/api/reviews/complaints/me/", {
            "patient": self.patient.id, "category": ComplaintCategory.OTHER, "description": "test",
        }, format="json")
        self.assertEqual(response.status_code, 401)

    def test_family_sees_only_their_own_complaints(self):
        self.family_client.post("/api/reviews/complaints/me/", {
            "patient": self.patient.id, "category": ComplaintCategory.OTHER, "description": "شکایت اول",
        }, format="json")

        other_family_user = make_user("complaint_other_family", role=UserRole.FAMILY, phone_number="09100020003")
        other_family_profile = FamilyProfile.objects.create(user=other_family_user, display_name="خانواده دیگر")
        other_patient = PatientProfile.objects.create(full_name="سالمند دوم")
        FamilyPatientLink.objects.create(family=other_family_profile, patient=other_patient)
        other_client = APIClient()
        other_client.force_authenticate(other_family_user)
        other_client.post("/api/reviews/complaints/me/", {
            "patient": other_patient.id, "category": ComplaintCategory.OTHER, "description": "شکایت دوم",
        }, format="json")

        response = self.family_client.get("/api/reviews/complaints/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_list_view_does_not_include_full_description(self):
        # The list endpoint is deliberately a summary (category/status/
        # who/when) — the full text only shows on the detail view, same
        # convention as the caregiver list vs. full-profile split
        # elsewhere in this codebase.
        self.family_client.post("/api/reviews/complaints/me/", {
            "patient": self.patient.id, "category": ComplaintCategory.OTHER, "description": "متن کامل شکایت",
        }, format="json")
        response = self.family_client.get("/api/reviews/complaints/me/")
        self.assertNotIn("description", response.data[0])


class ComplaintReviewTests(BaseAPITestCase):
    """Staff-side review workflow — list, detail, resolve, dismiss."""

    def setUp(self):
        self.admin = make_user("complaint_admin", role=UserRole.ADMIN, phone_number="09100020010")
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)

        family_user = make_user("complaint_review_family", role=UserRole.FAMILY, phone_number="09100020011")
        family_profile = FamilyProfile.objects.create(user=family_user, display_name="خانواده")
        self.patient = PatientProfile.objects.create(full_name="سالمند بازبینی")
        FamilyPatientLink.objects.create(family=family_profile, patient=self.patient)

        self.complaint = Complaint.objects.create(
            filed_by=family_user, patient=self.patient,
            category=ComplaintCategory.SERVICE_QUALITY, description="شکایت تست بازبینی",
        )

    def test_admin_can_list_all_complaints(self):
        response = self.admin_client.get("/api/reviews/complaints/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_admin_can_filter_by_status(self):
        response = self.admin_client.get("/api/reviews/complaints/?status=open")
        self.assertEqual(len(response.data), 1)
        response = self.admin_client.get("/api/reviews/complaints/?status=resolved")
        self.assertEqual(len(response.data), 0)

    def test_admin_can_filter_by_about_caregiver(self):
        # The whole reason this filter exists: connecting complaint
        # history to the caregiver approval/review workflow, so an
        # admin deciding whether to approve or blacklist someone can
        # actually see complaints filed about them.
        from apps.caregivers.models import CaregiverProfile, CaregiverStatus
        caregiver_user = make_user("complaint_filter_caregiver", role=UserRole.CAREGIVER, phone_number="09100020020")
        caregiver_profile = CaregiverProfile.objects.create(user=caregiver_user, status=CaregiverStatus.APPROVED)
        Complaint.objects.create(
            filed_by=self.complaint.filed_by, patient=self.patient, about_caregiver=caregiver_profile,
            category=ComplaintCategory.BEHAVIOR, description="شکایت درباره این مراقب خاص",
        )

        response = self.admin_client.get(f"/api/reviews/complaints/?about_caregiver={caregiver_user.id}")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["caregiver_name"], caregiver_user.username)

        # The original complaint (no about_caregiver set) must not
        # leak into a filter for a specific, unrelated caregiver.
        other_caregiver_user = make_user("complaint_filter_other", role=UserRole.CAREGIVER, phone_number="09100020021")
        response = self.admin_client.get(f"/api/reviews/complaints/?about_caregiver={other_caregiver_user.id}")
        self.assertEqual(len(response.data), 0)

    def test_admin_can_view_complaint_detail(self):
        response = self.admin_client.get(f"/api/reviews/complaints/{self.complaint.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["description"], "شکایت تست بازبینی")

    def test_nonexistent_complaint_detail_returns_404(self):
        response = self.admin_client.get("/api/reviews/complaints/999999/")
        self.assertEqual(response.status_code, 404)

    def test_mark_under_review(self):
        response = self.admin_client.post(f"/api/reviews/complaints/{self.complaint.id}/under-review/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "under_review")

    def test_resolve_sets_resolver_and_timestamp(self):
        response = self.admin_client.post(
            f"/api/reviews/complaints/{self.complaint.id}/resolve/", {"note": "با مراقب صحبت شد."}, format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "resolved")
        self.assertEqual(response.data["resolution_note"], "با مراقب صحبت شد.")
        self.assertIsNotNone(response.data["resolved_at"])

        self.complaint.refresh_from_db()
        self.assertEqual(self.complaint.resolved_by, self.admin)

    def test_dismiss_sets_resolver_and_timestamp(self):
        response = self.admin_client.post(
            f"/api/reviews/complaints/{self.complaint.id}/dismiss/", {"note": "شواهد کافی نبود."}, format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "dismissed")

    def test_resolve_note_is_optional(self):
        response = self.admin_client.post(f"/api/reviews/complaints/{self.complaint.id}/resolve/", {}, format="json")
        self.assertEqual(response.status_code, 200)

    def test_family_cannot_access_staff_review_endpoints(self):
        family_user = make_user("complaint_review_denied", role=UserRole.FAMILY, phone_number="09100020012")
        client = APIClient()
        client.force_authenticate(family_user)
        response = client.get("/api/reviews/complaints/")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_access_staff_endpoints(self):
        client = APIClient()
        response = client.get("/api/reviews/complaints/")
        self.assertEqual(response.status_code, 401)

    def test_superuser_can_also_review(self):
        superuser = make_user("complaint_review_superuser", role=UserRole.SUPERUSER, phone_number="09100020013")
        client = APIClient()
        client.force_authenticate(superuser)
        response = client.post(f"/api/reviews/complaints/{self.complaint.id}/resolve/", {}, format="json")
        self.assertEqual(response.status_code, 200)
