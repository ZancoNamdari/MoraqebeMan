from rest_framework.permissions import BasePermission


class IsCaregiver(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and user.role == "caregiver")


class IsAdminOrSuperuser(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and user.role in ("admin", "superuser"))


class IsAdminOrSuperuserOrAgencySupervisor(BasePermission):
    """
    Same platform-wide staff as IsAdminOrSuperuser, PLUS agency
    supervisors — who get the exact same wizard/endpoints, but scoped
    to only their own agency's caregivers (per-object scoping is
    enforced separately, in supervisor_views.py's
    _caregiver_visible_to_actor() — this class only confirms the
    user's ROLE is one of the three allowed, not which caregivers
    they can actually touch).
    """
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and user.role in ("admin", "superuser", "agency_supervisor"))
