"""
AuditService — the concrete implementation that RoleChangeService's
audit_logger injection point (apps/authorization/services.py) was left
waiting for, plus the logging point for every other security-relevant
event across the service. Kept as a thin service, not a signal handler —
explicit calls at the point an event happens are easier to trace than
Django signals firing from unexpected places.
"""
import logging

from .models import AuditEventType, AuditLog

logger = logging.getLogger("apps.audit")


class AuditService:
    def log_event(
        self,
        event_type: str,
        actor_user_id: int | None = None,
        target_user_id: int | None = None,
        ip_address: str | None = None,
        **metadata,
    ) -> AuditLog:
        entry = AuditLog.objects.create(
            event_type=event_type,
            actor_user_id=actor_user_id,
            target_user_id=target_user_id,
            ip_address=ip_address,
            metadata=metadata,
        )
        logger.info("audit_event=%s actor=%s target=%s", event_type, actor_user_id, target_user_id)
        return entry

    # Convenience wrappers used by callers — keeps call sites readable.
    def log_role_change(self, actor_id, target_id, old_role, new_role):
        # Matches the exact interface RoleChangeService.change_role()
        # already calls (apps/authorization/services.py) — this is the
        # concrete implementation that injection point was left waiting for.
        return self.log_event(
            AuditEventType.ROLE_CHANGED, actor_id, target_id,
            old_role=old_role, new_role=new_role,
        )

    def login_success(self, user_id, ip_address=None):
        return self.log_event(AuditEventType.LOGIN_SUCCESS, user_id, user_id, ip_address)

    def login_failed(self, username, ip_address=None):
        return self.log_event(AuditEventType.LOGIN_FAILED, None, None, ip_address, username=username)

    def login_locked(self, username, ip_address=None):
        return self.log_event(AuditEventType.LOGIN_LOCKED, None, None, ip_address, username=username)
