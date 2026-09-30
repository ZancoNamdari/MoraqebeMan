from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import (
    AgencyCaregiverLink,
    AgencyLinkStatus,
    AgencyPatientLink,
    AgencyProfile,
    AgencySupervisor,
)
from apps.caregivers.choices import Gender as CaregiverGender
from apps.caregivers.models import CaregiverProfile, CaregiverStatus, IdentityProfile
from apps.families.models import Gender as PatientGender, PatientProfile
from apps.locations.models import City, Province
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class AgencyDashboardInsightsGenderCityTests(BaseAPITestCase):
    """
    AgencyDashboardInsightsView's new caregiver_gender_breakdown /
    caregiver_city_breakdown / patient_gender_breakdown /
    patient_city_breakdown keys — added on top of the existing
    caregiver/patient breakdowns, without touching them.
    """

    def setUp(self):
        self.province = Province.objects.create(name="استان تست بینش")
        self.tehran = City.objects.create(province=self.province, name="تهران")
        self.karaj = City.objects.create(province=self.province, name="کرج")

        self.agency = AgencyProfile.objects.create(
            user=make_user("insights_owner", role=UserRole.AGENCY, phone_number="09100030001"),
            company_name="آژانس بینش",
        )
        self.owner_client = APIClient()
        self.owner_client.force_authenticate(self.agency.user)

        # --- Caregivers: 2 approved-linked, one with full identity
        # (female, Tehran), one with no IdentityProfile at all.
        cg1_user = make_user("insights_cg1", role=UserRole.CAREGIVER, phone_number="09100030002")
        self.cg1 = CaregiverProfile.objects.create(user=cg1_user, status=CaregiverStatus.APPROVED)
        IdentityProfile.objects.create(user=cg1_user, gender=CaregiverGender.FEMALE, city=self.tehran)
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.cg1, status=AgencyLinkStatus.APPROVED)

        cg2_user = make_user("insights_cg2", role=UserRole.CAREGIVER, phone_number="09100030003")
        self.cg2 = CaregiverProfile.objects.create(user=cg2_user, status=CaregiverStatus.APPROVED)
        # No IdentityProfile — should land in "ثبت نشده".
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.cg2, status=AgencyLinkStatus.APPROVED)

        # --- Patients: 2 approved-linked, one male in Karaj, one with
        # no gender/city set.
        self.patient1 = PatientProfile.objects.create(full_name="سالمند یک", gender=PatientGender.MALE, city=self.karaj)
        AgencyPatientLink.objects.create(agency=self.agency, patient=self.patient1, status=AgencyLinkStatus.APPROVED)

        self.patient2 = PatientProfile.objects.create(full_name="سالمند دو")
        AgencyPatientLink.objects.create(agency=self.agency, patient=self.patient2, status=AgencyLinkStatus.APPROVED)

    def test_response_still_has_original_keys(self):
        response = self.owner_client.get("/api/agencies/me/dashboard/insights/")
        self.assertEqual(response.status_code, 200)
        for key in ("caregiver_total_count", "caregiver_status_breakdown", "patient_pipeline_breakdown",
                    "complaints_by_category", "weekly_growth_trend"):
            self.assertIn(key, response.data)

    def test_caregiver_gender_breakdown(self):
        response = self.owner_client.get("/api/agencies/me/dashboard/insights/")
        by_gender = {row["gender"]: row["count"] for row in response.data["caregiver_gender_breakdown"]}
        self.assertEqual(by_gender.get("female"), 1)
        self.assertEqual(by_gender.get(None), 1)  # cg2, no identity profile

    def test_caregiver_city_breakdown(self):
        response = self.owner_client.get("/api/agencies/me/dashboard/insights/")
        by_city = {row["city"]: row["count"] for row in response.data["caregiver_city_breakdown"]}
        self.assertEqual(by_city.get("تهران"), 1)
        self.assertEqual(by_city.get(None), 1)  # cg2

    def test_patient_gender_breakdown(self):
        response = self.owner_client.get("/api/agencies/me/dashboard/insights/")
        by_gender = {row["gender"]: row["count"] for row in response.data["patient_gender_breakdown"]}
        self.assertEqual(by_gender.get("male"), 1)
        self.assertEqual(by_gender.get(None), 1)  # patient2, no gender set

    def test_patient_city_breakdown(self):
        response = self.owner_client.get("/api/agencies/me/dashboard/insights/")
        by_city = {row["city"]: row["count"] for row in response.data["patient_city_breakdown"]}
        self.assertEqual(by_city.get("کرج"), 1)
        self.assertEqual(by_city.get(None), 1)  # patient2, no city set
