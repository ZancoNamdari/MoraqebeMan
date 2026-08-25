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


class IsAgencySupervisor(BasePermission):
    """Agency staff (receptionist-like) — always scoped to exactly
    one agency via apps.agencies.models.AgencySupervisor. This is
    deliberately a DIFFERENT permission/role than the platform-wide
    "Supervisor" Django group used in apps.caregivers.supervisor_views
    — that one has no agency scoping at all."""
    def has_permission(self, request, view):
        return _has_role(request, UserRole.AGENCY_SUPERVISOR)


class IsAgencyOrAgencySupervisor(BasePermission):
    """Either the agency account itself, or one of its own
    supervisors — the two roles that should be able to act "on behalf
    of" a given agency (create caregivers/patients/other supervisors,
    run agency-scoped matching). Per-agency scoping (does this
    specific agency match the one this user belongs to) still needs
    to be checked separately in the view/service — this permission
    class only confirms the user is ONE of the two allowed role
    types, not which agency they belong to."""
    def has_permission(self, request, view):
        return _has_role(request, UserRole.AGENCY, UserRole.AGENCY_SUPERVISOR)


class IsFamily(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, UserRole.FAMILY)


class IsCaregiver(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, UserRole.CAREGIVER)


class IsPatient(BasePermission):
    def has_permission(self, request, view):
        return _has_role(request, UserRole.PATIENT)
