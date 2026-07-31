from rest_framework.permissions import BasePermission


class IsCaregiver(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and user.role == "caregiver")


class IsAdminOrSuperuser(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and user.role in ("admin", "superuser"))
