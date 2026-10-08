import tempfile

from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.caregivers.models import CaregiverProfile, CaregiverStatus, CaregiverDocumentUpload


class EnrichFakeCaregiversTests(TestCase):
    def setUp(self):
        for i in range(1, 4):
            u = User.objects.create_user(
                username=f"bulk_caregiver_{i}", password="x", role="caregiver",
                phone_number=f"98912000000{i}", email=f"c{i}@t.ir", first_name="", last_name="",
            )
            CaregiverProfile.objects.create(user=u, status=CaregiverStatus.PENDING)
        self.family = User.objects.create_user(
            username="bulk_family_1", password="x", role="family", phone_number="989129999999",
            email="f@t.ir", first_name="رضا", last_name="کریمی",
        )
        real = User.objects.create_user(username="real_cg", password="x", role="caregiver",
                                        phone_number="989121111111", email="r@t.ir", first_name="واقعی", last_name="کاربر")
        CaregiverProfile.objects.create(user=real, status=CaregiverStatus.PENDING)

    def test_enrich_makes_public_profile_complete_and_leaves_real_users(self):
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=tmp):
            call_command("enrich_fake_caregivers", "--approve", verbosity=0)
            call_command("enrich_fake_caregivers", "--approve", verbosity=0)  # idempotent
            self.assertEqual(CaregiverProfile.objects.filter(status=CaregiverStatus.APPROVED).count(), 3)
            self.assertEqual(CaregiverProfile.objects.get(user__username="real_cg").status, CaregiverStatus.PENDING)
            self.assertEqual(CaregiverDocumentUpload.objects.count(), 3)
            self.assertTrue(CaregiverDocumentUpload.objects.first().file.size > 1000)

            client = APIClient()
            client.force_authenticate(self.family)
            res = client.get("/api/caregivers/public/")
            self.assertEqual(res.json()["count"], 3)
            first = res.json()["results"][0]
            d = client.get(f"/api/caregivers/public/{first['id']}/").json()
            self.assertTrue(d["display_name"] and d["display_name"] != "مراقب")
            self.assertTrue(d["photo_url"])
            self.assertTrue(d["age"])
            self.assertTrue(d["services"])
            self.assertTrue(d["skills"]["caregiving"])
            self.assertTrue(d["highlights"] is not None)
            self.assertEqual(sum(d["rating_distribution"].values()), d["review_count"])
