from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.audit.services import AuditService

from .lockout import LoginAttemptGuard
from .repositories import DjangoUserRepository
from .serializers import (
    LoginSerializer,
    LogoutSerializer,
    OTPLoginRequestSerializer,
    OTPLoginVerifySerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    VerifyOTPSerializer,
)
from .services import (
    AccountLockedError,
    AuthenticationError,
    AuthService,
    OTPError,
    OTPService,
    PasswordResetError,
    PasswordResetService,
    RegisterUserRequest,
    RegistrationError,
    SimpleJWTTokenIssuer,
)


def _client_ip(request) -> str | None:
    return request.META.get("REMOTE_ADDR")


def build_auth_service() -> AuthService:
    return AuthService(
        user_repository=DjangoUserRepository(),
        token_issuer=SimpleJWTTokenIssuer(),
        audit_logger=AuditService(),
        login_guard=LoginAttemptGuard(),
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "register"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        if not data.get("password"):
            # OTP login never needs this — a real, unguessable value
            # still has to exist since password auth stays available
            # as a fallback, same reasoning as supervisor-created
            # caregiver accounts already use.
            from django.utils.crypto import get_random_string
            data["password"] = get_random_string(32)

        auth_service = build_auth_service()
        try:
            user, tokens = auth_service.register(RegisterUserRequest(**data))
        except RegistrationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"user": UserSerializer(user).data, "tokens": tokens},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        auth_service = build_auth_service()
        try:
            user, tokens = auth_service.authenticate(
                serializer.validated_data["username"],
                serializer.validated_data["password"],
                ip_address=_client_ip(request),
            )
        except AccountLockedError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_423_LOCKED)
        except AuthenticationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({"user": UserSerializer(user).data, "tokens": tokens})


class LogoutView(APIView):
    """
    POST /api/auth/logout/  {"refresh": "<token>"}
    Blacklists the refresh token immediately via SimpleJWT's
    token_blacklist app (already installed) — without this, "logout"
    only meant "the frontend forgot the token", and the token itself
    stayed valid until it naturally expired.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError:
            return Response({"detail": "توکن نامعتبر است."}, status=status.HTTP_400_BAD_REQUEST)

        AuditService().log_event("logout", actor_user_id=request.user.id, target_user_id=request.user.id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class OTPLoginRequestView(APIView):
    """
    POST /api/auth/otp-login/request/ {"phone_number": "09..."}
    Passwordless login, step 1 — no username, no password. Always
    returns 202 regardless of whether the phone matched a real
    account, same enumeration-protection reasoning as password reset.
    """
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        serializer = OTPLoginRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(phone_number=serializer.validated_data["phone_number"]).first()
        if user is not None:
            OTPService(audit_logger=AuditService()).request_login_otp(user)
        return Response({"detail": "در صورت معتبر بودن شماره، کد ورود ارسال شد."}, status=status.HTTP_202_ACCEPTED)


class OTPLoginVerifyView(APIView):
    """
    POST /api/auth/otp-login/verify/ {"phone_number": "09...", "code": "123456"}
    Passwordless login, step 2 — the actual login success path. Issues
    the same JWT tokens LoginView does on success.
    """
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        serializer = OTPLoginVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.filter(phone_number=data["phone_number"]).first()
        if user is None:
            # Same message either way — not confirming which part was wrong.
            return Response({"detail": "کد تأیید نادرست است."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            OTPService(audit_logger=AuditService()).verify_login_otp(user, data["code"])
        except OTPError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        tokens = SimpleJWTTokenIssuer().issue(user)
        return Response({"user": UserSerializer(user).data, "tokens": tokens})


class RequestOTPView(APIView):
    """POST /api/auth/otp/request/ — send a 6-digit code to the current user's phone."""
    permission_classes = [IsAuthenticated]
    throttle_scope = "register"  # reuse the same modest rate as registration; OTP spam is the same class of risk

    def post(self, request):
        OTPService(audit_logger=AuditService()).request_otp(request.user)
        return Response({"detail": "کد تأیید ارسال شد."}, status=status.HTTP_202_ACCEPTED)


class VerifyOTPView(APIView):
    """POST /api/auth/otp/verify/ {"code": "123456"} — sets is_phone_verified=True on success."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            OTPService(audit_logger=AuditService()).verify_otp(request.user, serializer.validated_data["code"])
        except OTPError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(UserSerializer(request.user).data)


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/ {"phone_number": "09..."}
    Always returns 202 regardless of whether the phone number matched a
    real account — prevents using this endpoint to enumerate registered
    phone numbers.
    """
    permission_classes = [AllowAny]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = PasswordResetService(user_repository=DjangoUserRepository(), audit_logger=AuditService())
        service.request_reset(serializer.validated_data["phone_number"])
        return Response(
            {"detail": "در صورت معتبر بودن شماره، کد بازیابی ارسال شد."},
            status=status.HTTP_202_ACCEPTED,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        service = PasswordResetService(user_repository=DjangoUserRepository(), audit_logger=AuditService())
        try:
            service.confirm_reset(data["phone_number"], data["token"], data["new_password"])
        except PasswordResetError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "رمز عبور با موفقیت تغییر کرد."})
