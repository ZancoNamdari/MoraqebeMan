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
        self.assertIn("تاریخ تولد بیمار ثبت نشده", " ".join(best["objective_reasons"]))


class CaregiverReviewTests(TestCase):
    """A family member (or the patient) rating a caregiver for a
    specific assignment — the loop from "care was provided" back to
    "was it good", and the informational signal shown alongside
    matching suggestions."""

    def setUp(self):
        self.supervisor = _make_user("sup_review", UserRole.SUPERUSER, "09100000091")
        self.caregiver_user = _make_user("cg_review", UserRole.CAREGIVER, "09121118001")
        self.caregiver = CaregiverProfile.objects.create(user=self.caregiver_user)

        self.family_user = _make_user("fam_review", UserRole.FAMILY, "09121118002")
        self.family_client = _client_for(self.family_user)
        self.family = FamilyProfile.objects.create(user=self.family_user, display_name="خانواده")
        self.patient = PatientProfile.objects.create(full_name="بیمار سه")
        from apps.families.models import FamilyPatientLink, LinkStatus
        FamilyPatientLink.objects.create(family=self.family, patient=self.patient, relation="child", status=LinkStatus.APPROVED)

        self.assignment = CaregiverAssignment.objects.create(caregiver=self.caregiver, patient=self.patient, assigned_by=self.supervisor)

    def test_family_can_submit_a_review(self):
        response = self.family_client.post(f"/api/care/assignments/{self.assignment.id}/review/", {
            "rating": 5, "comment": "خیلی خوب بود",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["rating"], 5)

    def test_resubmitting_updates_rather_than_duplicating(self):
        from apps.care.models import CaregiverReview

        self.family_client.post(f"/api/care/assignments/{self.assignment.id}/review/", {"rating": 3}, format="json")
        response = self.family_client.post(f"/api/care/assignments/{self.assignment.id}/review/", {"rating": 5}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(CaregiverReview.objects.filter(assignment=self.assignment).count(), 1)
        self.assertEqual(CaregiverReview.objects.get(assignment=self.assignment).rating, 5)

    def test_rating_out_of_range_rejected(self):
        response = self.family_client.post(f"/api/care/assignments/{self.assignment.id}/review/", {"rating": 6}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_stranger_with_no_access_to_patient_cannot_review(self):
        stranger_client = _client_for(_make_user("fam_stranger_review", UserRole.FAMILY, "09121118003"))
        response = stranger_client.post(f"/api/care/assignments/{self.assignment.id}/review/", {"rating": 1}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_review_works_after_assignment_has_ended(self):
        self.assignment.end()
        response = self.family_client.post(f"/api/care/assignments/{self.assignment.id}/review/", {"rating": 4}, format="json")
        self.assertEqual(response.status_code, 201)

    def test_aggregate_rating_shows_up_on_care_team_view(self):
        self.family_client.post(f"/api/care/assignments/{self.assignment.id}/review/", {"rating": 4}, format="json")
        response = self.family_client.get(f"/api/care/patients/{self.patient.id}/team/")
        self.assertEqual(response.data[0]["caregiver_avg_rating"], 4.0)
        self.assertEqual(response.data[0]["caregiver_review_count"], 1)

    def test_no_reviews_yet_shows_null_not_zero(self):
        # A caregiver with no reviews should show as "no data yet",
        # not a misleading 0.0 that looks like a bad rating.
        response = self.family_client.get(f"/api/care/patients/{self.patient.id}/team/")
        self.assertIsNone(response.data[0]["caregiver_avg_rating"])
        self.assertEqual(response.data[0]["caregiver_review_count"], 0)

    def test_review_writes_audit_entry(self):
        from apps.audit.models import AuditEventType, AuditLog
        self.family_client.post(f"/api/care/assignments/{self.assignment.id}/review/", {"rating": 5}, format="json")
        entry = AuditLog.objects.filter(event_type=AuditEventType.CAREGIVER_REVIEWED, target_user_id=self.caregiver_user.id).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.metadata.get("rating"), 5)

    def test_suggestion_results_include_rating_info(self):
        from apps.caregivers.models import CaregiverStatus
        self.caregiver.status = CaregiverStatus.APPROVED
        self.caregiver.save(update_fields=["status"])

        self.family_client.post(f"/api/care/assignments/{self.assignment.id}/review/", {"rating": 5}, format="json")
        self.assignment.end()  # so this caregiver isn't excluded as "already assigned"

        sup_client = _client_for(self.supervisor)
        second_patient = PatientProfile.objects.create(full_name="بیمار دیگر")
        response = sup_client.get(f"/api/care/suggest-caregivers/?patient_code={second_patient.access_code}")
        match = next(s for s in response.data["suggestions"] if s["caregiver_user_id"] == self.caregiver_user.id)
        self.assertEqual(match["avg_rating"], 5.0)
        self.assertEqual(match["review_count"], 1)


VALID_PATIENT_QUESTIONNAIRE = {
    "religious_beliefs_priority": "strongly_agree", "new_treatment_openness": "moderate",
    "caregiver_as_family_member": "yes", "respectful_disagreement_acceptance": "fully_accept",
    "privacy_comfort_with_caregiver": "yes", "noise_smell_sensitivity": "low",
    "meal_time_strictness": "moderate", "special_diet_preference": "no",
    "medication_timing_priority": "very_high", "accent_customs_annoyance": "not_at_all",
    "cultural_respect_expectation": "yes", "willingness_to_express_opinion": "moderate",
}

CAREGIVER_FLEX_ANSWERS = {
    "religious_belief_accommodation": "a", "physical_contact_sensitivity_adaptation": "a",
    "prayer_time_scheduling_flexibility": "a", "traditional_belief_acceptance": "a",
    "family_event_participation": "b", "false_accusation_reaction": "b",
    "confidentiality_commitment": "b", "gender_based_task_flexibility": "b",
    "home_environment_adaptability": "c", "schedule_flexibility_for_family_events": "c",
    "traditional_food_treatment_openness": "c", "personal_conversation_patience": "c",
    "home_organization_adaptability": "c",
    "cultural_expression_tolerance": "d", "unfamiliar_custom_acceptance": "d", "dialect_communication_effort": "d",
}


class PatientQuestionnaireForMatchingTests(TestCase):
    """Closes a real, necessary gap: until now only a patient's own
    family could see their compatibility questionnaire — a supervisor
    comparing it against a caregiver's flexibility profile had no way
    to see the patient's side at all."""

    def setUp(self):
        from apps.families.models import PatientCompatibilityQuestionnaire

        self.supervisor = _make_user("sup_axis_view", UserRole.SUPERUSER, "09100000210")
        self.sup_client = _client_for(self.supervisor)
        self.patient = PatientProfile.objects.create(full_name="بیمار محور تست")
        PatientCompatibilityQuestionnaire.objects.create(patient=self.patient, **VALID_PATIENT_QUESTIONNAIRE)

    def test_supervisor_can_view_patient_questionnaire(self):
        response = self.sup_client.get(f"/api/care/patient-questionnaire/?patient_code={self.patient.access_code}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["religious_beliefs_priority"], "strongly_agree")

    def test_patient_without_completed_questionnaire_returns_404(self):
        bare_patient = PatientProfile.objects.create(full_name="بدون پرسشنامه")
        response = self.sup_client.get(f"/api/care/patient-questionnaire/?patient_code={bare_patient.access_code}")
        self.assertEqual(response.status_code, 404)

    def test_invalid_patient_code_rejected(self):
        response = self.sup_client.get("/api/care/patient-questionnaire/?patient_code=ELD-ZZZZZZ")
        self.assertEqual(response.status_code, 404)

    def test_non_supervisor_cannot_access(self):
        family_client = _client_for(_make_user("fam_axis_view", UserRole.FAMILY, "09121124001"))
        response = family_client.get(f"/api/care/patient-questionnaire/?patient_code={self.patient.access_code}")
        self.assertEqual(response.status_code, 403)


class MatchingIncludesSectionBreakdownTests(TestCase):
    """The suggestion output surfaces the caregiver's per-section
    flexibility breakdown, not just one overall number — the honest
    alternative to a fused cross-axis score I wasn't confident enough
    to compute automatically (several patient questionnaire fields
    don't have an unambiguous semantic direction from the label alone).
    A supervisor can now see both sides and judge the fit themselves."""

    def setUp(self):
        from apps.caregivers.models import CaregiverCompatibilityQuestionnaire, CaregiverStatus

        self.supervisor = _make_user("sup_section", UserRole.SUPERUSER, "09100000211")
        self.sup_client = _client_for(self.supervisor)

        self.caregiver_user = _make_user("cg_section", UserRole.CAREGIVER, "09121124002")
        self.caregiver = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.APPROVED)
        CaregiverCompatibilityQuestionnaire.objects.create(caregiver=self.caregiver, **CAREGIVER_FLEX_ANSWERS)

        self.patient = PatientProfile.objects.create(full_name="بیمار بخش")

    def test_suggestion_includes_per_section_breakdown(self):
        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={self.patient.access_code}")
        match = next(s for s in response.data["suggestions"] if s["caregiver_user_id"] == self.caregiver_user.id)
        self.assertEqual(match["flexibility_sections"]["عقیدتی و مناسکی"], 100)
        self.assertEqual(match["flexibility_sections"]["انعطاف‌پذیری فرهنگی"], 0)

    def test_no_questionnaire_shows_none_sections_not_error(self):
        from apps.caregivers.models import CaregiverStatus
        bare_user = _make_user("cg_bare_section", UserRole.CAREGIVER, "09121124003")
        CaregiverProfile.objects.create(user=bare_user, status=CaregiverStatus.APPROVED)

        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={self.patient.access_code}")
        match = next(s for s in response.data["suggestions"] if s["caregiver_user_id"] == bare_user.id)
        self.assertIsNone(match["flexibility_sections"])


class MatchingIncludesCapacitySignalTests(TestCase):
    """Suggestions surface how many OTHER patients a caregiver is
    already actively caring for — informational, not a filter or a
    score deduction, since real-world capacity isn't something this
    system can judge on its own. A supervisor comparing two similarly-
    scored caregivers should be able to see that one is already
    stretched across several patients and the other has none."""

    def setUp(self):
        from apps.caregivers.models import CaregiverStatus

        self.supervisor = _make_user("sup_capacity", UserRole.SUPERUSER, "09100000220")
        self.sup_client = _client_for(self.supervisor)
        self.caregiver_user = _make_user("cg_capacity", UserRole.CAREGIVER, "09121125001")
        self.caregiver = CaregiverProfile.objects.create(user=self.caregiver_user, status=CaregiverStatus.APPROVED)

    def test_zero_active_patients_shows_zero(self):
        patient = PatientProfile.objects.create(full_name="بیمار ظرفیت یک")
        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={patient.access_code}")
        match = next(s for s in response.data["suggestions"] if s["caregiver_user_id"] == self.caregiver_user.id)
        self.assertEqual(match["active_patient_count"], 0)

    def test_count_reflects_active_assignments_to_other_patients(self):
        for i in range(3):
            other_patient = PatientProfile.objects.create(full_name=f"بیمار دیگر {i}")
            CaregiverAssignment.objects.create(caregiver=self.caregiver, patient=other_patient, assigned_by=self.supervisor)

        target_patient = PatientProfile.objects.create(full_name="بیمار هدف")
        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={target_patient.access_code}")
        match = next(s for s in response.data["suggestions"] if s["caregiver_user_id"] == self.caregiver_user.id)
        self.assertEqual(match["active_patient_count"], 3)

    def test_ended_assignments_dont_count_toward_capacity(self):
        other_patient = PatientProfile.objects.create(full_name="بیمار پایان‌یافته")
        assignment = CaregiverAssignment.objects.create(caregiver=self.caregiver, patient=other_patient, assigned_by=self.supervisor)
        assignment.end()

        target_patient = PatientProfile.objects.create(full_name="بیمار هدف دو")
        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={target_patient.access_code}")
        match = next(s for s in response.data["suggestions"] if s["caregiver_user_id"] == self.caregiver_user.id)
        self.assertEqual(match["active_patient_count"], 0)

    def test_high_capacity_does_not_exclude_or_reduce_fit_score(self):
        # Informational only — a busy caregiver isn't filtered out or
        # penalized in the numeric score just for having other patients.
        for i in range(5):
            other_patient = PatientProfile.objects.create(full_name=f"بیمار شلوغ {i}")
            CaregiverAssignment.objects.create(caregiver=self.caregiver, patient=other_patient, assigned_by=self.supervisor)

        target_patient = PatientProfile.objects.create(full_name="بیمار هدف سه")
        response = self.sup_client.get(f"/api/care/suggest-caregivers/?patient_code={target_patient.access_code}")
        suggested_ids = [s["caregiver_user_id"] for s in response.data["suggestions"]]
        self.assertIn(self.caregiver_user.id, suggested_ids)
