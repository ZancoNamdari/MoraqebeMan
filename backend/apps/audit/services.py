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

    # Supervisor caregiver-data-entry actions — "who added/edited/
    # deleted this caregiver record" needs to be genuinely queryable,
    # not just inferred from a single created_by field that only ever
    # holds the LATEST value; this is the actual history.
    def caregiver_created(self, actor_id, caregiver_user_id):
        return self.log_event(AuditEventType.CAREGIVER_CREATED, actor_id, caregiver_user_id)

    def caregiver_updated(self, actor_id, caregiver_user_id, section):
        return self.log_event(AuditEventType.CAREGIVER_UPDATED, actor_id, caregiver_user_id, section=section)

    def caregiver_deleted(self, actor_id, caregiver_user_id):
        return self.log_event(AuditEventType.CAREGIVER_DELETED, actor_id, caregiver_user_id)

    # Family/patient actions — same "who did what, when" queryability
    # as the caregiver events above. Patients are frequently
    # dependents with no login of their own, so target_user_id (which
    # always means a real accounts.User id) stays whatever the
    # patient's own user link is (often None) — the patient's actual
    # identity for querying is patient_id in the metadata instead.
    def patient_created(self, actor_id, patient_id):
        return self.log_event(AuditEventType.PATIENT_CREATED, actor_id, None, patient_id=patient_id)

    def patient_updated(self, actor_id, patient_id, section):
        return self.log_event(AuditEventType.PATIENT_UPDATED, actor_id, None, patient_id=patient_id, section=section)

    def patient_deleted(self, actor_id, patient_id):
        return self.log_event(AuditEventType.PATIENT_DELETED, actor_id, None, patient_id=patient_id)

    def family_link_added(self, actor_id, patient_id, linked_family_user_id):
        return self.log_event(
            AuditEventType.FAMILY_LINK_ADDED, actor_id, linked_family_user_id, patient_id=patient_id,
        )

    def family_link_removed(self, actor_id, patient_id, unlinked_family_user_id):
        return self.log_event(
            AuditEventType.FAMILY_LINK_REMOVED, actor_id, unlinked_family_user_id, patient_id=patient_id,
        )
