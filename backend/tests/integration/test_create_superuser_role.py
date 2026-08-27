from django.test import TestCase

from apps.accounts.models import User, UserRole


class CreateSuperuserSetsRoleTests(TestCase):
    """
    Regression test for a real, reported gap: `python manage.py
    createsuperuser` is a Django built-in command that only knows
    about is_staff/is_superuser — the framework's own permission
    flags. It has no idea this project also has its own `role` field,
    which is what every API permission check and every panel's
    frontend role-gate actually uses. Before the UserManager override,
    an account created this way had is_superuser=True but
    role="family" (the field's default) — a real person hit this
    exact case and could not log into superuser-panel at all, with a
    confusing "wrong role" message despite having just run the
    documented Django command to create a superuser.
    """

    def test_create_superuser_sets_role_to_superuser(self):
        user = User.objects.create_superuser(
            username="root_test", email="root@example.com",
            password="StrongPass123", phone_number="09121900001",
        )
        self.assertEqual(user.role, UserRole.SUPERUSER)
        self.assertTrue(user.is_superuser)  # Django's own flag still set too
        self.assertTrue(user.is_staff)

    def test_create_superuser_does_not_override_an_explicitly_passed_role(self):
        # Extremely unlikely anyone would do this, but setdefault()
        # rather than a hard overwrite means an explicit role= kwarg
        # (e.g. from a script) is still respected, not silently
        # clobbered.
        user = User.objects.create_superuser(
            username="root_test2", email="root2@example.com",
            password="StrongPass123", phone_number="09121900002",
            role=UserRole.ADMIN,
        )
        self.assertEqual(user.role, UserRole.ADMIN)
        self.assertTrue(user.is_superuser)  # still a real Django superuser regardless

    def test_regular_create_user_is_unaffected(self):
        # Confirms this override is scoped to create_superuser only —
        # normal registration must keep defaulting to FAMILY.
        user = User.objects.create_user(
            username="regular_test", email="regular@example.com",
            password="StrongPass123", phone_number="09121900003",
        )
        self.assertEqual(user.role, UserRole.FAMILY)
        self.assertFalse(user.is_superuser)
