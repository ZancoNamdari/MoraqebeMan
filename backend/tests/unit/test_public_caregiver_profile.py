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
            caregiver=self.cg, trait_profiles=[{"id": "x", "title": "t", "traits": []}],
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
        for secret in ("09121110000", "0012345678", "secret", "02112345678", "احمدی"):
            self.assertNotIn(secret, body)
        self.assertEqual(res.json()["results"][0]["display_name"], "مریم ا.")

    def test_detail_includes_trait_profiles_and_404s_unapproved(self):
        self.client.force_authenticate(self.family)
        ok = self.client.get(f"/api/caregivers/public/{self.cg_user.id}/")
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()["trait_profiles"][0]["id"], "x")
        self.assertNotIn("0012345678", ok.content.decode())
        self.assertEqual(self.client.get(f"/api/caregivers/public/{self.pending.user_id}/").status_code, 404)

    def test_service_type_filter(self):
        self.client.force_authenticate(self.family)
        self.assertEqual(self.client.get("/api/caregivers/public/?service_type=salmandyar").json()["count"], 1)
        self.assertEqual(self.client.get("/api/caregivers/public/?service_type=parastar").json()["count"], 0)
