from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.serializers import UserSerializer
from apps.audit.services import AuditService

from .lockout import LoginAttemptGuard
from .repositories import DjangoUserRepository
from .serializers import (
    LoginSerializer,
    LogoutSerializer,
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

        auth_service = build_auth_service()
        try:
            user, tokens = auth_service.register(RegisterUserRequest(**serializer.validated_data))
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
