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
    """Placeholder SMS send for password reset tokens — password reset
    stays a secondary path now that OTP login exists; not migrated to
    Kavenegar in this pass since it's no longer the primary flow."""
    logger.info("Sending password reset SMS to user_id=%s phone=%s", user_id, phone_number)
    return {"user_id": user_id, "status": "queued"}
