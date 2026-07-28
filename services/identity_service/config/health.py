"""
Liveness/readiness endpoint for Docker HEALTHCHECK and any future k8s
readinessProbe. Deliberately outside DRF (no auth, no JWT dependency) —
a health check that itself requires the DB or a valid token defeats
the purpose of a health check.
"""
from django.db import connection
from django.http import JsonResponse


def health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False

    status = 200 if db_ok else 503
    return JsonResponse({"status": "ok" if db_ok else "unhealthy", "database": db_ok}, status=status)
