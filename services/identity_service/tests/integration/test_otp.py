from unittest.mock import patch

from tests.base import BaseAPITestCase
from rest_framework.test import APIClient

from tests.factories.user_factory import make_user


class OTPFlowTests(BaseAPITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(username="otp_user", password="StrongPass123")
        login = self.client.post("/api/auth/login/", {
            "username": "otp_user", "password": "StrongPass123",
        }, format="json")
        self.access = login.data["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access}")

    def test_request_otp_requires_authentication(self):
        client = APIClient()  # no credentials
        response = client.post("/api/auth/otp/request/")
        self.assertEqual(response.status_code, 401)

    @patch("apps.authentication.services.send_otp_sms")
    def test_request_then_verify_with_correct_code_succeeds(self, mock_send):
        response = self.client.post("/api/auth/otp/request/")
        self.assertEqual(response.status_code, 202)

        # Capture the raw code exactly the way the real SMS gateway would
        # have received it — the task is mocked so we intercept its args
        # instead of hitting a real broker, but nothing else in the flow
        # is faked; verify still checks against the real hashed record.
        raw_code = mock_send.delay.call_args[0][2]

        response = self.client.post("/api/auth/otp/verify/", {"code": raw_code}, format="json")
        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_phone_verified)

    @patch("apps.authentication.services.send_otp_sms")
    def test_verify_with_wrong_code_fails_and_does_not_verify_phone(self, mock_send):
        self.client.post("/api/auth/otp/request/")

        response = self.client.post("/api/auth/otp/verify/", {"code": "000000"}, format="json")
        self.assertEqual(response.status_code, 400)

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_phone_verified)

    def test_verify_without_requesting_first_fails(self):
        response = self.client.post("/api/auth/otp/verify/", {"code": "123456"}, format="json")
        self.assertEqual(response.status_code, 400)

    @patch("apps.authentication.services.send_otp_sms")
    def test_requesting_new_otp_invalidates_previous_one(self, mock_send):
        self.client.post("/api/auth/otp/request/")
        first_code = mock_send.delay.call_args[0][2]

        self.client.post("/api/auth/otp/request/")  # second request

        # the first code must no longer work
        response = self.client.post("/api/auth/otp/verify/", {"code": first_code}, format="json")
        self.assertEqual(response.status_code, 400)

    @patch("apps.authentication.services.send_otp_sms")
    def test_five_wrong_attempts_exhausts_the_code(self, mock_send):
        self.client.post("/api/auth/otp/request/")

        for _ in range(5):
            response = self.client.post("/api/auth/otp/verify/", {"code": "000000"}, format="json")
            self.assertEqual(response.status_code, 400)

        # even the correct code should now be rejected — max attempts reached
        raw_code = mock_send.delay.call_args[0][2]
        response = self.client.post("/api/auth/otp/verify/", {"code": raw_code}, format="json")
        self.assertEqual(response.status_code, 400)
