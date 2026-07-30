from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.authentication.models import PasswordResetToken, PhoneOTP
from tests.factories.user_factory import make_user


class PhoneOTPModelTests(TestCase):
    def setUp(self):
        self.user = make_user(username="otp_model_user")

    def test_issue_for_returns_matching_hash_and_raw_code(self):
        otp, raw_code = PhoneOTP.issue_for(self.user)
        self.assertEqual(len(raw_code), 6)
        self.assertTrue(raw_code.isdigit())
        self.assertTrue(otp.check_code(raw_code))

        wrong_code = "1" * 6 if raw_code != "1" * 6 else "2" * 6
        self.assertFalse(otp.check_code(wrong_code))

    def test_issue_for_invalidates_previous_otp(self):
        first, first_code = PhoneOTP.issue_for(self.user)
        second, second_code = PhoneOTP.issue_for(self.user)

        first.refresh_from_db()
        self.assertTrue(first.is_used)
        self.assertFalse(second.is_used)

    def test_is_expired(self):
        otp, _ = PhoneOTP.issue_for(self.user)
        self.assertFalse(otp.is_expired())

        otp.expires_at = timezone.now() - timedelta(seconds=1)
        otp.save()
        self.assertTrue(otp.is_expired())


class PasswordResetTokenModelTests(TestCase):
    def setUp(self):
        self.user = make_user(username="reset_model_user")

    def test_issue_for_returns_matching_hash_and_raw_token(self):
        token, raw_token = PasswordResetToken.issue_for(self.user)
        self.assertEqual(len(raw_token), 32)
        self.assertTrue(token.check_token(raw_token))

    def test_wrong_token_does_not_match(self):
        token, raw_token = PasswordResetToken.issue_for(self.user)
        self.assertFalse(token.check_token("not-the-right-token"))
