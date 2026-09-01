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

    def caregiver_assigned(self, actor_id, caregiver_user_id, patient_id):
        return self.log_event(AuditEventType.CAREGIVER_ASSIGNED, actor_id, caregiver_user_id, patient_id=patient_id)

    def caregiver_assignment_ended(self, actor_id, caregiver_user_id, patient_id):
        return self.log_event(AuditEventType.CAREGIVER_ASSIGNMENT_ENDED, actor_id, caregiver_user_id, patient_id=patient_id)

    def care_log_entry_created(self, actor_id, patient_id, category):
        return self.log_event(AuditEventType.CARE_LOG_ENTRY_CREATED, actor_id, None, patient_id=patient_id, category=category)

    def caregiver_reviewed(self, actor_id, caregiver_user_id, patient_id, rating):
        return self.log_event(AuditEventType.CAREGIVER_REVIEWED, actor_id, caregiver_user_id, patient_id=patient_id, rating=rating)

    def mcdm_weights_updated(self, actor_id, consistency_ratio):
        return self.log_event(AuditEventType.MCDM_WEIGHTS_UPDATED, actor_id, None, consistency_ratio=consistency_ratio)

    def agency_family_link_decided(self, actor_id, family_user_id, decision):
        return self.log_event(AuditEventType.AGENCY_FAMILY_LINK_DECIDED, actor_id, family_user_id, decision=decision)

    def agency_caregiver_link_decided(self, actor_id, caregiver_user_id, decision):
        return self.log_event(AuditEventType.AGENCY_CAREGIVER_LINK_DECIDED, actor_id, caregiver_user_id, decision=decision)

    def agency_supervisor_created(self, actor_id, supervisor_user_id, agency_id):
        return self.log_event(AuditEventType.AGENCY_SUPERVISOR_CREATED, actor_id, supervisor_user_id, agency_id=agency_id)

    def agency_created(self, actor_id, agency_owner_user_id):
        return self.log_event(AuditEventType.AGENCY_CREATED, actor_id, agency_owner_user_id)

    def caregiver_approved(self, actor_id, caregiver_user_id):
        return self.log_event(AuditEventType.CAREGIVER_APPROVED, actor_id, caregiver_user_id)

    def caregiver_rejected(self, actor_id, caregiver_user_id, reason=""):
        return self.log_event(AuditEventType.CAREGIVER_REJECTED, actor_id, caregiver_user_id, reason=reason)

    def caregiver_blacklisted(self, actor_id, caregiver_user_id, reason=""):
        return self.log_event(AuditEventType.CAREGIVER_BLACKLISTED, actor_id, caregiver_user_id, reason=reason)

    def caregiver_unblacklisted(self, actor_id, caregiver_user_id):
        return self.log_event(AuditEventType.CAREGIVER_UNBLACKLISTED, actor_id, caregiver_user_id)

    def blacklist_appeal_submitted(self, caregiver_user_id):
        # Same self-actor reasoning as terms_accepted — a caregiver's
        # own appeal is inherently self-performed.
        return self.log_event(AuditEventType.BLACKLIST_APPEAL_SUBMITTED, caregiver_user_id, caregiver_user_id)

    def blacklist_appeal_denied(self, actor_id, caregiver_user_id):
        return self.log_event(AuditEventType.BLACKLIST_APPEAL_DENIED, actor_id, caregiver_user_id)

    def terms_accepted(self, caregiver_user_id):
        # actor and target are deliberately the same id here — this is
        # the one event on this whole platform that can only ever be
        # self-performed (see the terms-delegation fix), so there's no
        # separate "who did this to whom" to record.
        return self.log_event(AuditEventType.TERMS_ACCEPTED, caregiver_user_id, caregiver_user_id)

    # apps.reviews events — patient_id/complaint_id kept in metadata
    # rather than as dedicated model fields, matching the existing
    # pattern used throughout this service for patient-related events
    # (patients frequently have no login of their own, so
    # target_user_id can't always carry that identity).
    def complaint_filed(self, actor_id, patient_id, complaint_id, category):
        return self.log_event(AuditEventType.COMPLAINT_FILED, actor_id, None, patient_id=patient_id, complaint_id=complaint_id, category=category)

    def complaint_under_review(self, actor_id, complaint_id):
        return self.log_event(AuditEventType.COMPLAINT_UNDER_REVIEW, actor_id, None, complaint_id=complaint_id)

    def complaint_resolved(self, actor_id, complaint_id):
        return self.log_event(AuditEventType.COMPLAINT_RESOLVED, actor_id, None, complaint_id=complaint_id)

    def complaint_dismissed(self, actor_id, complaint_id):
        return self.log_event(AuditEventType.COMPLAINT_DISMISSED, actor_id, None, complaint_id=complaint_id)

    def patient_note_created(self, actor_id, patient_id, note_id, flagged_urgent):
        return self.log_event(AuditEventType.PATIENT_NOTE_CREATED, actor_id, None, patient_id=patient_id, note_id=note_id, flagged_urgent=flagged_urgent)

    def patient_note_acknowledged(self, actor_id, note_id):
        return self.log_event(AuditEventType.PATIENT_NOTE_ACKNOWLEDGED, actor_id, None, note_id=note_id)
