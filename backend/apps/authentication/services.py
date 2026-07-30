"""
Service layer — business rules, not HTTP or SQL concerns.

OCP: TokenIssuerInterface lets a new token strategy be added (e.g.
RS256, or opaque tokens for a mobile app) without modifying AuthService.
DIP: AuthService receives its dependencies via constructor injection —
including the audit logger and lockout guard, both optional so existing
callers/tests that don't care about them keep working unchanged.
"""
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole

from .models import PasswordResetToken, PhoneOTP
from .repositories import UserRepositoryInterface
from .tasks import send_otp_sms, send_password_reset_sms

logger = logging.getLogger("apps.authentication")


class TokenIssuerInterface(ABC):
    @abstractmethod
    def issue(self, user: User) -> dict:
        ...


class SimpleJWTTokenIssuer(TokenIssuerInterface):
    def issue(self, user: User) -> dict:
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["phone_number"] = user.phone_number
        access = refresh.access_token
        access["role"] = user.role
        access["phone_number"] = user.phone_number
        return {"refresh": str(refresh), "access": str(access)}


class AuthenticationError(Exception):
    pass


class AccountLockedError(Exception):
    pass


class RegistrationError(Exception):
    pass


class OTPError(Exception):
    pass


class PasswordResetError(Exception):
    pass


@dataclass
class RegisterUserRequest:
    username: str
    password: str
    phone_number: str
    email: str
    role: str = UserRole.FAMILY


class AuthService:
    def __init__(
        self,
        user_repository: UserRepositoryInterface,
        token_issuer: TokenIssuerInterface,
        audit_logger=None,
        login_guard=None,
    ):
        self._users = user_repository
        self._tokens = token_issuer
        self._audit = audit_logger
        self._guard = login_guard

    def register(self, request: RegisterUserRequest) -> tuple[User, dict]:
        if self._users.exists_with_username_or_phone(request.username, request.phone_number):
            raise RegistrationError("این نام کاربری یا شماره تلفن قبلاً ثبت شده است.")

        user = self._users.create_user(
            username=request.username,
            password=request.password,
            phone_number=request.phone_number,
            email=request.email,
            role=request.role,
        )
        logger.info("New user registered: id=%s role=%s", user.id, user.role)
        if self._audit:
            self._audit.log_event("user_registered", actor_user_id=user.id, target_user_id=user.id)

        tokens = self._tokens.issue(user)
        return user, tokens

    def authenticate(self, username: str, password: str, ip_address: str = None) -> tuple[User, dict]:
        if self._guard and self._guard.is_locked(username):
            logger.warning("Login blocked (locked): username=%s", username)
            if self._audit:
                self._audit.login_locked(username, ip_address)
            raise AccountLockedError(
                "به دلیل تلاش‌های ناموفق متعدد، این حساب موقتاً قفل شده است. لطفاً چند دقیقه دیگر تلاش کنید."
            )

        user: Optional[User] = self._users.get_by_username(username)
        if user is None or not user.check_password(password):
            logger.warning("Failed login attempt for username=%s", username)
            if self._guard:
                self._guard.record_failure(username)
            if self._audit:
                self._audit.login_failed(username, ip_address)
            raise AuthenticationError("نام کاربری یا رمز عبور اشتباه است.")

        if self._guard:
            self._guard.reset(username)
        if self._audit:
            self._audit.login_success(user.id, ip_address)

        tokens = self._tokens.issue(user)
        return user, tokens


class OTPService:
    """
    Phone verification via a 6-digit code, valid for PhoneOTP.VALID_MINUTES.
    Deliberately independent of AuthService — verifying a phone number is
    a different concern from logging in, even though both live under
    "authentication" conceptually.
    """
    def __init__(self, audit_logger=None):
        self._audit = audit_logger

    def request_otp(self, user: User) -> None:
        otp, raw_code = PhoneOTP.issue_for(user)
        try:
            send_otp_sms.delay(user.id, user.phone_number, raw_code)
        except Exception:
            logger.exception("Failed to queue OTP SMS for user_id=%s", user.id)
        if self._audit:
            self._audit.log_event("otp_requested", actor_user_id=user.id, target_user_id=user.id)

    def verify_otp(self, user: User, raw_code: str) -> None:
        otp = PhoneOTP.objects.filter(user=user, is_used=False).order_by("-created_at").first()
        if otp is None or otp.is_expired():
            if self._audit:
                self._audit.log_event("otp_failed", actor_user_id=user.id, target_user_id=user.id, reason="expired_or_missing")
            raise OTPError("کد تأیید منقضی شده یا یافت نشد. لطفاً کد جدید درخواست کنید.")

        if otp.attempts >= PhoneOTP.MAX_ATTEMPTS:
            if self._audit:
                self._audit.log_event("otp_failed", actor_user_id=user.id, target_user_id=user.id, reason="max_attempts")
            raise OTPError("تعداد تلاش‌های مجاز برای این کد به پایان رسیده. لطفاً کد جدید درخواست کنید.")

        if not otp.check_code(raw_code):
            otp.attempts += 1
            otp.save(update_fields=["attempts"])
            if self._audit:
                self._audit.log_event("otp_failed", actor_user_id=user.id, target_user_id=user.id, reason="wrong_code")
            raise OTPError("کد تأیید نادرست است.")

        otp.is_used = True
        otp.save(update_fields=["is_used"])
        user.is_phone_verified = True
        user.save(update_fields=["is_phone_verified"])
        if self._audit:
            self._audit.log_event("otp_verified", actor_user_id=user.id, target_user_id=user.id)


class PasswordResetService:
    """
    Token-based reset (typically delivered via SMS as a code/link).
    Always returns success from request_reset() regardless of whether the
    phone number matched a real account — enumeration protection, same
    principle as most password-reset flows.
    """
    def __init__(self, user_repository: UserRepositoryInterface, audit_logger=None):
        self._users = user_repository
        self._audit = audit_logger

    def request_reset(self, phone_number: str) -> None:
        user = self._users.get_by_phone(phone_number)
        if user is None:
            logger.info("Password reset requested for unknown phone_number=%s (no-op)", phone_number)
            return

        token, raw_token = PasswordResetToken.issue_for(user)
        try:
            send_password_reset_sms.delay(user.id, user.phone_number, raw_token)
        except Exception:
            logger.exception("Failed to queue password reset SMS for user_id=%s", user.id)
        if self._audit:
            self._audit.log_event("password_reset_requested", actor_user_id=user.id, target_user_id=user.id)

    def confirm_reset(self, phone_number: str, raw_token: str, new_password: str) -> None:
        user = self._users.get_by_phone(phone_number)
        if user is None:
            raise PasswordResetError("توکن نامعتبر است.")

        token = PasswordResetToken.objects.filter(user=user, is_used=False).order_by("-created_at").first()
        if token is None or token.is_expired() or not token.check_token(raw_token):
            raise PasswordResetError("توکن نامعتبر یا منقضی‌شده است.")

        token.is_used = True
        token.save(update_fields=["is_used"])
        user.set_password(new_password)
        user.save(update_fields=["password"])
        if self._audit:
            self._audit.log_event("password_reset_completed", actor_user_id=user.id, target_user_id=user.id)
