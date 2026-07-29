"""
Brute-force login lockout, backed by Django's cache framework (Redis —
see config/settings/base.py for why LocMemCache would silently not work
correctly with multiple gunicorn workers).

Kept as its own small class (constructor-injectable into AuthService)
rather than hardcoded cache calls inline in authenticate(), so it can be
swapped or unit-tested independently.
"""
from django.core.cache import cache


class LoginAttemptGuard:
    MAX_ATTEMPTS = 5
    LOCKOUT_SECONDS = 5 * 60  # 5 minutes

    def _key(self, username: str) -> str:
        return f"login_attempts:{username}"

    def is_locked(self, username: str) -> bool:
        return cache.get(self._key(username), 0) >= self.MAX_ATTEMPTS

    def record_failure(self, username: str) -> int:
        key = self._key(username)
        attempts = cache.get(key, 0) + 1
        cache.set(key, attempts, timeout=self.LOCKOUT_SECONDS)
        return attempts

    def reset(self, username: str) -> None:
        cache.delete(self._key(username))
