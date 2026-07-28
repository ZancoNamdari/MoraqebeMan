"""
Business logic for role changes — kept out of views.py per the
established SOLID pattern (views stay thin, services hold rules).
"""
from dataclasses import dataclass

from apps.accounts.models import User, UserRole


class RoleChangeError(Exception):
    pass


@dataclass
class RoleChangeRequest:
    target_user_id: int
    new_role: str
    changed_by_user_id: int


class RoleChangeService:
    def __init__(self, audit_logger=None):
        # Optional injection point — apps.audit doesn't have a model yet
        # (see apps/audit/middleware.py), so this defaults to a no-op.
        # Once AuditLog exists, pass a real logger in here instead of
        # reaching into apps.audit directly from this service.
        self._audit_logger = audit_logger

    def change_role(self, request: RoleChangeRequest) -> User:
        if request.new_role not in UserRole.values:
            raise RoleChangeError(
                f"نقش نامعتبر است. مقادیر مجاز: {', '.join(UserRole.values)}"
            )

        try:
            user = User.objects.get(id=request.target_user_id)
        except User.DoesNotExist:
            raise RoleChangeError("کاربر یافت نشد.")

        old_role = user.role
        user.role = request.new_role
        user.save()

        if self._audit_logger:
            self._audit_logger.log_role_change(
                actor_id=request.changed_by_user_id,
                target_id=user.id,
                old_role=old_role,
                new_role=request.new_role,
            )
        return user
