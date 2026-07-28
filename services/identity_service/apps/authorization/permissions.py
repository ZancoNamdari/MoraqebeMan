"""
Role-based DRF permission classes. Kept separate from views so they're
independently testable and reusable across future endpoints without
duplicating role checks inline in every view.
"""
from rest_framework.permissions import BasePermission

from apps.accounts.models import UserRole


def _has_role(request, *roles) -> bool:
    user = getattr(request, "user", None)
    return bool(user and user.is_authenticated and user.role in roles)


class IsSuperuser(BasePermission):
    """Only SUPERUSER may change roles or edit global platform settings."""

    def has_permission(self, request, view):
        return _has_role(request, UserRole.SUPERUSER)


class IsAdminOrSuperuser(BasePermission):
    """ADMIN (panel operators/agents) and SUPERUSER may access admin-panel endpoints."""

    def has_permission(self, request, view):
        return _has_role(request, UserRole.ADMIN, UserRole.SUPERUSER)


class IsAgency(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, UserRole.AGENCY)


class IsFamily(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, UserRole.FAMILY)


class IsCaregiver(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, UserRole.CAREGIVER)


class IsPatient(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, UserRole.PATIENT)
