import logging

import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger("apps.authentication")

KAVENEGAR_BASE_URL = "https://api.kavenegar.com/v1"


def _kavenegar_verify_lookup(receptor: str, token: str, template: str) -> bool:
    """
    Real Kavenegar "Verify Lookup" API call — the endpoint Kavenegar
    documents specifically for OTP/verification-style codes (as
    opposed to their generic /sms/send.json, which is for arbitrary
    marketing/notification text). Verify Lookup requires a template
    pre-registered with Kavenegar/the regulator ahead of time; %token%
    inside that template is where the code gets substituted.

    Returns True on a confirmed-sent response, False otherwise —
    callers decide what to do with a failure (currently: log and let
    Celery's own retry handle transient errors).

    Requires KAVENEGAR_API_KEY to be set in the environment. Without
    it, this function is never called — see send_otp_sms below, which
    falls back to logging-only so local development and this
    sandbox's testing were never blocked on having real credentials.
    """
    api_key = getattr(settings, "KAVENEGAR_API_KEY", None)
    if not api_key:
        raise RuntimeError("KAVENEGAR_API_KEY is not configured")

    url = f"{KAVENEGAR_BASE_URL}/{api_key}/verify/lookup.json"
    response = requests.get(
        url, params={"receptor": receptor, "token": token, "template": template}, timeout=10,
    )
    response.raise_for_status()
    body = response.json()
    return body.get("return", {}).get("status") == 200


def _kavenegar_send_sms(receptor: str, message: str) -> bool:
    """
    Real Kavenegar generic /sms/send.json call — for arbitrary free
    text, as opposed to _kavenegar_verify_lookup's fixed %token%
    templates above. This is the piece explicitly deferred when
    send_welcome_notification was first wired up (a welcome message
    has no token to substitute, so it needed this different endpoint,
    not a copy of the Verify Lookup pattern) — built now because an
    urgent safety-flagged note genuinely needs real free text ("یادداشت
    فوری ثبت شد درباره...") that a fixed template can't express.

    Requires both KAVENEGAR_API_KEY and KAVENEGAR_SENDER_NUMBER — this
    endpoint needs an actual registered sender line, unlike Verify
    Lookup where the sender is implied by the pre-registered template.
    """
    api_key = getattr(settings, "KAVENEGAR_API_KEY", None)
    sender = getattr(settings, "KAVENEGAR_SENDER_NUMBER", None)
    if not api_key or not sender:
        raise RuntimeError("KAVENEGAR_API_KEY or KAVENEGAR_SENDER_NUMBER is not configured")

    url = f"{KAVENEGAR_BASE_URL}/{api_key}/sms/send.json"
    response = requests.get(
        url, params={"receptor": receptor, "message": message, "sender": sender}, timeout=10,
    )
    response.raise_for_status()
    body = response.json()
    return body.get("return", {}).get("status") == 200


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_welcome_notification(self, user_id: int, phone_number: str):
    """Placeholder for a real SMS gateway (Kavenegar/Ghasedak). Logs only for now."""
    logger.info("Sending welcome SMS to user_id=%s phone=%s", user_id, phone_number)
    return {"user_id": user_id, "status": "queued"}


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_otp_sms(self, user_id: int, phone_number: str, code: str):
    """
    Sends a 6-digit OTP via Kavenegar's Verify Lookup API when
    KAVENEGAR_API_KEY is configured; otherwise logs only, exactly like
    before — this keeps local development and every environment
    without real Kavenegar credentials (including this session's
    sandbox) working without a hard dependency on a real account.

    KAVENEGAR_OTP_TEMPLATE names the pre-registered template to use;
    defaults to "verify" (Kavenegar's own commonly-used default
    template name) but should be set to whatever's actually been
    registered for this account.
    """
    api_key = getattr(settings, "KAVENEGAR_API_KEY", None)
    if not api_key:
        logger.info("[SMS not configured] OTP code for user_id=%s phone=%s: %s", user_id, phone_number, code)
        return {"user_id": user_id, "status": "logged_only_no_gateway_configured"}

    template = getattr(settings, "KAVENEGAR_OTP_TEMPLATE", "verify")
    try:
        sent = _kavenegar_verify_lookup(phone_number, code, template)
    except Exception as exc:
        logger.exception("Kavenegar OTP send failed for user_id=%s", user_id)
        raise self.retry(exc=exc)

    if not sent:
        logger.warning("Kavenegar reported non-success sending OTP for user_id=%s", user_id)
    return {"user_id": user_id, "status": "sent" if sent else "gateway_reported_failure"}


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_password_reset_sms(self, user_id: int, phone_number: str, token: str):
    """
    Sends a password-reset token via Kavenegar's Verify Lookup API
    when KAVENEGAR_API_KEY is configured; otherwise logs only — the
    exact same real-gateway-with-log-only-fallback pattern already
    used by send_otp_sms above, reusing the same _kavenegar_verify_lookup
    helper. Previously this was a pure placeholder regardless of
    configuration, meaning any password-based account (agency, admin,
    superuser, supervisor — every role that isn't on the OTP-login
    path) had no real way to recover a forgotten password in
    production; the "SMS" only ever reached a server log the affected
    person could never see.

    KAVENEGAR_PASSWORD_RESET_TEMPLATE is deliberately a separate
    setting from KAVENEGAR_OTP_TEMPLATE — Kavenegar's Verify Lookup
    requires each distinct message template to be pre-registered
    with them individually, so a password-reset code and a login OTP
    can't safely share one template even though the send mechanism
    is otherwise identical.
    """
    api_key = getattr(settings, "KAVENEGAR_API_KEY", None)
    if not api_key:
        logger.info("[SMS not configured] Password reset token for user_id=%s phone=%s: %s", user_id, phone_number, token)
        return {"user_id": user_id, "status": "logged_only_no_gateway_configured"}

    template = getattr(settings, "KAVENEGAR_PASSWORD_RESET_TEMPLATE", "password-reset")
    try:
        sent = _kavenegar_verify_lookup(phone_number, token, template)
    except Exception as exc:
        logger.exception("Kavenegar password reset SMS send failed for user_id=%s", user_id)
        raise self.retry(exc=exc)

    if not sent:
        logger.warning("Kavenegar reported non-success sending password reset SMS for user_id=%s", user_id)
    return {"user_id": user_id, "status": "sent" if sent else "gateway_reported_failure"}


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_urgent_alert_sms(self, phone_number: str, message: str):
    """
    Sends free-text urgent-alert SMS via Kavenegar's generic
    /sms/send.json when both KAVENEGAR_API_KEY and
    KAVENEGAR_SENDER_NUMBER are configured; otherwise logs only,
    same fallback convention as every other SMS task here.

    One task call per recipient, not one call for a whole list — a
    caller notifying five admins about the same urgent note queues
    five independent tasks, each independently retryable. A transient
    failure reaching admin #3 shouldn't block or repeat the send to
    admins #1, #2, #4, and #5.
    """
    api_key = getattr(settings, "KAVENEGAR_API_KEY", None)
    sender = getattr(settings, "KAVENEGAR_SENDER_NUMBER", None)
    if not api_key or not sender:
        logger.info("[SMS not configured] Urgent alert for phone=%s: %s", phone_number, message)
        return {"phone_number": phone_number, "status": "logged_only_no_gateway_configured"}

    try:
        sent = _kavenegar_send_sms(phone_number, message)
    except Exception as exc:
        logger.exception("Kavenegar urgent alert SMS send failed for phone=%s", phone_number)
        raise self.retry(exc=exc)

    if not sent:
        logger.warning("Kavenegar reported non-success sending urgent alert SMS to phone=%s", phone_number)
    return {"phone_number": phone_number, "status": "sent" if sent else "gateway_reported_failure"}
