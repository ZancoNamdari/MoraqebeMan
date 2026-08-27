from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.caregivers.models import (
    CaregiverExperience,
    CaregiverProfile,
    CaregiverReference,
    CaregiverSkills,
    CaregiverStatus,
    CaregiverWorkPreferences,
    IdentityProfile,
)
from tests.factories.user_factory import make_user


class SupervisorCaregiverListViewQueryPerformanceTests(TestCase):
    """
    Regression test for a real, severe N+1 in
    SupervisorCaregiverListView.get() — the endpoint behind
    supervisor-panel's and admin-panel's main caregiver list. The
    original code ran a fresh CaregiverProfile lookup, an
    IdentityProfile .exists() check, up to three hasattr() calls
    (each silently triggering its own query on an unfetched reverse
    OneToOne), and a .count() on references — all INSIDE a per-row
    loop. At real caregiver counts this was potentially 6+ queries
    per row, worse than the N+1 already found and fixed in the
    matching pipeline itself.

    Tests both things that matter equally here: the query count
    doesn't scale with row count (performance), AND the computed
    forms_completed value is still correct for caregivers with every
    combination of complete/partial/missing profile data
    (correctness) — the fix changed hasattr() checks to getattr()
    checks against a now-select_related chain, and this is the actual
    verification that the rewrite behaves identically, not just that
    it's faster.
    """

    def setUp(self):
        self.staff = make_user("list_perf_staff", role=UserRole.ADMIN, phone_number="09100018001")
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def _make_caregiver(self, username, phone, *, with_identity=False, with_work_prefs=False,
                         with_experience=False, with_skills=False, with_reference=False):
        user = make_user(username, role=UserRole.CAREGIVER, phone_number=phone)
        profile = CaregiverProfile.objects.create(user=user, status=CaregiverStatus.APPROVED)
        if with_identity:
            IdentityProfile.objects.create(user=user, gender="male")
        if with_work_prefs:
            CaregiverWorkPreferences.objects.create(profile=profile)
        if with_experience:
            CaregiverExperience.objects.create(profile=profile)
        if with_skills:
            CaregiverSkills.objects.create(profile=profile)
        if with_reference:
            CaregiverReference.objects.create(profile=profile, full_name="معرف تست")
        return user

    def test_forms_completed_correct_for_a_fully_filled_caregiver(self):
        self._make_caregiver(
            "list_perf_full", "09100018002",
            with_identity=True, with_work_prefs=True, with_experience=True, with_skills=True, with_reference=True,
        )
        response = self.client.get("/api/supervisor/caregivers/")
        self.assertEqual(response.status_code, 200)
        row = next(r for r in response.data if r["phone_number"] == "09100018002")
        self.assertEqual(row["forms_completed"], 4)  # identity, work_prefs, experience+skills, references

    def test_forms_completed_correct_for_a_brand_new_caregiver(self):
        self._make_caregiver("list_perf_empty", "09100018003")
        response = self.client.get("/api/supervisor/caregivers/")
        row = next(r for r in response.data if r["phone_number"] == "09100018003")
        self.assertEqual(row["forms_completed"], 0)

    def test_forms_completed_correct_for_partial_data_missing_skills(self):
        # experience without skills must NOT count as the combined
        # "experience+skills" form being done — both are required
        # together, same as the original hasattr(...) and hasattr(...)
        # logic before this fix.
        self._make_caregiver(
            "list_perf_partial", "09100018004",
            with_identity=True, with_experience=True, with_skills=False,
        )
        response = self.client.get("/api/supervisor/caregivers/")
        row = next(r for r in response.data if r["phone_number"] == "09100018004")
        self.assertEqual(row["forms_completed"], 1)  # only identity

    def test_query_count_does_not_scale_with_caregiver_count(self):
        for i in range(3):
            self._make_caregiver(f"list_perf_small_{i}", f"0910001{9000+i:04d}", with_identity=True, with_work_prefs=True)

        with CaptureQueriesContext(connection) as small_batch:
            response_small = self.client.get("/api/supervisor/caregivers/")
        self.assertEqual(response_small.status_code, 200)

        for i in range(3, 20):
            self._make_caregiver(f"list_perf_large_{i}", f"0910001{9000+i:04d}", with_identity=True, with_work_prefs=True)

        with CaptureQueriesContext(connection) as large_batch:
            response_large = self.client.get("/api/supervisor/caregivers/")
        self.assertEqual(response_large.status_code, 200)
        self.assertEqual(len(response_large.data), 20)

        small_count = len(small_batch.captured_queries)
        large_count = len(large_batch.captured_queries)

        # 20 vs 3 caregivers is a ~7x increase in row count — a real
        # N+1 would show roughly proportional query growth. The fixed
        # version should show (approximately) the SAME query count
        # regardless, since every per-row cost was converted to a
        # single JOIN or a single aggregate covering all rows.
        self.assertLess(
            large_count, small_count + 5,
            f"query count grew from {small_count} (3 caregivers) to {large_count} "
            f"(20 caregivers) — scaling with row count is exactly what the N+1 this "
            f"test guards against looked like.",
        )
