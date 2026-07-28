from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import UserSerializer

from .repositories import DjangoUserRepository
from .serializers import LoginSerializer, RegisterSerializer
from .services import (
    AuthenticationError,
    AuthService,
    RegisterUserRequest,
    RegistrationError,
    SimpleJWTTokenIssuer,
)


def build_auth_service() -> AuthService:
    return AuthService(user_repository=DjangoUserRepository(), token_issuer=SimpleJWTTokenIssuer())


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
                serializer.validated_data["username"], serializer.validated_data["password"]
            )
        except AuthenticationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({"user": UserSerializer(user).data, "tokens": tokens})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
