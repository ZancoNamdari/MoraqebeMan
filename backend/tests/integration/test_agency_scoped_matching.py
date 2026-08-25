from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus, AgencyPatientLink, AgencyProfile, AgencySupervisor
from apps.care.matching import suggest_caregivers_for_agency_patient, suggest_caregivers_for_patient
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from apps.families.models import PatientProfile
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class AgencyScopedMatchingFunctionTests(BaseAPITestCase):
    """
    apps.care.matching.suggest_caregivers_for_agency_patient — the
    candidate-pool restriction itself, independent of the HTTP layer.
    """

    def setUp(self):
        self.agency = AgencyProfile.objects.create(
            user=make_user("agency_match_owner", role=UserRole.AGENCY, phone_number="09100011001"),
            company_name="آژانس تطبیق",
        )
        self.patient = PatientProfile.objects.create(full_name="سالمند آژانس")

        self.other_agency = AgencyProfile.objects.create(
            user=make_user("agency_match_owner2", role=UserRole.AGENCY, phone_number="09100011002"),
            company_name="آژانس دیگر",
        )

    def _make_approved_caregiver(self, username, phone):
        user = make_user(username, role=UserRole.CAREGIVER, phone_number=phone)
        return CaregiverProfile.objects.create(user=user, status=CaregiverStatus.APPROVED)

    def test_only_this_agencys_approved_caregivers_are_candidates(self):
        linked = self._make_approved_caregiver("agency_linked_cg", "09121500001")
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=linked, status=AgencyLinkStatus.APPROVED)

        unlinked = self._make_approved_caregiver("agency_unlinked_cg", "09121500002")

        pending = self._make_approved_caregiver("agency_pending_cg", "09121500003")
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=pending, status=AgencyLinkStatus.PENDING)

        other_agencys = self._make_approved_caregiver("agency_other_cg", "09121500004")
        AgencyCaregiverLink.objects.create(agency=self.other_agency, caregiver=other_agencys, status=AgencyLinkStatus.APPROVED)

        results = suggest_caregivers_for_agency_patient(self.agency, self.patient)
        names = {r["caregiver_name"] for r in results}

        self.assertIn("agency_linked_cg", names)
        self.assertNotIn("agency_unlinked_cg", names)
        self.assertNotIn("agency_pending_cg", names)
        self.assertNotIn("agency_other_cg", names)

    def test_empty_roster_returns_empty_list_not_error(self):
        results = suggest_caregivers_for_agency_patient(self.agency, self.patient)
        self.assertEqual(results, [])

    def test_platform_wide_matching_unaffected_by_the_new_optional_parameter(self):
        # Regression check: candidate_queryset defaults to None, so
        # the existing platform-wide behavior every other test in
        # this suite relies on must be completely untouched.
        linked = self._make_approved_caregiver("agency_regression_linked", "09121500005")
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=linked, status=AgencyLinkStatus.APPROVED)
        unlinked = self._make_approved_caregiver("agency_regression_unlinked", "09121500006")

        results = suggest_caregivers_for_patient(self.patient)
        names = {r["caregiver_name"] for r in results}
        self.assertIn("agency_regression_linked", names)
        self.assertIn("agency_regression_unlinked", names)  # platform-wide sees everyone


class AgencySuggestedCaregiversViewTests(BaseAPITestCase):
    """GET /api/agencies/<agency_id>/patients/<patient_id>/suggest-caregivers/"""

    def setUp(self):
        self.agency = AgencyProfile.objects.create(
            user=make_user("agency_match_view_owner", role=UserRole.AGENCY, phone_number="09100011010"),
            company_name="آژانس تطبیق دو",
        )
        self.agency_client = APIClient()
        self.agency_client.force_authenticate(self.agency.user)

        self.supervisor_user = make_user("agency_match_super", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100011011")
        AgencySupervisor.objects.create(user=self.supervisor_user, agency=self.agency, created_by=self.agency.user)
        self.supervisor_client = APIClient()
        self.supervisor_client.force_authenticate(self.supervisor_user)

        self.other_agency = AgencyProfile.objects.create(
            user=make_user("agency_match_view_owner2", role=UserRole.AGENCY, phone_number="09100011012"),
            company_name="آژانس دیگر دو",
        )
        self.other_agency_client = APIClient()
        self.other_agency_client.force_authenticate(self.other_agency.user)

        self.patient = PatientProfile.objects.create(full_name="سالمند تست تطبیق", gender="male")
        AgencyPatientLink.objects.create(agency=self.agency, patient=self.patient, status=AgencyLinkStatus.APPROVED)

        caregiver_user = make_user("agency_match_view_cg", role=UserRole.CAREGIVER, phone_number="09121500099")
        self.caregiver_profile = CaregiverProfile.objects.create(user=caregiver_user, status=CaregiverStatus.APPROVED)
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.caregiver_profile, status=AgencyLinkStatus.APPROVED)

    def test_agency_can_get_suggestions_for_its_own_patient(self):
        response = self.agency_client.get(f"/api/agencies/{self.agency.id}/patients/{self.patient.id}/suggest-caregivers/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["patient_name"], "سالمند تست تطبیق")
        self.assertEqual(len(response.data["suggestions"]), 1)
        self.assertEqual(response.data["suggestions"][0]["caregiver_name"], "agency_match_view_cg")

    def test_agency_supervisor_can_also_get_suggestions(self):
        response = self.supervisor_client.get(f"/api/agencies/{self.agency.id}/patients/{self.patient.id}/suggest-caregivers/")
        self.assertEqual(response.status_code, 200)

    def test_different_agency_cannot_request_matching_for_this_agency(self):
        response = self.other_agency_client.get(f"/api/agencies/{self.agency.id}/patients/{self.patient.id}/suggest-caregivers/")
        self.assertEqual(response.status_code, 403)

    def test_agency_cannot_request_matching_for_a_patient_that_is_not_its_own(self):
        # Same agency permission-wise, but this specific patient was
        # never linked to it — guessing a valid patient id from
        # another agency (or an unlinked standalone patient) must not
        # work just because the actor otherwise has valid agency
        # credentials.
        someone_elses_patient = PatientProfile.objects.create(full_name="بیمار متعلق به هیچ‌کس")
        response = self.agency_client.get(f"/api/agencies/{self.agency.id}/patients/{someone_elses_patient.id}/suggest-caregivers/")
        self.assertEqual(response.status_code, 404)

    def test_unauthenticated_rejected(self):
        anon_client = APIClient()
        response = anon_client.get(f"/api/agencies/{self.agency.id}/patients/{self.patient.id}/suggest-caregivers/")
        self.assertEqual(response.status_code, 401)

    def test_response_includes_full_mcdm_ranking_fields(self):
        # Confirms this really does reuse the exact same pipeline as
        # the platform-wide endpoint — same response shape, not a
        # simplified stand-in.
        response = self.agency_client.get(f"/api/agencies/{self.agency.id}/patients/{self.patient.id}/suggest-caregivers/")
        suggestion = response.data["suggestions"][0]
        for field in ("mcdm_score", "objective_fit_score", "match_confidence", "explanation"):
            self.assertIn(field, suggestion)
