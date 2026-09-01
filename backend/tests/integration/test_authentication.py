from unittest.mock import patch

from django.core.cache import cache
from tests.base import BaseAPITestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from tests.factories.user_factory import make_user


class RegisterViewTests(BaseAPITestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_success_returns_tokens(self):
        response = self.client.post("/api/auth/register/", {
            "first_name": "سارا", "last_name": "خانوادگی",
            "username": "sara_family",
            "password": "StrongPass123",
            "phone_number": "09121234567",
            "email": "sara@example.com",
            "role": "family",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])
        self.assertEqual(response.data["user"]["role"], "family")

    @patch("apps.authentication.services.send_welcome_notification")
    def test_register_triggers_welcome_notification(self, mock_welcome):
        """
        Regression test for a real, previously-flagged gap: this task
        had a working implementation but was never actually called
        from anywhere — genuinely dead code. Confirms it's wired up
        now, with the right user_id/phone_number.
        """
        response = self.client.post("/api/auth/register/", {
            "first_name": "سارا", "last_name": "خانوادگی",
            "username": "sara_welcome_test",
            "password": "StrongPass123",
            "phone_number": "09121234599",
            "email": "sara2@example.com",
            "role": "family",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        mock_welcome.delay.assert_called_once()
        called_args = mock_welcome.delay.call_args[0]
        self.assertEqual(called_args[1], "09121234599")

    @patch("apps.authentication.services.send_welcome_notification")
    def test_registration_still_succeeds_if_welcome_notification_fails_to_queue(self, mock_welcome):
        # Mirrors the exact same try/except pattern already used for
        # the password-reset SMS trigger — a failure here must never
        # block the actual registration.
        mock_welcome.delay.side_effect = Exception("broker unavailable")
        response = self.client.post("/api/auth/register/", {
            "first_name": "رضا", "last_name": "خانوادگی",
            "username": "reza_welcome_fail_test",
            "password": "StrongPass123",
            "phone_number": "09121234598",
            "role": "family",
        }, format="json")
        self.assertEqual(response.status_code, 201)

    def test_register_without_username_auto_generates_one(self):
        # The whole point of User.generate_username(): a caregiver
        # shouldn't have to invent a username at all.
        response = self.client.post("/api/auth/register/", {
            "first_name": "علی", "last_name": "محمدی",
            "password": "StrongPass123",
            "phone_number": "09121234599",
            "email": "ali@example.com",
            "role": "caregiver",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["user"]["username"])  # something was generated, non-empty

    def test_register_duplicate_phone_number_rejected(self):
        make_user(phone_number="09121234567")
        response = self.client.post("/api/auth/register/", {
            "first_name": "کسی", "last_name": "دیگر",
            "username": "someone_else",
            "password": "StrongPass123",
            "phone_number": "09121234567",  # duplicate
            "email": "other@example.com",
            "role": "family",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_register_cannot_self_assign_superuser_role(self):
        response = self.client.post("/api/auth/register/", {
            "first_name": "کاربر", "last_name": "مخرب",
            "username": "sneaky",
            "password": "StrongPass123",
            "phone_number": "09121110000",
            "email": "sneaky@example.com",
            "role": "superuser",
        }, format="json")
        # RegisterSerializer's role field only allows family/patient/
        # caregiver — "superuser" isn't a valid choice there.
        self.assertEqual(response.status_code, 400)

    def test_register_cannot_self_assign_agency_role(self):
        # AGENCY is a paying B2B account (contracts, billing, and the
        # ability to approve/reject other people's join requests) —
        # must be created deliberately, not through open self-
        # registration alongside ordinary consumer roles.
        response = self.client.post("/api/auth/register/", {
            "first_name": "شرکت", "last_name": "آزمایشی",
            "username": "sneaky_agency",
            "password": "StrongPass123",
            "phone_number": "09121110001",
            "email": "agency@example.com",
            "role": "agency",
        }, format="json")
        self.assertEqual(response.status_code, 400)


class LoginViewTests(BaseAPITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(username="sara", password="StrongPass123")
        cache.clear()  # lockout state is per-username in cache; keep tests isolated

    def tearDown(self):
        cache.clear()

    def test_login_success(self):
        response = self.client.post("/api/auth/login/", {
            "username": "sara", "password": "StrongPass123",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data["tokens"])

    def test_login_with_phone_number_instead_of_username(self):
        # make_user's default phone_number is 09120000001 — login with
        # that in the "username" field should work exactly like logging
        # in with the actual username.
        response = self.client.post("/api/auth/login/", {
            "username": "09120000001", "password": "StrongPass123",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data["tokens"])

    def test_login_wrong_password_returns_401(self):
        response = self.client.post("/api/auth/login/", {
            "username": "sara", "password": "wrong",
        }, format="json")
        self.assertEqual(response.status_code, 401)

    def test_login_locks_after_five_failed_attempts(self):
        for _ in range(5):
            response = self.client.post("/api/auth/login/", {
                "username": "sara", "password": "wrong",
            }, format="json")
            self.assertEqual(response.status_code, 401)

        # 6th attempt — even with the CORRECT password — must be locked.
        response = self.client.post("/api/auth/login/", {
            "username": "sara", "password": "StrongPass123",
        }, format="json")
        self.assertEqual(response.status_code, 423)

    def test_successful_login_resets_failed_attempt_counter(self):
        for _ in range(3):
            self.client.post("/api/auth/login/", {"username": "sara", "password": "wrong"}, format="json")

        # a successful login in between should reset the counter
        response = self.client.post("/api/auth/login/", {
            "username": "sara", "password": "StrongPass123",
        }, format="json")
        self.assertEqual(response.status_code, 200)

        # so two more failures afterward should NOT trigger lockout yet
        for _ in range(2):
            response = self.client.post("/api/auth/login/", {"username": "sara", "password": "wrong"}, format="json")
            self.assertEqual(response.status_code, 401)


class LogoutViewTests(BaseAPITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(username="logout_user", password="StrongPass123")
        cache.clear()

    def _login(self):
        response = self.client.post("/api/auth/login/", {
            "username": "logout_user", "password": "StrongPass123",
        }, format="json")
        return response.data["tokens"]

    def test_logout_blacklists_refresh_token(self):
        tokens = self._login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        response = self.client.post("/api/auth/logout/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, 204)

        # the blacklisted refresh token must now be rejected
        self.client.credentials()  # clear auth header, refresh endpoint doesn't need it
        response = self.client.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_logout_requires_authentication(self):
        response = self.client.post("/api/auth/logout/", {"refresh": "irrelevant"}, format="json")
        self.assertEqual(response.status_code, 401)


class MeViewTests(BaseAPITestCase):
    def setUp(self):
        self.client = APIClient()

    def test_me_requires_authentication(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 401)

    def test_me_returns_current_user(self):
        make_user(username="whoami", password="StrongPass123")
        login = self.client.post("/api/auth/login/", {
            "username": "whoami", "password": "StrongPass123",
        }, format="json")
        access = login.data["tokens"]["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "whoami")


class RegistrationWithoutPasswordTests(BaseAPITestCase):
    """Password is now optional at registration — OTP login means a
    family/patient account never needs to know or type one at all."""

    def setUp(self):
        self.client = APIClient()

    def test_register_without_password_succeeds(self):
        response = self.client.post("/api/auth/register/", {
            "first_name": "علی", "last_name": "رضایی", "phone_number": "09121230100", "role": "family",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("access", response.data["tokens"])

    def test_register_with_password_still_works(self):
        response = self.client.post("/api/auth/register/", {
            "first_name": "علی", "last_name": "رضایی", "phone_number": "09121230101",
            "password": "StrongPass123", "role": "family",
        }, format="json")
        self.assertEqual(response.status_code, 201)


class OTPLoginTests(BaseAPITestCase):
    """Passwordless login — phone number, then the SMS code, no
    username or password anywhere in the flow."""

    def setUp(self):
        self.client = APIClient()
        self.reg = self.client.post("/api/auth/register/", {
            "first_name": "زهرا", "last_name": "کریمی", "phone_number": "09121230110", "role": "family",
        }, format="json")

    def test_request_otp_login_always_returns_202(self):
        response = self.client.post("/api/auth/otp-login/request/", {"phone_number": "09121230110"}, format="json")
        self.assertEqual(response.status_code, 202)

    def test_request_for_nonexistent_phone_also_returns_202_no_enumeration(self):
        response = self.client.post("/api/auth/otp-login/request/", {"phone_number": "09190000000"}, format="json")
        self.assertEqual(response.status_code, 202)

    def test_wrong_code_rejected(self):
        self.client.post("/api/auth/otp-login/request/", {"phone_number": "09121230110"}, format="json")
        response = self.client.post("/api/auth/otp-login/verify/", {
            "phone_number": "09121230110", "code": "000000",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_correct_code_logs_in_and_returns_tokens(self):
        from apps.accounts.models import User
        from apps.authentication.models import PhoneOTP

        user = User.objects.get(phone_number="09121230110")
        _, raw_code = PhoneOTP.issue_for(user)

        response = self.client.post("/api/auth/otp-login/verify/", {
            "phone_number": "09121230110", "code": raw_code,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data["tokens"])
        self.assertEqual(response.data["user"]["phone_number"], "09121230110")

    def test_code_cannot_be_reused(self):
        from apps.accounts.models import User
        from apps.authentication.models import PhoneOTP

        user = User.objects.get(phone_number="09121230110")
        _, raw_code = PhoneOTP.issue_for(user)

        first = self.client.post("/api/auth/otp-login/verify/", {"phone_number": "09121230110", "code": raw_code}, format="json")
        self.assertEqual(first.status_code, 200)

        second = self.client.post("/api/auth/otp-login/verify/", {"phone_number": "09121230110", "code": raw_code}, format="json")
        self.assertEqual(second.status_code, 400)

    def test_login_via_otp_does_not_require_phone_to_be_previously_verified(self):
        # OTP login itself IS the verification — no separate
        # is_phone_verified precondition should block it.
        from apps.accounts.models import User
        from apps.authentication.models import PhoneOTP

        user = User.objects.get(phone_number="09121230110")
        self.assertFalse(user.is_phone_verified)
        _, raw_code = PhoneOTP.issue_for(user)
        response = self.client.post("/api/auth/otp-login/verify/", {"phone_number": "09121230110", "code": raw_code}, format="json")
        self.assertEqual(response.status_code, 200)
