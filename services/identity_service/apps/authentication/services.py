"""
Service layer — business rules, not HTTP or SQL concerns.

OCP: TokenIssuerInterface lets a new token strategy be added (e.g.
RS256, or opaque tokens for a mobile app) without modifying AuthService.
DIP: AuthService receives its dependencies via constructor injection.
"""
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole

from .repositories import UserRepositoryInterface

logger = logging.getLogger("apps.authentication")


class TokenIssuerInterface(ABC):
    @abstractmethod
    def issue(self, user: User) -> dict:
        ...


class SimpleJWTTokenIssuer(TokenIssuerInterface):
    def issue(self, user: User) -> dict:
        refresh = RefreshToken.for_user(user)
        # Custom claims let every other microservice authorize requests
        # without a DB lookup or network round-trip back here.
        refresh["role"] = user.role
        refresh["phone_number"] = user.phone_number
        access = refresh.access_token
        access["role"] = user.role
        access["phone_number"] = user.phone_number
        return {"refresh": str(refresh), "access": str(access)}


class AuthenticationError(Exception):
    pass


class RegistrationError(Exception):
    pass


@dataclass
class RegisterUserRequest:
    username: str
    password: str
    phone_number: str
    email: str
    role: str = UserRole.FAMILY


class AuthService:
    def __init__(self, user_repository: UserRepositoryInterface, token_issuer: TokenIssuerInterface):
        self._users = user_repository
        self._tokens = token_issuer

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

        tokens = self._tokens.issue(user)
        return user, tokens

    def authenticate(self, username: str, password: str) -> tuple[User, dict]:
        user: Optional[User] = self._users.get_by_username(username)
        if user is None or not user.check_password(password):
            logger.warning("Failed login attempt for username=%s", username)
            raise AuthenticationError("نام کاربری یا رمز عبور اشتباه است.")
        tokens = self._tokens.issue(user)
        return user, tokens
