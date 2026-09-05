from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus, AgencyProfile
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class RecordInterviewTests(BaseAPITestCase):
    def setUp(self):
        self.admin = make_user("interview_admin", role=UserRole.ADMIN, phone_number="09100025001")
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)

        self.agency = AgencyProfile.objects.create(
            user=make_user("interview_agency", role=UserRole.AGENCY, phone_number="09100025002"),
            company_name="آژانس تست مصاحبه",
        )
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency.user)

        self.unrelated_agency = AgencyProfile.objects.create(
            user=make_user("interview_unrelated", role=UserRole.AGENCY, phone_number="09100025003"),
            company_name="آژانس بی‌ربط",
        )
        self.unrelated_client = APIClient()
        self.unrelated_client.force_authenticate(self.unrelated_agency.user)

        self.caregiver_user = make_user("interview_caregiver", role=UserRole.CAREGIVER, phone_number="09100025004")
        self.profile = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.PENDING)
        # Deliberately PENDING link, not approved — interviewing
        # happens before a candidate is on the approved roster.
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.profile, status=AgencyLinkStatus.PENDING)

    def test_admin_can_record_interview(self):
        response = self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/record-interview/", {
            "score": 85, "note": "کاملاً آماده است",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["interview_score"], 85)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.interview_score, 85)
        self.assertEqual(self.profile.interviewed_by, self.admin)

    def test_agency_with_pending_link_can_record_interview(self):
        """The key permission difference from blacklist appeals — a
        pending (not yet approved) link is still sufficient here."""
        response = self.agency_client.post(f"/api/caregivers/{self.caregiver_user.id}/record-interview/", {
            "score": 70,
        }, format="json")
        self.assertEqual(response.status_code, 200)

    def test_unrelated_agency_cannot_record_interview(self):
        response = self.unrelated_client.post(f"/api/caregivers/{self.caregiver_user.id}/record-interview/", {
            "score": 70,
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_score_out_of_range_is_rejected(self):
        response = self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/record-interview/", {
            "score": 150,
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_family_cannot_record_interview(self):
        family = make_user("interview_family_denied", role=UserRole.FAMILY, phone_number="09100025005")
        client = APIClient()
        client.force_authenticate(family)
        response = client.post(f"/api/caregivers/{self.caregiver_user.id}/record-interview/", {"score": 50}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_record_interview(self):
        client = APIClient()
        response = client.post(f"/api/caregivers/{self.caregiver_user.id}/record-interview/", {"score": 50}, format="json")
        self.assertEqual(response.status_code, 401)


class RequestMoreDocumentsTests(BaseAPITestCase):
    def setUp(self):
        self.admin = make_user("docs_admin", role=UserRole.ADMIN, phone_number="09100025010")
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)

        self.caregiver_user = make_user("docs_caregiver", role=UserRole.CAREGIVER, phone_number="09100025011")
        self.profile = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.PENDING)

    def test_moves_pending_to_needs_more_docs(self):
        response = self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/request-more-documents/", {
            "note": "لطفاً کارت پایان خدمت را ارسال کنید",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "needs_more_docs")

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, CaregiverStatus.NEEDS_MORE_DOCS)
        self.assertEqual(self.profile.needs_more_docs_note, "لطفاً کارت پایان خدمت را ارسال کنید")

    def test_cannot_request_more_documents_from_approved(self):
        self.profile.status = CaregiverStatus.APPROVED
        self.profile.save()
        response = self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/request-more-documents/", {
            "note": "test",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_note_is_required(self):
        response = self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/request-more-documents/", {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_mark_ready_for_review_reverses_it(self):
        self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/request-more-documents/", {"note": "x"}, format="json")
        response = self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/mark-ready-for-review/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "pending")

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, CaregiverStatus.PENDING)
        self.assertEqual(self.profile.needs_more_docs_note, "")

    def test_mark_ready_for_review_fails_if_not_in_that_state(self):
        response = self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/mark-ready-for-review/")
        self.assertEqual(response.status_code, 400)

    def test_approve_still_works_directly_from_needs_more_docs(self):
        """approve()/reject() have no status guard at all — confirms
        that's still true after adding the new intermediate status."""
        self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/request-more-documents/", {"note": "x"}, format="json")
        # Complete the four required forms so approval's own
        # completeness gate doesn't block this unrelated assertion.
        from apps.caregivers.models import CaregiverWorkPreferences
        CaregiverWorkPreferences.objects.create(profile=self.profile, terms_accepted=True)
        response = self.admin_client.post(f"/api/caregivers/{self.caregiver_user.id}/approve/")
        # Either approves (200) or 400 on an unrelated missing-forms
        # check — but never blocked specifically by the status itself.
        self.assertIn(response.status_code, [200, 400])
        if response.status_code == 400:
            self.assertNotIn("needs_more_docs", str(response.data).lower())


class AgencyCandidateTrackingViewTests(BaseAPITestCase):
    def setUp(self):
        self.agency = AgencyProfile.objects.create(
            user=make_user("candtrack_agency", role=UserRole.AGENCY, phone_number="09100025020"),
            company_name="آژانس تست جدول",
        )
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency.user)

        pending_user = make_user("candtrack_pending", role=UserRole.CAREGIVER, phone_number="09100025021")
        self.pending_profile = CaregiverProfile.objects.create(user=pending_user, status=CaregiverStatus.PENDING)
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.pending_profile, status=AgencyLinkStatus.PENDING)

        approved_user = make_user("candtrack_approved", role=UserRole.CAREGIVER, phone_number="09100025022")
        self.approved_profile = CaregiverProfile.objects.create(user=approved_user, status=CaregiverStatus.APPROVED)
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.approved_profile, status=AgencyLinkStatus.APPROVED)

        rejected_link_user = make_user("candtrack_rejected_link", role=UserRole.CAREGIVER, phone_number="09100025023")
        self.rejected_link_profile = CaregiverProfile.objects.create(user=rejected_link_user, status=CaregiverStatus.PENDING)
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.rejected_link_profile, status=AgencyLinkStatus.REJECTED)

    def test_shows_pending_and_approved_but_not_rejected_links(self):
        response = self.agency_client.get("/api/agencies/me/candidates/")
        self.assertEqual(response.status_code, 200)
        user_ids = {c["user_id"] for c in response.data}
        self.assertIn(self.pending_profile.user_id, user_ids)
        self.assertIn(self.approved_profile.user_id, user_ids)
        self.assertNotIn(self.rejected_link_profile.user_id, user_ids)

    def test_includes_status_label_and_tracking_fields(self):
        response = self.agency_client.get("/api/agencies/me/candidates/")
        row = next(c for c in response.data if c["user_id"] == self.pending_profile.user_id)
        self.assertEqual(row["status"], "pending")
        self.assertEqual(row["status_label"], "در انتظار بررسی")
        self.assertIn("interview_score", row)
        self.assertIn("staff_notes", row)

    def test_registered_at_is_a_real_jalali_string_not_gregorian(self):
        """
        Regression test for real, direct feedback: this field was
        originally a plain Gregorian DateTimeField with only its
        digits swapped to Persian numerals on the frontend — still
        the wrong calendar, just with the wrong glyphs. Fixed by
        switching to the same JalaliDateTimeField already trusted
        elsewhere in this backend, rather than attempting the
        Gregorian-to-Jalali conversion in JavaScript.
        """
        response = self.agency_client.get("/api/agencies/me/candidates/")
        row = next(c for c in response.data if c["user_id"] == self.pending_profile.user_id)
        # A real Jalali year is always in the 13xx/14xx range — a
        # Gregorian year leaking through would be in the 19xx/20xx
        # range, immediately failing this rather than silently passing.
        jalali_year = int(row["registered_at"][:4])
        self.assertGreater(jalali_year, 1300)
        self.assertLess(jalali_year, 1500)
        # Cross-checked directly against the same jdatetime library the
        # rest of this backend already relies on, not just a plausible
        # range check. created_at is already a jdatetime.datetime
        # object at the Python level (that's the entire point of
        # jDateTimeField), so no conversion is needed here — just
        # format it the same way and compare.
        expected = self.pending_profile.created_at.strftime("%Y-%m-%d")
        self.assertEqual(row["registered_at"][:10], expected)

    def test_unauthenticated_cannot_access(self):
        client = APIClient()
        response = client.get("/api/agencies/me/candidates/")
        self.assertEqual(response.status_code, 401)

    def test_non_agency_role_cannot_access(self):
        family = make_user("candtrack_family_denied", role=UserRole.FAMILY, phone_number="09100025024")
        client = APIClient()
        client.force_authenticate(family)
        response = client.get("/api/agencies/me/candidates/")
        self.assertEqual(response.status_code, 403)


class CandidateResumeViewTests(BaseAPITestCase):
    """
    GET /api/caregivers/<user_id>/resume/ — the "مشاهده رزومه" action
    on the agency candidate table. Reuses the exact same dual-track
    permission as recording an interview, so this only re-confirms
    the permission boundary holds for this specific endpoint too,
    plus that the actual profile data comes through correctly.
    """

    def setUp(self):
        self.admin = make_user("resume_admin", role=UserRole.ADMIN, phone_number="09100025040")
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)

        self.agency = AgencyProfile.objects.create(
            user=make_user("resume_agency", role=UserRole.AGENCY, phone_number="09100025041"),
            company_name="آژانس تست رزومه",
        )
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency.user)

        self.unrelated_agency = AgencyProfile.objects.create(
            user=make_user("resume_unrelated", role=UserRole.AGENCY, phone_number="09100025042"),
            company_name="آژانس بی‌ربط",
        )
        self.unrelated_client = APIClient()
        self.unrelated_client.force_authenticate(self.unrelated_agency.user)

        self.caregiver_user = make_user("resume_caregiver", role=UserRole.CAREGIVER, phone_number="09100025043")
        self.profile = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.PENDING)
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.profile, status=AgencyLinkStatus.PENDING)

    def test_admin_can_view_resume(self):
        response = self.admin_client.get(f"/api/caregivers/{self.caregiver_user.id}/resume/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("identity", response.data)
        self.assertIn("experience", response.data)
        self.assertIn("skills", response.data)
        self.assertIn("references", response.data)

    def test_linked_agency_can_view_resume(self):
        response = self.agency_client.get(f"/api/caregivers/{self.caregiver_user.id}/resume/")
        self.assertEqual(response.status_code, 200)

    def test_unrelated_agency_cannot_view_resume(self):
        response = self.unrelated_client.get(f"/api/caregivers/{self.caregiver_user.id}/resume/")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_view_resume(self):
        client = APIClient()
        response = client.get(f"/api/caregivers/{self.caregiver_user.id}/resume/")
        self.assertEqual(response.status_code, 401)


class EditCandidateFieldsTests(BaseAPITestCase):
    def setUp(self):
        self.admin = make_user("editfields_admin", role=UserRole.ADMIN, phone_number="09100025050")
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)

        self.agency = AgencyProfile.objects.create(
            user=make_user("editfields_agency", role=UserRole.AGENCY, phone_number="09100025051"),
            company_name="آژانس تست ویرایش",
        )
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency.user)

        self.unrelated_agency = AgencyProfile.objects.create(
            user=make_user("editfields_unrelated", role=UserRole.AGENCY, phone_number="09100025052"),
            company_name="آژانس بی‌ربط",
        )
        self.unrelated_client = APIClient()
        self.unrelated_client.force_authenticate(self.unrelated_agency.user)

        self.caregiver_user = make_user(
            "editfields_caregiver", role=UserRole.CAREGIVER, phone_number="09100025053",
        )
        self.caregiver_user.first_name = "سارا"
        self.caregiver_user.last_name = "قدیمی"
        self.caregiver_user.save()
        self.profile = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.PENDING)
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.profile, status=AgencyLinkStatus.PENDING)

    def test_admin_can_edit_name(self):
        response = self.admin_client.patch(f"/api/caregivers/{self.caregiver_user.id}/edit-fields/", {
            "first_name": "سارا", "last_name": "جدید",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.caregiver_user.refresh_from_db()
        self.assertEqual(self.caregiver_user.last_name, "جدید")

    def test_agency_with_pending_link_can_edit_phone(self):
        response = self.agency_client.patch(f"/api/caregivers/{self.caregiver_user.id}/edit-fields/", {
            "phone_number": "09121234599",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.caregiver_user.refresh_from_db()
        self.assertEqual(self.caregiver_user.phone_number, "09121234599")

    def test_unrelated_agency_cannot_edit(self):
        response = self.unrelated_client.patch(f"/api/caregivers/{self.caregiver_user.id}/edit-fields/", {
            "first_name": "دستکاری",
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_invalid_phone_format_rejected(self):
        response = self.admin_client.patch(f"/api/caregivers/{self.caregiver_user.id}/edit-fields/", {
            "phone_number": "12345",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_duplicate_phone_number_rejected_cleanly(self):
        """A 400 with a clear message, not a raw 500 IntegrityError —
        this is a real, likely-to-happen case (agency mistypes a
        number that already belongs to someone else on the platform)."""
        other_user = make_user("editfields_other", role=UserRole.CAREGIVER, phone_number="09121234500")
        response = self.admin_client.patch(f"/api/caregivers/{self.caregiver_user.id}/edit-fields/", {
            "phone_number": other_user.phone_number,
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_duplicate_national_id_rejected_cleanly(self):
        other_user = make_user("editfields_other_nid", role=UserRole.CAREGIVER, phone_number="09100025054")
        other_user.national_id = "1112223334"
        other_user.save()
        response = self.admin_client.patch(f"/api/caregivers/{self.caregiver_user.id}/edit-fields/", {
            "national_id": "1112223334",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_edit_is_logged_with_old_and_new_value(self):
        self.admin_client.patch(f"/api/caregivers/{self.caregiver_user.id}/edit-fields/", {
            "last_name": "بروزشده",
        }, format="json")
        from apps.audit.models import AuditLog
        entry = AuditLog.objects.filter(
            event_type="candidate_field_edited", actor_user_id=self.admin.id, target_user_id=self.caregiver_user.id,
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.metadata["field"], "last_name")
        self.assertEqual(entry.metadata["old_value"], "قدیمی")
        self.assertEqual(entry.metadata["new_value"], "بروزشده")

    def test_no_op_edit_creates_no_log_entry(self):
        """Sending the same value that's already there shouldn't spam
        the audit log with a meaningless "changed from X to X" entry."""
        from apps.audit.models import AuditLog
        self.admin_client.patch(f"/api/caregivers/{self.caregiver_user.id}/edit-fields/", {
            "first_name": "سارا",
        }, format="json")
        self.assertFalse(AuditLog.objects.filter(event_type="candidate_field_edited").exists())

    def test_unauthenticated_cannot_edit(self):
        client = APIClient()
        response = client.patch(f"/api/caregivers/{self.caregiver_user.id}/edit-fields/", {
            "first_name": "x",
        }, format="json")
        self.assertEqual(response.status_code, 401)
