from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus, AgencyProfile
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class WeeklyGrowthTrendTests(BaseAPITestCase):
    """روند ۸ هفته‌ی اخیر با ۲ کوئری (به‌جای ۱۶)، ولی با همان نتیجه‌ی قبلی."""

    def test_buckets_and_query_budget(self):
        agency = AgencyProfile.objects.create(
            user=make_user("trend_owner", role=UserRole.AGENCY, phone_number="09100040001"), company_name="روند",
        )
        now = timezone.now()
        days_since_sat = (now.weekday() - 5) % 7
        this_week = (now - timedelta(days=days_since_sat)).replace(hour=0, minute=0, second=0, microsecond=0)
        for n, weeks_ago in enumerate([0, 0, 3, 7, 9]):  # ۹ هفته پیش خارج از بازه است
            cg = CaregiverProfile.objects.create(
                user=make_user(f"trend_cg{n}", role=UserRole.CAREGIVER, phone_number=f"0910004010{n}"),
                status=CaregiverStatus.APPROVED,
            )
            link = AgencyCaregiverLink.objects.create(agency=agency, caregiver=cg, status=AgencyLinkStatus.APPROVED)
            AgencyCaregiverLink.objects.filter(pk=link.pk).update(
                requested_at=this_week - timedelta(weeks=weeks_ago) + timedelta(hours=5),
            )
        client = APIClient()
        client.force_authenticate(agency.user)
        res = client.get("/api/agencies/me/dashboard/insights/")
        self.assertEqual(res.status_code, 200)
        trend = res.json()["weekly_growth_trend"]
        self.assertEqual(len(trend), 8)
        self.assertEqual([w["new_caregivers"] for w in trend], [1, 0, 0, 0, 1, 0, 0, 2])
