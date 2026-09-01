from unittest.mock import Mock, patch

from django.test import TestCase, override_settings

from apps.authentication.tasks import send_otp_sms, send_password_reset_sms, send_urgent_alert_sms


class SendOtpSmsTests(TestCase):
    """
    No existing test exercised this task's actual internal branching
    (existing OTP flow tests only @patch the whole task away at the
    service layer) — added here specifically because
    send_password_reset_sms below mirrors this exact logic, and a
    real bug in one would very plausibly be the same bug in the
    other.
    """

    @override_settings(KAVENEGAR_API_KEY="")
    def test_logs_only_when_no_api_key_configured(self):
        result = send_otp_sms(1, "09121234567", "123456")
        self.assertEqual(result["status"], "logged_only_no_gateway_configured")

    @override_settings(KAVENEGAR_API_KEY="fake-key", KAVENEGAR_OTP_TEMPLATE="verify")
    @patch("apps.authentication.tasks.requests.get")
    def test_calls_kavenegar_with_correct_params_when_configured(self, mock_get):
        mock_get.return_value = Mock(
            raise_for_status=Mock(), json=Mock(return_value={"return": {"status": 200}}),
        )
        result = send_otp_sms(1, "09121234567", "123456")

        self.assertEqual(result["status"], "sent")
        called_url, called_kwargs = mock_get.call_args
        self.assertIn("fake-key", called_url[0])
        self.assertEqual(called_kwargs["params"]["receptor"], "09121234567")
        self.assertEqual(called_kwargs["params"]["token"], "123456")
        self.assertEqual(called_kwargs["params"]["template"], "verify")

    @override_settings(KAVENEGAR_API_KEY="fake-key")
    @patch("apps.authentication.tasks.requests.get")
    def test_reports_gateway_failure_without_raising(self, mock_get):
        mock_get.return_value = Mock(
            raise_for_status=Mock(), json=Mock(return_value={"return": {"status": 400}}),
        )
        result = send_otp_sms(1, "09121234567", "123456")
        self.assertEqual(result["status"], "gateway_reported_failure")


class SendPasswordResetSmsTests(TestCase):
    """
    Regression test for a real, previously-flagged gap: this task was
    a pure placeholder regardless of configuration, meaning any
    password-based account (agency, admin, superuser, supervisor —
    every role not on the OTP-login path) had no real way to recover
    a forgotten password in production, since the "SMS" only ever
    reached a server log the affected person could never see. Now
    mirrors send_otp_sms's real-gateway-with-log-only-fallback
    pattern exactly — these tests mirror the ones above, on purpose,
    to prove the two tasks actually behave the same way.
    """

    @override_settings(KAVENEGAR_API_KEY="")
    def test_logs_only_when_no_api_key_configured(self):
        result = send_password_reset_sms(1, "09121234567", "reset-token-abc")
        self.assertEqual(result["status"], "logged_only_no_gateway_configured")

    @override_settings(KAVENEGAR_API_KEY="fake-key", KAVENEGAR_PASSWORD_RESET_TEMPLATE="password-reset")
    @patch("apps.authentication.tasks.requests.get")
    def test_calls_kavenegar_with_correct_params_when_configured(self, mock_get):
        mock_get.return_value = Mock(
            raise_for_status=Mock(), json=Mock(return_value={"return": {"status": 200}}),
        )
        result = send_password_reset_sms(1, "09121234567", "reset-token-abc")

        self.assertEqual(result["status"], "sent")
        called_url, called_kwargs = mock_get.call_args
        self.assertIn("fake-key", called_url[0])
        self.assertEqual(called_kwargs["params"]["receptor"], "09121234567")
        self.assertEqual(called_kwargs["params"]["token"], "reset-token-abc")
        self.assertEqual(called_kwargs["params"]["template"], "password-reset")

    @override_settings(KAVENEGAR_API_KEY="fake-key", KAVENEGAR_OTP_TEMPLATE="verify", KAVENEGAR_PASSWORD_RESET_TEMPLATE="password-reset")
    @patch("apps.authentication.tasks.requests.get")
    def test_uses_a_different_template_than_otp(self, mock_get):
        # The whole reason KAVENEGAR_PASSWORD_RESET_TEMPLATE is a
        # separate setting from KAVENEGAR_OTP_TEMPLATE — Kavenegar
        # requires each distinct message template pre-registered
        # individually, so this must never accidentally collapse to
        # reusing the OTP template.
        mock_get.return_value = Mock(
            raise_for_status=Mock(), json=Mock(return_value={"return": {"status": 200}}),
        )
        send_password_reset_sms(1, "09121234567", "reset-token-abc")
        _, called_kwargs = mock_get.call_args
        self.assertEqual(called_kwargs["params"]["template"], "password-reset")
        self.assertNotEqual(called_kwargs["params"]["template"], "verify")

    @override_settings(KAVENEGAR_API_KEY="fake-key")
    @patch("apps.authentication.tasks.requests.get")
    def test_reports_gateway_failure_without_raising(self, mock_get):
        mock_get.return_value = Mock(
            raise_for_status=Mock(), json=Mock(return_value={"return": {"status": 400}}),
        )
        result = send_password_reset_sms(1, "09121234567", "reset-token-abc")
        self.assertEqual(result["status"], "gateway_reported_failure")


class SendUrgentAlertSmsTests(TestCase):
    """
    Regression coverage for the piece explicitly deferred when
    welcome-notification was first wired up: a real plain-text send
    via Kavenegar's generic /sms/send.json, since an urgent alert has
    actual free text, not a fixed %token% template. Needs BOTH
    KAVENEGAR_API_KEY and KAVENEGAR_SENDER_NUMBER, unlike the other
    two tasks which only need the API key — this endpoint requires an
    actual registered sender line.
    """

    @override_settings(KAVENEGAR_API_KEY="", KAVENEGAR_SENDER_NUMBER="")
    def test_logs_only_when_not_configured(self):
        result = send_urgent_alert_sms("09121234567", "پیام تست")
        self.assertEqual(result["status"], "logged_only_no_gateway_configured")

    @override_settings(KAVENEGAR_API_KEY="fake-key", KAVENEGAR_SENDER_NUMBER="")
    def test_logs_only_when_sender_number_missing_even_with_api_key(self):
        # A real, distinct failure mode from the other two tasks —
        # having the API key alone isn't enough for this endpoint.
        result = send_urgent_alert_sms("09121234567", "پیام تست")
        self.assertEqual(result["status"], "logged_only_no_gateway_configured")

    @override_settings(KAVENEGAR_API_KEY="fake-key", KAVENEGAR_SENDER_NUMBER="10008663")
    @patch("apps.authentication.tasks.requests.get")
    def test_calls_the_generic_send_endpoint_not_verify_lookup(self, mock_get):
        mock_get.return_value = Mock(
            raise_for_status=Mock(), json=Mock(return_value={"return": {"status": 200}}),
        )
        result = send_urgent_alert_sms("09121234567", "یادداشت فوری ثبت شد.")

        self.assertEqual(result["status"], "sent")
        called_url, called_kwargs = mock_get.call_args
        self.assertIn("/sms/send.json", called_url[0])
        self.assertNotIn("/verify/lookup.json", called_url[0])
        self.assertEqual(called_kwargs["params"]["receptor"], "09121234567")
        self.assertEqual(called_kwargs["params"]["message"], "یادداشت فوری ثبت شد.")
        self.assertEqual(called_kwargs["params"]["sender"], "10008663")

    @override_settings(KAVENEGAR_API_KEY="fake-key", KAVENEGAR_SENDER_NUMBER="10008663")
    @patch("apps.authentication.tasks.requests.get")
    def test_reports_gateway_failure_without_raising(self, mock_get):
        mock_get.return_value = Mock(
            raise_for_status=Mock(), json=Mock(return_value={"return": {"status": 400}}),
        )
        result = send_urgent_alert_sms("09121234567", "پیام تست")
        self.assertEqual(result["status"], "gateway_reported_failure")
