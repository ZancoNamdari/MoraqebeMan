"""
Repository layer — isolates ORM access. Services depend on this
interface, not the ORM directly, so business logic can be unit-tested
with a fake repository.
"""
from abc import ABC, abstractmethod
from typing import Optional

from apps.accounts.models import User


class UserRepositoryInterface(ABC):
    @abstractmethod
    def get_by_username(self, username: str) -> Optional[User]:
        ...

    @abstractmethod
    def exists_with_username_or_phone(self, username: str, phone_number: str) -> bool:
        ...

    @abstractmethod
    def create_user(self, **kwargs) -> User:
        ...


class DjangoUserRepository(UserRepositoryInterface):
    def get_by_username(self, username: str) -> Optional[User]:
        return User.objects.filter(username=username).first()

    def exists_with_username_or_phone(self, username: str, phone_number: str) -> bool:
        return User.objects.filter(username=username).exists() or User.objects.filter(
            phone_number=phone_number
        ).exists()

    def create_user(self, **kwargs) -> User:
        password = kwargs.pop("password")
        user = User(**kwargs)
        user.set_password(password)
        user.save()
        return user
