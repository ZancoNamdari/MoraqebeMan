from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyAdmin, AgencyProfile, AgencySupervisor
from apps.caregivers.choices import EducationLevel, Gender
from apps.locations.models import City, Province
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class AgencyStaffDashboardTests(BaseAPITestCase):
    """
    /api/agencies/me/dashboard/staff/ — the agency's own staff
    composition (headcount, role/gender/education/city breakdowns,
    an 8-week hiring trend). Available to the owner, any of its
    supervisors, or any of its admins; strictly scoped to the acting
    user's own agency.
    """

    def setUp(self):
        self.province = Province.objects.create(name="تهران استانی برای تست")
        self.tehran = City.objects.create(province=self.province, name="تهران")
        self.karaj = City.objects.create(province=self.province, name="کرج")

        self.agency = AgencyProfile.objects.create(
            user=make_user("staff_dash_owner", role=UserRole.AGENCY, phone_number="09100020001"),
            company_name="آژانس داشبورد کارکنان",
        )
        self.owner_client = APIClient()
        self.owner_client.force_authenticate(self.agency.user)

        self.supervisor_user = make_user("staff_dash_sup1", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100020002")
        self.supervisor = AgencySupervisor.objects.create(
            user=self.supervisor_user, agency=self.agency, created_by=self.agency.user,
            gender=Gender.FEMALE, education_level=EducationLevel.BACHELOR, city=self.tehran,
        )
        self.supervisor_client = APIClient()
        self.supervisor_client.force_authenticate(self.supervisor_user)

        self.supervisor2_user = make_user("staff_dash_sup2", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100020003")
        AgencySupervisor.objects.create(
            user=self.supervisor2_user, agency=self.agency, created_by=self.agency.user,
            gender=Gender.MALE, education_level=EducationLevel.MASTER, city=self.karaj,
        )

        self.admin_user = make_user("staff_dash_admin1", role=UserRole.AGENCY_ADMIN, phone_number="09100020004")
        self.admin = AgencyAdmin.objects.create(
            user=self.admin_user, agency=self.agency, supervisor=self.supervisor, created_by=self.agency.user,
            gender=Gender.FEMALE, city=self.tehran,  # education_level left unset -> "ثبت نشده"
        )
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin_user)

        # A second agency, with its own staff — must never leak into
        # the first agency's dashboard.
        self.other_agency = AgencyProfile.objects.create(
            user=make_user("staff_dash_owner2", role=UserRole.AGENCY, phone_number="09100020005"),
            company_name="آژانس دیگر",
        )
        self.other_supervisor_user = make_user("staff_dash_sup_other", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100020006")
        AgencySupervisor.objects.create(user=self.other_supervisor_user, agency=self.other_agency, created_by=self.other_agency.user)
        self.other_supervisor_client = APIClient()
        self.other_supervisor_client.force_authenticate(self.other_supervisor_user)

    def test_owner_sees_correct_total_and_role_counts(self):
        response = self.owner_client.get("/api/agencies/me/dashboard/staff/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_staff"], 3)  # 2 supervisors + 1 admin
        by_role = {row["role"]: row["count"] for row in response.data["by_role"]}
        self.assertEqual(by_role["supervisor"], 2)
        self.assertEqual(by_role["admin"], 1)

    def test_supervisor_can_view_staff_dashboard(self):
        response = self.supervisor_client.get("/api/agencies/me/dashboard/staff/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_staff"], 3)

    def test_admin_can_view_staff_dashboard(self):
        response = self.admin_client.get("/api/agencies/me/dashboard/staff/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_staff"], 3)

    def test_unrelated_role_gets_403(self):
        outsider = make_user("staff_dash_family", role=UserRole.FAMILY, phone_number="09100020007")
        client = APIClient()
        client.force_authenticate(outsider)
        response = client.get("/api/agencies/me/dashboard/staff/")
        self.assertEqual(response.status_code, 403)

    def test_other_agencys_staff_never_appears(self):
        response = self.other_supervisor_client.get("/api/agencies/me/dashboard/staff/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_staff"], 1)  # only their own supervisor

    def test_gender_breakdown_counts(self):
        response = self.owner_client.get("/api/agencies/me/dashboard/staff/")
        by_gender = {row["gender"]: row["count"] for row in response.data["by_gender"]}
        self.assertEqual(by_gender.get("female"), 2)
        self.assertEqual(by_gender.get("male"), 1)

    def test_education_breakdown_groups_missing_as_unregistered(self):
        response = self.owner_client.get("/api/agencies/me/dashboard/staff/")
        by_education = {row["education_level"]: row["count"] for row in response.data["by_education"]}
        self.assertEqual(by_education.get("bachelor"), 1)
        self.assertEqual(by_education.get("master"), 1)
        self.assertEqual(by_education.get(None), 1)  # the admin, no education_level set

    def test_city_breakdown_counts(self):
        response = self.owner_client.get("/api/agencies/me/dashboard/staff/")
        by_city = {row["city"]: row["count"] for row in response.data["by_city"]}
        self.assertEqual(by_city.get("تهران"), 2)
        self.assertEqual(by_city.get("کرج"), 1)

    def test_weekly_trend_has_eight_buckets_and_counts_new_hires(self):
        response = self.owner_client.get("/api/agencies/me/dashboard/staff/")
        trend = response.data["weekly_trend"]
        self.assertEqual(len(trend), 8)
        # All 3 staff were created "now", in the current week's bucket.
        self.assertEqual(trend[-1]["new_staff"], 3)
