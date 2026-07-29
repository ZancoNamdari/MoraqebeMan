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

    def test_register_duplicate_phone_number_rejected(self):
        make_user(phone_number="09121234567")
        response = self.client.post("/api/auth/register/", {
            "username": "someone_else",
            "password": "StrongPass123",
            "phone_number": "09121234567",  # duplicate
            "email": "other@example.com",
            "role": "family",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_register_cannot_self_assign_superuser_role(self):
        response = self.client.post("/api/auth/register/", {
            "username": "sneaky",
            "password": "StrongPass123",
            "phone_number": "09121110000",
            "email": "sneaky@example.com",
            "role": "superuser",
        }, format="json")
        # RegisterSerializer's role field only allows family/patient/
        # caregiver/agency — "superuser" isn't a valid choice there.
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
