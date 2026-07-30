"""
family_service has no User table — identity is owned entirely by
identity_service. This authenticator verifies the JWT signature/expiry
locally (same shared JWT_SIGNING_KEY) and builds a lightweight,
read-only "remote user" from the token's claims (user_id, role,
phone_number) instead of hitting a database — the same pattern
identity_service's own token issuance was designed around.
"""
from dataclasses import dataclass

import jwt as pyjwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


@dataclass
class RemoteUser:
    id: int
    role: str
    phone_number: str
    is_authenticated: bool = True

    def __str__(self):
        return f"RemoteUser(id={self.id}, role={self.role})"


class StatelessJWTAuthentication(BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith(f"{self.keyword} "):
            return None

        raw_token = auth_header.split(" ", 1)[1]
        try:
            payload = pyjwt.decode(raw_token, settings.JWT_SIGNING_KEY, algorithms=["HS256"])
        except pyjwt.ExpiredSignatureError:
            raise AuthenticationFailed("توکن منقضی شده است.")
        except pyjwt.InvalidTokenError:
            raise AuthenticationFailed("توکن نامعتبر است.")

        if payload.get("token_type") != "access":
            raise AuthenticationFailed("توکن باید از نوع access باشد.")

        user = RemoteUser(
            id=payload["user_id"],
            role=payload.get("role", ""),
            phone_number=payload.get("phone_number", ""),
        )
        return (user, raw_token)

    def authenticate_header(self, request):
        # Without this, DRF has no way to know this authenticator uses a
        # challenge-response scheme, and returns 403 Forbidden instead of
        # 401 Unauthorized for missing/invalid credentials — a real bug
        # this test suite caught: test_requires_authentication expected
        # 401 and got 403 before this method existed.
        return self.keyword
