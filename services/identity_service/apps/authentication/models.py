import random
import string
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone


class PhoneOTP(models.Model):
    """
    Short-lived one-time code for phone verification. The code itself is
    hashed at rest (same hasher Django uses for passwords) — even though
    it's only valid for a few minutes, there's no reason to keep a
    plaintext 6-digit code sitting in the database when hashing it costs
    nothing extra.
    """
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="phone_otps")
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)

    MAX_ATTEMPTS = 5
    VALID_MINUTES = 5

    @classmethod
    def issue_for(cls, user) -> tuple["PhoneOTP", str]:
        """Creates a new OTP, invalidating any previous unused ones for this user."""
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        raw_code = "".join(random.choices(string.digits, k=6))
        otp = cls.objects.create(
            user=user,
            code_hash=make_password(raw_code),
            expires_at=timezone.now() + timedelta(minutes=cls.VALID_MINUTES),
        )
        return otp, raw_code

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    def check_code(self, raw_code: str) -> bool:
        return check_password(raw_code, self.code_hash)


class PasswordResetToken(models.Model):
    """Same shape/lifecycle idea as PhoneOTP, separate model since the
    verification channel (link vs typed code) and validity window differ."""
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="password_reset_tokens")
    token_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    VALID_MINUTES = 15

    @classmethod
    def issue_for(cls, user) -> tuple["PasswordResetToken", str]:
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        raw_token = "".join(random.choices(string.ascii_letters + string.digits, k=32))
        token = cls.objects.create(
            user=user,
            token_hash=make_password(raw_token),
            expires_at=timezone.now() + timedelta(minutes=cls.VALID_MINUTES),
        )
        return token, raw_token

    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    def check_token(self, raw_token: str) -> bool:
        return check_password(raw_token, self.token_hash)
