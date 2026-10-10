from rest_framework.permissions import BasePermission


class IsCaregiver(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and user.role == "caregiver")


class IsApprovedCaregiver(BasePermission):
    """مراقب فقط پس از تأییدِ ادمین «فعال» است: تا آن زمان (پیش‌نویس، در انتظار بررسی، رد یا
    تعلیق) نمی‌تواند فعالیت (گزارش، یادداشت و ...) شروع کند."""
    message = "حساب شما هنوز توسط ادمین تأیید نشده است؛ پس از تأیید می‌توانید فعالیت را شروع کنید."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not (user and getattr(user, "is_authenticated", False) and user.role == "caregiver"):
            return False
        from .models import CaregiverProfile, CaregiverStatus
        return CaregiverProfile.objects.filter(user_id=user.id, status=CaregiverStatus.APPROVED).exists()


class IsAdminOrSuperuser(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and getattr(user, "is_authenticated", False) and user.role in ("admin", "superuser"))


class IsAdminOrSuperuserOrAgencyStaff(BasePermission):
    """
    Same platform-wide staff as IsAdminOrSuperuser, PLUS an agency's
    own staff — owner (agency), supervisor (agency_supervisor), and
    admin (agency_admin) — who get the exact same wizard/endpoints,
    but scoped to only their own agency's caregivers (per-object
    scoping is enforced separately, in supervisor_views.py's
    _caregiver_visible_to_actor() — this class only confirms the
    user's ROLE is one of the allowed ones, not which caregivers they
    can actually touch).

    Originally agency_supervisor-only (this same wizard used to be
    reached by crossing into the separate supervisor.moraqebman.ir
    panel); widened to the other two agency roles once the whole
    wizard flow moved to live inside agency-panel itself, so whichever
    of the three roles started a caregiver candidate there can also
    continue their registration, exactly like every other
    agency-scoped action in apps.agencies.views (allow_admin=True).
    """
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(
            user and getattr(user, "is_authenticated", False)
            and user.role in ("admin", "superuser", "agency", "agency_supervisor", "agency_admin")
        )
