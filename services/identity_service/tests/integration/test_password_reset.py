from unittest.mock import patch

from tests.base import BaseAPITestCase
from rest_framework.test import APIClient

from tests.factories.user_factory import make_user


class PasswordResetTests(BaseAPITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(
            username="reset_user", password="OldPass123", phone_number="09129998877"
        )

    def test_request_reset_for_unknown_phone_still_returns_202(self):
        # Enumeration protection — must not reveal whether the phone
        # number belongs to a real account.
        response = self.client.post("/api/auth/password-reset/", {
            "phone_number": "09120000099",
        }, format="json")
        self.assertEqual(response.status_code, 202)

    @patch("apps.authentication.services.send_password_reset_sms")
    def test_full_reset_flow_changes_password(self, mock_send):
        response = self.client.post("/api/auth/password-reset/", {
            "phone_number": "09129998877",
        }, format="json")
        self.assertEqual(response.status_code, 202)

        raw_token = mock_send.delay.call_args[0][2]

        response = self.client.post("/api/auth/password-reset/confirm/", {
            "phone_number": "09129998877",
            "token": raw_token,
            "new_password": "BrandNewPass456",
        }, format="json")
        self.assertEqual(response.status_code, 200)

        # old password no longer works, new one does
        login = self.client.post("/api/auth/login/", {
            "username": "reset_user", "password": "OldPass123",
        }, format="json")
        self.assertEqual(login.status_code, 401)

        login = self.client.post("/api/auth/login/", {
            "username": "reset_user", "password": "BrandNewPass456",
        }, format="json")
        self.assertEqual(login.status_code, 200)

    def test_confirm_with_wrong_token_fails(self):
        self.client.post("/api/auth/password-reset/", {"phone_number": "09129998877"}, format="json")

        response = self.client.post("/api/auth/password-reset/confirm/", {
            "phone_number": "09129998877",
            "token": "totally-wrong-token",
            "new_password": "BrandNewPass456",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    @patch("apps.authentication.services.send_password_reset_sms")
    def test_token_cannot_be_reused(self, mock_send):
        self.client.post("/api/auth/password-reset/", {"phone_number": "09129998877"}, format="json")
        raw_token = mock_send.delay.call_args[0][2]

        first = self.client.post("/api/auth/password-reset/confirm/", {
            "phone_number": "09129998877", "token": raw_token, "new_password": "FirstNewPass1",
        }, format="json")
        self.assertEqual(first.status_code, 200)

        second = self.client.post("/api/auth/password-reset/confirm/", {
            "phone_number": "09129998877", "token": raw_token, "new_password": "SecondNewPass2",
        }, format="json")
        self.assertEqual(second.status_code, 400)
