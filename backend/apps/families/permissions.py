from rest_framework.permissions import BasePermission


class IsFamily(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and user.role == "family")


class IsPatient(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and user.role == "patient")
