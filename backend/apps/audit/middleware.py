"""
Minimal request-outcome logger. Deliberately not writing to the
database yet (no AuditLog model) — logs to the audit_file handler
configured in config/settings/logging.py. Swap for a real AuditLog
model + DB write once apps/audit gets built out properly; kept as a
log-only pass-through for now so the Dockerfile/settings chain is not
blocked on that larger feature.
"""
import logging

logger = logging.getLogger("apps.audit")


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Only log auth-relevant paths for now — logging every static
        # asset request would drown the audit log in noise.
        if request.path.startswith("/api/"):
            user = getattr(request, "user", None)
            user_label = user.id if user and user.is_authenticated else "anonymous"
            logger.info(
                "%s %s -> %s (user=%s)",
                request.method, request.path, response.status_code, user_label,
            )
        return response
