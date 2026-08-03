"""
End-to-end tests for the "temp dashboard" — the simplified Django-
admin-based flow for a supervisor (ADMIN role) to enter a caregiver's
data without going through seven separate admin "Add" screens.
"""
from django.contrib.auth.models import Group
from django.test import TestCase

from apps.accounts.models import User, UserRole
from apps.caregivers.models import CaregiverProfile, IdentityProfile

IDENTITY_INLINE_PAYLOAD = {
    "caregiver_identity_profile-TOTAL_FORMS": "1", "caregiver_identity_profile-INITIAL_FORMS": "0",
    "caregiver_identity_profile-MIN_NUM_FORMS": "0", "caregiver_identity_profile-MAX_NUM_FORMS": "1",
    "caregiver_identity_profile-0-father_name": "رضا",
    "caregiver_identity_profile-0-birth_certificate_number": "123",
    "caregiver_identity_profile-0-birth_certificate_issue_place": "تهران",
    "caregiver_identity_profile-0-birth_date": "1360-01-01",
    "caregiver_identity_profile-0-gender": "male",
    "caregiver_identity_profile-0-marital_status": "single",
    "caregiver_identity_profile-0-children_count": "none",
    "caregiver_identity_profile-0-emergency_contact_phone": "09121110000",
    "caregiver_identity_profile-0-emergency_contact_relation": "father",
    "caregiver_identity_profile-0-postal_code": "1234567890",
    "caregiver_identity_profile-0-full_address": "خیابان ولیعصر",
}


class SupervisorGroupPermissionTests(TestCase):
    def test_supervisor_group_has_expected_permissions_only(self):
        group = Group.objects.get(name="ناظران مراقب")
        codenames = sorted(p.codename for p in group.permissions.all())
        # exactly 8 models x 3 permission types (add/change/view) — no delete
        self.assertEqual(len(codenames), 24)
        self.assertIn("add_user", codenames)
        self.assertIn("view_identityprofile", codenames)
        self.assertNotIn("delete_user", codenames)
        self.assertNotIn("delete_caregiverprofile", codenames)


class SupervisorDashboardFlowTests(TestCase):
    def setUp(self):
        self.supervisor = User.objects.create(
            username="supervisor1", phone_number="09100000001", email="sup@a.com",
            role=UserRole.ADMIN, first_name="ناظر", last_name="یک",
        )
        self.supervisor.set_password("pass12345")
        self.supervisor.save()
        self.supervisor.groups.add(Group.objects.get(name="ناظران مراقب"))
        self.client.force_login(self.supervisor)

    def test_full_two_step_flow_creates_user_and_identity_together(self):
        # Step 1: Add User screen — Django's UserAdmin only takes
        # username+password up front, this is inherent to how it works
        # and not something worth working around.
        r1 = self.client.post("/admin/accounts/user/add/", {
            "username": "caregiver_test1", "password1": "CgPass12345", "password2": "CgPass12345",
        })
        self.assertEqual(r1.status_code, 302)
        cg_user = User.objects.get(username="caregiver_test1")

        # Step 2: on the SAME change page, set role/name/phone AND fill
        # the whole identity form, all in one save — this is the actual
        # simplification: one page instead of two separate add-forms.
        r2 = self.client.post(f"/admin/accounts/user/{cg_user.id}/change/", {
            "username": "caregiver_test1", "first_name": "علی", "last_name": "محمدی",
            "phone_number": "09121234567", "role": "caregiver", "email": "ali@example.com",
            "date_joined_0": "2026-08-01", "date_joined_1": "00:00:00",
            **IDENTITY_INLINE_PAYLOAD,
        })
        self.assertEqual(r2.status_code, 302)

        cg_user.refresh_from_db()
        self.assertEqual(cg_user.role, "caregiver")
        self.assertTrue(IdentityProfile.objects.filter(user=cg_user).exists())
        identity = IdentityProfile.objects.get(user=cg_user)
        self.assertEqual(identity.full_name, "علی محمدی")

    def test_caregiver_profile_add_page_has_every_form_inlined(self):
        # Confirms the second screen genuinely has Forms 2-4 all in one
        # place, not scattered across separate add-forms.
        response = self.client.get("/admin/caregivers/caregiverprofile/add/")
        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        for expected_field in [
            "work_status",              # Form 2 — work preferences
            "elderly_care_experience",  # Form 3, part 1 — experience
            "education_level",          # Form 3, part 2 — skills
            "callable_for_inquiry",     # Form 4 — references
        ]:
            self.assertIn(expected_field, content)

    def test_non_staff_caregiver_redirected_to_login(self):
        # A plain CAREGIVER-role account isn't is_staff at all (only
        # ADMIN/SUPERUSER get that), so hitting any admin URL redirects
        # to the login page — never even gets to a permission check.
        caregiver = User.objects.create(
            username="justacaregiver", phone_number="09129998877", email="c@a.com", role=UserRole.CAREGIVER,
        )
        caregiver.set_password("pass12345")
        caregiver.save()
        client = self.client_class()
        client.force_login(caregiver)
        response = client.get("/admin/caregivers/caregiverprofile/add/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/login/", response.url)

    def test_admin_role_not_in_supervisor_group_gets_403(self):
        # is_staff=True gets someone into the admin site, but not the
        # specific add/change/view permissions this dashboard needs —
        # those only come from being in the "ناظران مراقب" group. An
        # ADMIN-role user NOT added to that group should be correctly
        # refused, not silently allowed through just because they're
        # staff.
        unrelated_admin = User.objects.create(
            username="other_admin", phone_number="09129998866", email="oa@a.com", role=UserRole.ADMIN,
        )
        unrelated_admin.set_password("pass12345")
        unrelated_admin.save()
        client = self.client_class()
        client.force_login(unrelated_admin)
        response = client.get("/admin/caregivers/caregiverprofile/add/")
        self.assertEqual(response.status_code, 403)
