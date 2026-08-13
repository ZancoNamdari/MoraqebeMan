from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.authentication.services import SimpleJWTTokenIssuer
from apps.care.models import AssignmentStatus, CaregiverAssignment
from apps.caregivers.models import CaregiverProfile
from apps.families.models import FamilyProfile, PatientProfile


def _client_for(user):
    token = SimpleJWTTokenIssuer().issue(user)["access"]
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def _make_user(username, role, phone):
    user = User.objects.create(username=username, phone_number=phone, email=f"{username}@a.com", role=role, first_name="ت", last_name="خ")
    user.set_password("x")
    user.save()
    return user


class CaregiverAssignmentTests(TestCase):
    def setUp(self):
        self.supervisor = _make_user("sup1", UserRole.SUPERUSER, "09100000001")
        self.sup_client = _client_for(self.supervisor)

        self.caregiver_user = _make_user("cg1", UserRole.CAREGIVER, "09121110070")
        self.caregiver = CaregiverProfile.objects.create(user=self.caregiver_user)

        self.family_user = _make_user("fam1", UserRole.FAMILY, "09121110071")
        self.family_client = _client_for(self.family_user)
        self.family = FamilyProfile.objects.create(user=self.family_user, display_name="خانواده")
        self.patient = PatientProfile.objects.create(full_name="بیمار تست")
        from apps.families.models import FamilyPatientLink, LinkStatus
        FamilyPatientLink.objects.create(family=self.family, patient=self.patient, relation="فرزند", status=LinkStatus.APPROVED)

    def test_supervisor_assigns_caregiver_to_patient_by_code(self):
        response = self.sup_client.post("/api/care/assignments/", {
            "caregiver_user_id": self.caregiver_user.id, "patient_code": self.patient.access_code,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "active")
        self.assertEqual(CaregiverAssignment.objects.count(), 1)

    def test_assigning_same_pair_twice_while_active_rejected(self):
        self.sup_client.post("/api/care/assignments/", {
            "caregiver_user_id": self.caregiver_user.id, "patient_code": self.patient.access_code,
        }, format="json")
        response = self.sup_client.post("/api/care/assignments/", {
            "caregiver_user_id": self.caregiver_user.id, "patient_code": self.patient.access_code,
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_assigning_with_invalid_patient_code_rejected(self):
        response = self.sup_client.post("/api/care/assignments/", {
            "caregiver_user_id": self.caregiver_user.id, "patient_code": "ELD-ZZZZZZ",
        }, format="json")
        self.assertEqual(response.status_code, 404)

    def test_non_supervisor_cannot_assign(self):
        response = self.family_client.post("/api/care/assignments/", {
            "caregiver_user_id": self.caregiver_user.id, "patient_code": self.patient.access_code,
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_ending_an_assignment(self):
        create = self.sup_client.post("/api/care/assignments/", {
            "caregiver_user_id": self.caregiver_user.id, "patient_code": self.patient.access_code,
        }, format="json")
        assignment_id = create.data["id"]

        response = self.sup_client.post(f"/api/care/assignments/{assignment_id}/end/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ended")

    def test_can_reassign_after_ending(self):
        create = self.sup_client.post("/api/care/assignments/", {
            "caregiver_user_id": self.caregiver_user.id, "patient_code": self.patient.access_code,
        }, format="json")
        self.sup_client.post(f"/api/care/assignments/{create.data['id']}/end/")

        # a brand new active assignment for the same pair is fine once
        # the earlier one is ended, not blocked by the unique
        # constraint (which only blocks two simultaneously ACTIVE ones)
        response = self.sup_client.post("/api/care/assignments/", {
            "caregiver_user_id": self.caregiver_user.id, "patient_code": self.patient.access_code,
        }, format="json")
        self.assertEqual(response.status_code, 201)

    def test_assignment_writes_audit_entry(self):
        from apps.audit.models import AuditEventType, AuditLog
        self.sup_client.post("/api/care/assignments/", {
            "caregiver_user_id": self.caregiver_user.id, "patient_code": self.patient.access_code,
        }, format="json")
        entry = AuditLog.objects.filter(event_type=AuditEventType.CAREGIVER_ASSIGNED, target_user_id=self.caregiver_user.id).first()
        self.assertIsNotNone(entry)


class CareLogEntryTests(TestCase):
    def setUp(self):
        self.supervisor = _make_user("sup2", UserRole.SUPERUSER, "09100000002")
        self.caregiver_user = _make_user("cg2", UserRole.CAREGIVER, "09121110080")
        self.caregiver = CaregiverProfile.objects.create(user=self.caregiver_user)
        self.caregiver_client = _client_for(self.caregiver_user)

        self.family_user = _make_user("fam2", UserRole.FAMILY, "09121110081")
        self.family_client = _client_for(self.family_user)
        self.family = FamilyProfile.objects.create(user=self.family_user, display_name="خانواده")
        self.patient = PatientProfile.objects.create(full_name="بیمار دو")
        from apps.families.models import FamilyPatientLink, LinkStatus
        FamilyPatientLink.objects.create(family=self.family, patient=self.patient, relation="فرزند", status=LinkStatus.APPROVED)

        _client_for(self.supervisor).post("/api/care/assignments/", {
            "caregiver_user_id": self.caregiver_user.id, "patient_code": self.patient.access_code,
        }, format="json")

    def test_assigned_caregiver_can_submit_report(self):
        response = self.caregiver_client.post("/api/care/me/log-entries/", {
            "patient": self.patient.id, "category": "medication", "note": "دارو داده شد.",
        }, format="json")
        self.assertEqual(response.status_code, 201)

    def test_unassigned_caregiver_cannot_report(self):
        other_caregiver_user = _make_user("cg3", UserRole.CAREGIVER, "09121110082")
        CaregiverProfile.objects.create(user=other_caregiver_user)
        other_client = _client_for(other_caregiver_user)

        response = other_client.post("/api/care/me/log-entries/", {
            "patient": self.patient.id, "category": "general", "note": "تست",
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_family_sees_the_care_team(self):
        response = self.family_client.get(f"/api/care/patients/{self.patient.id}/team/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_family_sees_the_timeline(self):
        self.caregiver_client.post("/api/care/me/log-entries/", {
            "patient": self.patient.id, "category": "meal", "note": "ناهار میل شد.",
        }, format="json")
        response = self.family_client.get(f"/api/care/patients/{self.patient.id}/timeline/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["category"], "meal")

    def test_unrelated_family_cannot_see_timeline(self):
        stranger = _make_user("fam3", UserRole.FAMILY, "09121110083")
        stranger_client = _client_for(stranger)
        response = stranger_client.get(f"/api/care/patients/{self.patient.id}/timeline/")
        self.assertEqual(response.status_code, 404)

    def test_patient_can_see_own_timeline(self):
        patient_user = _make_user("pat1", UserRole.PATIENT, "09121110084")
        self.patient.user = patient_user
        self.patient.save(update_fields=["user"])
        patient_client = _client_for(patient_user)

        self.caregiver_client.post("/api/care/me/log-entries/", {
            "patient": self.patient.id, "category": "vitals", "note": "فشار خون طبیعی.",
        }, format="json")
        response = patient_client.get(f"/api/care/patients/{self.patient.id}/timeline/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_caregiver_lists_own_assigned_patients(self):
        response = self.caregiver_client.get("/api/care/me/patients/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["patient_name"], "بیمار دو")

    def test_report_writes_audit_entry(self):
        from apps.audit.models import AuditEventType, AuditLog
        self.caregiver_client.post("/api/care/me/log-entries/", {
            "patient": self.patient.id, "category": "incident", "note": "افتادگی جزئی، آسیبی نبود.",
        }, format="json")
        entry = AuditLog.objects.filter(event_type=AuditEventType.CARE_LOG_ENTRY_CREATED).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.metadata.get("category"), "incident")


class CaregiverSuggestionTests(TestCase):
    """The first real use of matching — a supervisor deciding who to
    assign gets a ranked list based on objective, already-captured
    signals (gender preference, age-range preference, service-area
    overlap), instead of picking blind."""

    def setUp(self):
        import datetime
        from apps.caregivers.models import CaregiverStatus, CaregiverWorkPreferences, CaregiverServiceArea, IdentityProfile
        from apps.locations.models import Province

        self.supervisor = _make_user("sup_match", UserRole.SUPERUSER, "09100000070")
        self.sup_client = _client_for(self.supervisor)

        self.tehran = Province.objects.get(name="تهران")
        self.tehran_city = self.tehran.cities.get(name="تهران")
        self.other_province = Province.objects.exclude(id=self.tehran.id).first()

        self.patient = PatientProfile.objects.create(
            full_name="بیمار تست", gender="female", province=self.tehran, city=self.tehran_city,
            birth_date=datetime.date(1950, 1, 1),
        )

        def make_caregiver(username, phone, gender, accepted_gender, age_ranges, province, approved=True):
            u = _make_user(username, UserRole.CAREGIVER, phone)
            profile = CaregiverProfile.objects.create(user=u, status=CaregiverStatus.APPROVED if approved else CaregiverStatus.DRAFT)
            IdentityProfile.objects.create(user=u, gender=gender)
            CaregiverWorkPreferences.objects.create(profile=profile, accepted_gender=accepted_gender, accepted_age_ranges=age_ranges, terms_accepted=True)
            if province:
                CaregiverServiceArea.objects.create(profile=profile, province=province, city=self.tehran_city if province == self.tehran else None)
            return u, profile

        self.perfect_user, self.perfect_profile = make_caregiver("cg_perfect", "09121115001", "female", "female_only", ["70_80"], self.tehran)
        self.partial_user, _ = make_caregiver("cg_partial", "09121115002", "male", "no_preference", ["60_70"], self.tehran)
        self.poor_user, _ = make_caregiver("cg_poor", "09121115003", "male", "male_only", ["60_70"], self.other_province)
        self.unapproved_user, _ = make_caregiver("cg_unapproved", "09121115004", "female", "female_only", ["70_80"], self.tehran, approved=False)

    def test_ranks_caregivers_by_fit_highest_first(self):
        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={self.patient.access_code}")
        self.assertEqual(response.status_code, 200)
        suggestions = response.data["suggestions"]
        scores = [s["score"] for s in suggestions]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_correctly_identifies_the_best_fit_with_full_score(self):
        # The specific bug this caught: birth_date read back from a
        # real DB fetch is a jdatetime.date (Jalali), not
        # datetime.date — mixing it into Gregorian arithmetic silently
        # produced an "age" in the hundreds instead of erroring,
        # which meant a genuinely perfect age-range match always
        # showed as a mismatch. This test exercises exactly that path
        # (a real API request, not an in-memory object) so it can't
        # silently regress the same way again.
        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={self.patient.access_code}")
        best = response.data["suggestions"][0]
        self.assertEqual(best["caregiver_user_id"], self.perfect_user.id)
        self.assertEqual(best["score"], 100)

    def test_unapproved_caregiver_never_suggested_regardless_of_fit(self):
        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={self.patient.access_code}")
        suggested_ids = [s["caregiver_user_id"] for s in response.data["suggestions"]]
        self.assertNotIn(self.unapproved_user.id, suggested_ids)

    def test_already_assigned_caregiver_excluded_from_suggestions(self):
        from apps.care.models import CaregiverAssignment
        CaregiverAssignment.objects.create(caregiver=self.perfect_profile, patient=self.patient, assigned_by=self.supervisor)

        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={self.patient.access_code}")
        suggested_ids = [s["caregiver_user_id"] for s in response.data["suggestions"]]
        self.assertNotIn(self.perfect_user.id, suggested_ids)

    def test_invalid_patient_code_rejected(self):
        response = self.sup_client.get("/api/care/suggest-caregivers/?patient_code=ELD-ZZZZZZ")
        self.assertEqual(response.status_code, 404)

    def test_missing_patient_code_rejected(self):
        response = self.sup_client.get("/api/care/suggest-caregivers/")
        self.assertEqual(response.status_code, 400)

    def test_non_supervisor_cannot_access_suggestions(self):
        family_client = _client_for(_make_user("fam_no_access", UserRole.FAMILY, "09121115005"))
        response = family_client.get(f"/api/care/suggest-caregivers/?patient_code={self.patient.access_code}")
        self.assertEqual(response.status_code, 403)

    def test_patient_with_no_birth_date_still_scores_gracefully(self):
        no_dob_patient = PatientProfile.objects.create(full_name="بدون تاریخ تولد", gender="female", province=self.tehran)
        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={no_dob_patient.access_code}")
        self.assertEqual(response.status_code, 200)
        best = response.data["suggestions"][0]
        self.assertLess(best["score"], 100)  # can't get full marks without an age match
        self.assertIn("تاریخ تولد بیمار ثبت نشده", " ".join(best["reasons"]))
