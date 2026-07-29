import logging

from celery import shared_task

logger = logging.getLogger("apps.authentication")


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_welcome_notification(self, user_id: int, phone_number: str):
    """Placeholder for a real SMS gateway (Kavenegar/Ghasedak). Logs only for now."""
    logger.info("Sending welcome SMS to user_id=%s phone=%s", user_id, phone_number)
    return {"user_id": user_id, "status": "queued"}


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_otp_sms(self, user_id: int, phone_number: str, code: str):
    """
    Placeholder SMS send for phone verification codes. The raw code is
    passed here (not the hash — the hash lives only in PhoneOTP) since
    this is the one place that's actually allowed to know it, right
    before it goes out over SMS.
    """
    logger.info("Sending OTP SMS to user_id=%s phone=%s code=%s", user_id, phone_number, code)
    return {"user_id": user_id, "status": "queued"}


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_password_reset_sms(self, user_id: int, phone_number: str, token: str):
    """Placeholder SMS send for password reset tokens."""
    logger.info("Sending password reset SMS to user_id=%s phone=%s", user_id, phone_number)
    return {"user_id": user_id, "status": "queued"}
