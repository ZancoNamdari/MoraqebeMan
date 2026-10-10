from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User


def mk(username, role):
    return User.objects.create_user(
        username=username, password="x", role=role, phone_number="98" + username[1:], email=f"{username}@t.ir",
    )


class PatientServiceTypeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(mk("09127770001", "family"))

    def _create(self, **extra):
        return self.client.post(
            "/api/patients/", {"full_name": "کودک تست", "relation": "child", **extra}, format="json",
        )

    def test_service_type_and_subtype_saved(self):
        res = self._create(service_type="madaryar", service_subtype="newborn")
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["service_type"], "madaryar")
        self.assertEqual(res.json()["service_subtype"], "newborn")

    def test_legacy_without_service_type_still_works(self):
        res = self._create()
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.json()["service_type"], "")

    def test_rejects_unknown_type_and_mismatched_subtype(self):
        self.assertEqual(self._create(service_type="nope").status_code, 400)
        self.assertEqual(self._create(service_type="salmandyar", service_subtype="newborn").status_code, 400)
        self.assertEqual(self._create(service_type="madaryar", service_subtype="inside_home").status_code, 400)
