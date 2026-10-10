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


class PatientEthnicityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(mk("09127770002", "family"))

    def test_saves_valid_ethnicity_and_rejects_bad_subgroup(self):
        base = {"full_name": "الف", "relation": "child", "service_type": "salmandyar"}
        ok = self.client.post("/api/patients/", {**base, "ethnicities": ["kurd"], "ethnicity_details": {"kurd": ["sanandaji", "ilami"]}}, format="json")
        self.assertEqual(ok.status_code, 201, ok.content)
        self.assertEqual(ok.json()["ethnicity_details"], {"kurd": ["sanandaji", "ilami"]})
        bad = self.client.post("/api/patients/", {**base, "ethnicities": ["kurd"], "ethnicity_details": {"kurd": ["tabrizi"]}}, format="json")
        self.assertEqual(bad.status_code, 400)


class FamilyListAssignedCaregiverTests(TestCase):
    def test_list_includes_active_assigned_caregiver(self):
        from apps.care.models import CaregiverAssignment
        from apps.caregivers.models import CaregiverProfile, CaregiverStatus
        from apps.families.models import PatientProfile
        fam = mk("09127770003", "family")
        client = APIClient(); client.force_authenticate(fam)
        created = client.post("/api/patients/", {"full_name": "الف", "relation": "child"}, format="json")
        self.assertEqual(created.status_code, 201, created.content)
        self.assertEqual(client.get("/api/patients/").json()[0]["assigned_caregivers"], [])
        cg_user = mk("09127770004", "caregiver")
        cg = CaregiverProfile.objects.create(user=cg_user, status=CaregiverStatus.APPROVED)
        CaregiverAssignment.objects.create(caregiver=cg, patient=PatientProfile.objects.get(pk=created.json()["id"]))
        row = client.get("/api/patients/").json()[0]
        self.assertEqual(len(row["assigned_caregivers"]), 1)
        self.assertEqual(row["assigned_caregivers"][0]["id"], cg_user.id)
