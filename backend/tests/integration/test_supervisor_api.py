from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.authentication.services import SimpleJWTTokenIssuer
from apps.caregivers.models import CaregiverProfile, IdentityProfile

VALID_IDENTITY = {
    "father_name": "رضا", "birth_certificate_number": "123", "birth_certificate_issue_place": "تهران",
    "birth_date": "1360-01-01", "gender": "male", "marital_status": "single", "children_count": "none",
    "has_chronic_disease": False, "takes_permanent_medication": False,
    "emergency_contact_phone": "09121110000", "emergency_contact_relation": "father",
    "postal_code": "1234567890",
    "full_address": "خیابان ولیعصر",
}

VALID_WORK_PREFS = {
    "collaboration_types": ["daily"], "work_status": "full_time", "family_presence_preference": "no_preference",
    "accepted_gender": "no_preference", "accepted_age_ranges": ["60_70"], "offered_services": ["companionship"],
    "accepted_physical_conditions": ["independent"], "lifting_capacity": "up_to_50kg",
    "service_locations": ["patient_home"], "available_days": ["saturday"], "available_shifts": ["morning"],
    "terms_accepted": True,
}

TWO_REFERENCES = {"references": [
    {"full_name": "علی", "occupation": "پزشک", "relation_type": "family", "phone_number": "09120000001"},
    {"full_name": "زهرا", "occupation": "پرستار", "relation_type": "friends", "phone_number": "09120000002"},
]}


def _make_supervisor(username="supervisor1"):
    user = User.objects.create(
        username=username, phone_number=f"0910000{User.objects.count():04d}", email=f"{username}@a.com",
        role=UserRole.ADMIN, first_name="ناظر", last_name="یک",
    )
    user.set_password("pass12345")
    user.save()
    user.groups.add(Group.objects.get(name="ناظران مراقب"))
    return user


class SupervisorCreateCaregiverTests(TestCase):
    def setUp(self):
        self.supervisor = _make_supervisor()
        self.client = APIClient()
        token = SimpleJWTTokenIssuer().issue(self.supervisor)["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_create_caregiver_success(self):
        response = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "علی", "last_name": "محمدی", "phone_number": "09121234567",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("user_id", response.data)
        self.assertTrue(response.data["username"])  # auto-generated, non-empty

        user = User.objects.get(id=response.data["user_id"])
        self.assertEqual(user.role, "caregiver")
        self.assertTrue(CaregiverProfile.objects.filter(user=user).exists())

    def test_duplicate_phone_rejected(self):
        self.client.post("/api/supervisor/caregivers/", {
            "first_name": "علی", "last_name": "محمدی", "phone_number": "09121234567",
        }, format="json")
        response = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "کسی", "last_name": "دیگر", "phone_number": "09121234567",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_list_shows_progress(self):
        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "علی", "last_name": "محمدی", "phone_number": "09121234567",
        }, format="json")
        cg_id = create.data["user_id"]

        response = self.client.get("/api/supervisor/caregivers/")
        self.assertEqual(response.status_code, 200)
        row = next(r for r in response.data if r["user_id"] == cg_id)
        self.assertEqual(row["forms_completed"], 0)

        self.client.put(f"/api/supervisor/caregivers/{cg_id}/identity/", VALID_IDENTITY, format="json")
        response = self.client.get("/api/supervisor/caregivers/")
        row = next(r for r in response.data if r["user_id"] == cg_id)
        self.assertEqual(row["forms_completed"], 1)

    def test_non_supervisor_gets_403(self):
        caregiver = User.objects.create(username="cg1", phone_number="09129990000", email="c@a.com", role=UserRole.CAREGIVER)
        caregiver.set_password("x")
        caregiver.save()
        token = SimpleJWTTokenIssuer().issue(caregiver)["access"]
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = client.get("/api/supervisor/caregivers/")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_rejected(self):
        client = APIClient()
        response = client.get("/api/supervisor/caregivers/")
        self.assertEqual(response.status_code, 401)

    def test_delete_caregiver(self):
        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "حذف", "last_name": "شونده", "phone_number": "09121230009",
        }, format="json")
        cg_id = create.data["user_id"]

        response = self.client.delete(f"/api/supervisor/caregivers/{cg_id}/")
        self.assertEqual(response.status_code, 204)

        # gone from the list
        listing = self.client.get("/api/supervisor/caregivers/")
        self.assertFalse(any(row["user_id"] == cg_id for row in listing.data))

        # deleting again is a 404, not a crash
        response2 = self.client.delete(f"/api/supervisor/caregivers/{cg_id}/")
        self.assertEqual(response2.status_code, 404)

    def test_delete_nonexistent_caregiver_returns_404(self):
        response = self.client.delete("/api/supervisor/caregivers/999999/")
        self.assertEqual(response.status_code, 404)

    def test_list_shows_who_created_each_caregiver(self):
        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "ت", "last_name": "خ", "phone_number": "09121230020",
        }, format="json")
        cg_id = create.data["user_id"]

        response = self.client.get("/api/supervisor/caregivers/")
        row = next(r for r in response.data if r["user_id"] == cg_id)
        self.assertEqual(row["created_by"], f"{self.supervisor.username}({self.supervisor.role})")

    def test_created_by_distinguishes_superuser_from_admin(self):
        # The whole point of the username(role) format is telling
        # different actors apart at a glance - confirm it actually
        # differs for a SUPERUSER-created row, not just admin.
        superuser = User.objects.create(
            username="rootuser", phone_number="09100009998", email="root@a.com",
            role=UserRole.SUPERUSER, first_name="ریشه", last_name="کاربر",
        )
        superuser.set_password("pass12345")
        superuser.save()
        token = SimpleJWTTokenIssuer().issue(superuser)["access"]
        su_client = APIClient()
        su_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        create = su_client.post("/api/supervisor/caregivers/", {
            "first_name": "س", "last_name": "س", "phone_number": "09121230021",
        }, format="json")
        cg_id = create.data["user_id"]

        response = self.client.get("/api/supervisor/caregivers/")
        row = next(r for r in response.data if r["user_id"] == cg_id)
        self.assertEqual(row["created_by"], "rootuser(superuser)")

    def test_create_writes_an_audit_log_entry(self):
        from apps.audit.models import AuditEventType, AuditLog

        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "ت", "last_name": "خ", "phone_number": "09121230021",
        }, format="json")
        cg_id = create.data["user_id"]

        entry = AuditLog.objects.filter(
            event_type=AuditEventType.CAREGIVER_CREATED, target_user_id=cg_id
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.actor_user_id, self.supervisor.id)

    def test_editing_a_form_writes_an_audit_log_entry_naming_the_section(self):
        from apps.audit.models import AuditEventType, AuditLog

        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "ت", "last_name": "خ", "phone_number": "09121230022",
        }, format="json")
        cg_id = create.data["user_id"]

        self.client.put(f"/api/supervisor/caregivers/{cg_id}/work-preferences/", {"terms_accepted": True}, format="json")

        entry = AuditLog.objects.filter(
            event_type=AuditEventType.CAREGIVER_UPDATED, target_user_id=cg_id
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.metadata.get("section"), "work_preferences")

    def test_delete_writes_an_audit_log_entry_before_the_record_is_gone(self):
        from apps.audit.models import AuditEventType, AuditLog

        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "ت", "last_name": "خ", "phone_number": "09121230023",
        }, format="json")
        cg_id = create.data["user_id"]

        self.client.delete(f"/api/supervisor/caregivers/{cg_id}/")

        entry = AuditLog.objects.filter(
            event_type=AuditEventType.CAREGIVER_DELETED, target_user_id=cg_id
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.actor_user_id, self.supervisor.id)

    def test_get_basic_info(self):
        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "علی", "last_name": "محمدی", "phone_number": "09121230010",
        }, format="json")
        cg_id = create.data["user_id"]

        response = self.client.get(f"/api/supervisor/caregivers/{cg_id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["first_name"], "علی")
        self.assertEqual(response.data["phone_number"], "09121230010")

    def test_patch_fixes_a_typo_in_the_name(self):
        # The exact reported scenario: create with a typo, fix it after.
        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "علei", "last_name": "محمدی", "phone_number": "09121230011",
        }, format="json")
        cg_id = create.data["user_id"]

        response = self.client.patch(f"/api/supervisor/caregivers/{cg_id}/", {
            "first_name": "علی", "last_name": "محمدی", "phone_number": "09121230011",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["first_name"], "علی")

        confirm = self.client.get(f"/api/supervisor/caregivers/{cg_id}/")
        self.assertEqual(confirm.data["first_name"], "علی")

    def test_patch_to_a_phone_already_used_by_someone_else_rejected(self):
        self.client.post("/api/supervisor/caregivers/", {
            "first_name": "اول", "last_name": "نفر", "phone_number": "09121230012",
        }, format="json")
        create2 = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "دوم", "last_name": "نفر", "phone_number": "09121230013",
        }, format="json")
        cg2_id = create2.data["user_id"]

        response = self.client.patch(f"/api/supervisor/caregivers/{cg2_id}/", {
            "first_name": "دوم", "last_name": "نفر", "phone_number": "09121230012",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_patch_keeping_the_same_phone_number_is_fine(self):
        # Regression check for the exclude-self logic in the
        # uniqueness validator — saving without changing the phone at
        # all shouldn't collide with the caregiver's own existing row.
        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "قدیمی", "last_name": "نام", "phone_number": "09121230014",
        }, format="json")
        cg_id = create.data["user_id"]

        response = self.client.patch(f"/api/supervisor/caregivers/{cg_id}/", {
            "first_name": "جدید", "last_name": "نام", "phone_number": "09121230014",
        }, format="json")
        self.assertEqual(response.status_code, 200)


class SupervisorFullWizardFlowTests(TestCase):
    """The complete Step 0 -> Step 4 flow in one continuous pass,
    mirroring exactly what the frontend wizard will do."""
    def setUp(self):
        self.supervisor = _make_supervisor()
        self.client = APIClient()
        token = SimpleJWTTokenIssuer().issue(self.supervisor)["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        create = self.client.post("/api/supervisor/caregivers/", {
            "first_name": "علی", "last_name": "محمدی", "phone_number": "09121234567",
        }, format="json")
        self.cg_id = create.data["user_id"]

        from apps.locations.models import Province
        tehran = Province.objects.get(name="تهران")
        self.tehran_city = tehran.cities.get(name="تهران")
        self.tehran_district = self.tehran_city.districts.first()

    def test_full_flow_completes_all_four_forms(self):
        r1 = self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/identity/", VALID_IDENTITY, format="json")
        self.assertEqual(r1.status_code, 201)

        r2 = self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/work-preferences/", VALID_WORK_PREFS, format="json")
        self.assertEqual(r2.status_code, 201)

        r3 = self.client.post(f"/api/supervisor/caregivers/{self.cg_id}/service-areas/", {
            "province": self.tehran_city.province_id, "city": self.tehran_city.id, "district": self.tehran_district.id,
        }, format="json")
        self.assertEqual(r3.status_code, 201)

        r4 = self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/experience/", {
            "elderly_care_experience": "1_to_5_years",
        }, format="json")
        self.assertEqual(r4.status_code, 201)

        r5 = self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/skills/", {
            "education_level": "diploma",
        }, format="json")
        self.assertEqual(r5.status_code, 201)

        r6 = self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/references/", TWO_REFERENCES, format="json")
        self.assertEqual(r6.status_code, 201)

        progress = self.client.get(f"/api/supervisor/caregivers/{self.cg_id}/progress/")
        self.assertEqual(progress.status_code, 200)
        self.assertEqual(progress.data["missing"], [])
        for field in ["identity_done", "work_preferences_done", "experience_done", "skills_done", "references_done"]:
            self.assertTrue(progress.data[field], field)

    def test_progress_shows_specific_missing_forms(self):
        self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/identity/", VALID_IDENTITY, format="json")
        response = self.client.get(f"/api/supervisor/caregivers/{self.cg_id}/progress/")
        self.assertTrue(response.data["identity_done"])
        self.assertFalse(response.data["work_preferences_done"])
        self.assertGreater(len(response.data["missing"]), 0)

    def test_editing_an_already_filled_form_updates_not_duplicates(self):
        self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/identity/", VALID_IDENTITY, format="json")
        updated = dict(VALID_IDENTITY, father_name="محمد")
        response = self.client.put(f"/api/supervisor/caregivers/{self.cg_id}/identity/", updated, format="json")
        self.assertEqual(response.status_code, 200)  # 200, not 201 — update
        self.assertEqual(IdentityProfile.objects.filter(user_id=self.cg_id).count(), 1)
        self.assertEqual(response.data["father_name"], "محمد")

    def test_nonexistent_caregiver_returns_404(self):
        response = self.client.get("/api/supervisor/caregivers/999999/progress/")
        self.assertEqual(response.status_code, 404)

    def test_empty_string_birth_date_treated_as_no_value_not_format_error(self):
        # Regression test: the frontend's three-dropdown Jalali picker
        # reports "" until day/month/year are all selected — that used
        # to be misread as a badly-formatted date instead of "no date
        # given yet", which is what it actually means for an optional
        # field.
        response = self.client.put(
            f"/api/supervisor/caregivers/{self.cg_id}/identity/",
            {**VALID_IDENTITY, "birth_date": ""}, format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["birth_date"])
