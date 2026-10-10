from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.caregivers.models import (
    CaregiverCompatibilityQuestionnaire, CaregiverProfile, CaregiverStatus, IdentityProfile,
)


def mk_user(username, role, **kw):
    return User.objects.create_user(
        username=username, password="x", role=role, phone_number="98" + username[1:], email=f"{username}@t.ir", **kw,
    )


class PublicCaregiverProfileTests(TestCase):
    def setUp(self):
        self.cg_user = mk_user("09121110000", "caregiver", first_name="مریم", last_name="احمدی")
        self.cg = CaregiverProfile.objects.create(
            user=self.cg_user, status=CaregiverStatus.APPROVED, service_types=["salmandyar"],
        )
        IdentityProfile.objects.create(user=self.cg_user, national_id="0012345678", gender="female",
                                       full_address="خیابان secret", landline_phone="02112345678")
        CaregiverCompatibilityQuestionnaire.objects.create(
            caregiver=self.cg, trait_profiles=[{"id": "x", "title": "t", "traits": [
                {"key": "empathy", "label": "همدلی", "percent": 80, "questions": 3},
                {"key": "patience", "label": "صبر", "percent": 40, "questions": 3},
                {"key": "punctuality", "label": "وقت", "percent": 67, "questions": 2},
            ]}],
        )
        self.pending = CaregiverProfile.objects.create(
            user=mk_user("09122220000", "caregiver", first_name="علی", last_name="رضایی"),
            status=CaregiverStatus.PENDING, service_types=["salmandyar"],
        )
        self.family = mk_user("09123330000", "family", first_name="f", last_name="g")
        # دایرکتوری به آژانس‌های خودِ بیننده محدود است: خانواده و مراقب باید عضو تأییدشده‌ی یک آژانس باشند.
        from apps.agencies.models import (
            AgencyCaregiverLink, AgencyFamilyLink, AgencyLinkStatus, AgencyProfile,
        )
        from apps.families.models import FamilyProfile
        self.home_agency = AgencyProfile.objects.create(
            user=mk_user("09129990000", "agency"), company_name="آژانس خانه",
        )
        AgencyFamilyLink.objects.create(
            agency=self.home_agency, family=FamilyProfile.objects.create(user=self.family),
            status=AgencyLinkStatus.APPROVED,
        )
        AgencyCaregiverLink.objects.create(
            agency=self.home_agency, caregiver=self.cg, status=AgencyLinkStatus.APPROVED,
        )
        self.client = APIClient()

    def test_requires_family_patient_login(self):
        self.assertEqual(self.client.get("/api/caregivers/public/").status_code, 401)
        self.client.force_authenticate(self.cg_user)
        self.assertEqual(self.client.get("/api/caregivers/public/").status_code, 403)

    def test_list_only_approved_and_masks_private_fields(self):
        self.client.force_authenticate(self.family)
        res = self.client.get("/api/caregivers/public/")
        self.assertEqual(res.status_code, 200)
        ids = [r["id"] for r in res.json()["results"]]
        self.assertEqual(ids, [self.cg_user.id])
        body = res.content.decode()
        for secret in ("09121110000", "0012345678", "secret", "02112345678"):
            self.assertNotIn(secret, body)
        self.assertEqual(res.json()["results"][0]["display_name"], "مریم احمدی")

    def test_detail_shows_only_high_trait_titles_and_404s_unapproved(self):
        self.client.force_authenticate(self.family)
        ok = self.client.get(f"/api/caregivers/public/{self.cg_user.id}/")
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()["highlights"], ["مهربان و دلسوز", "وقت‌شناس"])
        self.assertNotIn("trait_profiles", ok.json())
        self.assertNotIn("صبور", ok.content.decode())
        self.assertNotIn("0012345678", ok.content.decode())
        self.assertEqual(self.client.get(f"/api/caregivers/public/{self.pending.user_id}/").status_code, 404)

    def test_service_type_filter(self):
        self.client.force_authenticate(self.family)
        self.assertEqual(self.client.get("/api/caregivers/public/?service_type=salmandyar").json()["count"], 1)
        self.assertEqual(self.client.get("/api/caregivers/public/?service_type=parastar").json()["count"], 0)


class FamilyViewPreviewTests(PublicCaregiverProfileTests):
    def _agency(self, phone, name):
        from apps.agencies.models import AgencyProfile
        return AgencyProfile.objects.create(user=mk_user(phone, "agency"), company_name=name)

    def _link(self, agency, cg):
        from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus
        AgencyCaregiverLink.objects.create(agency=agency, caregiver=cg, status=AgencyLinkStatus.APPROVED)

    def test_own_agency_sees_preview_even_when_pending_no_contact_data(self):
        a1 = self._agency("09124440001", "A1")
        self._link(a1, self.pending)
        self.client.force_authenticate(a1.user)
        res = self.client.get(f"/api/agencies/{a1.id}/caregivers/{self.pending.user_id}/family-view/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "pending")
        self.assertNotIn("09122220000", res.content.decode())
        # خانواده به این مسیر دسترسی ندارد
        self.client.force_authenticate(self.family)
        self.assertEqual(
            self.client.get(f"/api/agencies/{a1.id}/caregivers/{self.pending.user_id}/family-view/").status_code, 403)


class ReviewsInProfileTests(PublicCaregiverProfileTests):
    def test_reviews_distribution_and_masked_reviewer(self):
        from apps.care.models import CaregiverAssignment, CaregiverReview
        from apps.families.models import PatientProfile
        pat = PatientProfile.objects.create(full_name="بیمار محرمانه", access_code="ABC12345")
        asg = CaregiverAssignment.objects.create(caregiver=self.cg, patient=pat)
        CaregiverReview.objects.create(assignment=asg, caregiver=self.cg, patient=pat, reviewer=self.family,
                                       rating=5, comment="خیلی خوب بود")
        self.client.force_authenticate(self.family)
        body = self.client.get(f"/api/caregivers/public/{self.cg_user.id}/")
        d = body.json()
        self.assertEqual(d["rating_distribution"]["5"], 1)
        self.assertEqual(d["reviews"][0]["name"], "f g.")
        self.assertEqual(d["reviews"][0]["comment"], "خیلی خوب بود")
        self.assertNotIn("محرمانه", body.content.decode())


class FamilyViewAgencyIsolationTests(FamilyViewPreviewTests):
    """آژانس فقط مراقبانِ تأییدشده‌ی خودش را ببیند؛ نه با id آژانس دیگر و نه با حدس زدن id مراقب."""

    def test_agency_sees_only_own_caregivers(self):
        a1 = self._agency("09125550001", "A1")
        a2 = self._agency("09125550002", "A2")
        self._link(a1, self.cg)
        url = lambda ag: f"/api/agencies/{ag.id}/caregivers/{self.cg_user.id}/family-view/"
        self.client.force_authenticate(a1.user)
        self.assertEqual(self.client.get(url(a1)).status_code, 200)
        # آژانس ۲ با مسیر خودش: مراقب در فهرستش نیست
        self.client.force_authenticate(a2.user)
        self.assertEqual(self.client.get(url(a2)).status_code, 404)
        # آژانس ۲ با id آژانس ۱ در مسیر: ۴۰۳
        self.assertEqual(self.client.get(url(a1)).status_code, 403)


class PublicListQueryBudgetTests(PublicCaregiverProfileTests):
    def test_list_query_count_does_not_grow_with_page_size(self):
        for i in range(12):
            u = mk_user(f"0913{i:07d}", "caregiver", first_name=f"م{i}", last_name="ک")
            cg = CaregiverProfile.objects.create(user=u, status=CaregiverStatus.APPROVED, service_types=["salmandyar"])
            from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus
            AgencyCaregiverLink.objects.create(agency=self.home_agency, caregiver=cg, status=AgencyLinkStatus.APPROVED)
        self.client.force_authenticate(self.family)
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as q:
            res = self.client.get("/api/caregivers/public/")
        self.assertEqual(res.json()["count"], 13)
        self.assertLessEqual(len(q), 10)
