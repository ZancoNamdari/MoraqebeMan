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
    def test_admin_sees_preview_even_when_pending_family_cannot(self):
        admin = mk_user("09124440000", "admin", first_name="a", last_name="b")
        self.client.force_authenticate(admin)
        res = self.client.get(f"/api/caregivers/{self.pending.user_id}/family-view/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "pending")
        self.assertNotIn("09122220000", res.content.decode())
        self.client.force_authenticate(self.family)
        self.assertEqual(self.client.get(f"/api/caregivers/{self.pending.user_id}/family-view/").status_code, 404)


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


class FamilyViewAgencyIsolationTests(PublicCaregiverProfileTests):
    """آژانس فقط پروفایل مراقبانِ تأییدشده‌ی خودش را ببیند؛ حدس زدن id در URL نباید کار کند."""

    def test_agency_sees_only_own_caregivers(self):
        from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus, AgencyProfile
        a1 = AgencyProfile.objects.create(user=mk_user("09125550001", "agency"), company_name="A1")
        a2 = AgencyProfile.objects.create(user=mk_user("09125550002", "agency"), company_name="A2")
        AgencyCaregiverLink.objects.create(agency=a1, caregiver=self.cg, status=AgencyLinkStatus.APPROVED)
        url = f"/api/caregivers/{self.cg_user.id}/family-view/"
        self.client.force_authenticate(a1.user)
        self.assertEqual(self.client.get(url).status_code, 200)
        self.client.force_authenticate(a2.user)
        self.assertEqual(self.client.get(url).status_code, 404)
