from rest_framework.permissions import BasePermission

# Reused as-is rather than duplicated — apps.caregivers and
# apps.families already define exactly these checks.
from apps.caregivers.permissions import IsAdminOrSuperuser  # noqa: F401
from apps.caregivers.permissions import IsCaregiver  # noqa: F401


class IsFamilyOrPatient(BasePermission):
    """Either side of a care relationship can view a patient's
    assignment/timeline info — a family member with approved access,
    or the patient viewing their own record. Which one, and whether
    they actually have standing on THIS specific patient, is checked
    per-object in the view, not here (this only confirms the account
    is one of the two roles that could ever have standing at all)."""
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and user.role in ("family", "patient"))
