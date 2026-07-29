from django.core.cache import cache
from django.test import TestCase

from apps.authentication.lockout import LoginAttemptGuard


class LoginAttemptGuardTests(TestCase):
    def setUp(self):
        cache.clear()
        self.guard = LoginAttemptGuard()

    def tearDown(self):
        cache.clear()

    def test_not_locked_initially(self):
        self.assertFalse(self.guard.is_locked("someuser"))

    def test_locks_after_max_attempts(self):
        for _ in range(LoginAttemptGuard.MAX_ATTEMPTS):
            self.guard.record_failure("someuser")
        self.assertTrue(self.guard.is_locked("someuser"))

    def test_not_locked_below_max_attempts(self):
        for _ in range(LoginAttemptGuard.MAX_ATTEMPTS - 1):
            self.guard.record_failure("someuser")
        self.assertFalse(self.guard.is_locked("someuser"))

    def test_reset_clears_lockout(self):
        for _ in range(LoginAttemptGuard.MAX_ATTEMPTS):
            self.guard.record_failure("someuser")
        self.assertTrue(self.guard.is_locked("someuser"))

        self.guard.reset("someuser")
        self.assertFalse(self.guard.is_locked("someuser"))

    def test_different_usernames_tracked_independently(self):
        for _ in range(LoginAttemptGuard.MAX_ATTEMPTS):
            self.guard.record_failure("user_a")
        self.assertTrue(self.guard.is_locked("user_a"))
        self.assertFalse(self.guard.is_locked("user_b"))
