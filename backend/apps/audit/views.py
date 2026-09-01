from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authorization.permissions import IsAdminOrSuperuser

from .models import AuditLog
from .serializers import AuditLogSerializer, build_user_names_map


def _apply_date_range(queryset, request):
    """
    Shared by both views below — created_at is a plain (non-jalali)
    DateTimeField, so ISO date strings (YYYY-MM-DD) filter directly,
    no calendar conversion needed here unlike most other date fields
    in this codebase.
    """
    start = request.query_params.get("start")
    end = request.query_params.get("end")
    if start:
        parsed = parse_date(start)
        if parsed:
            queryset = queryset.filter(created_at__date__gte=parsed)
    if end:
        parsed = parse_date(end)
        if parsed:
            queryset = queryset.filter(created_at__date__lte=parsed)
    return queryset


class AuditLogListView(APIView):
    """
    GET /api/audit/logs/?event_type=&actor_user_id=&target_user_id=&start=&end=
    ADMIN/SUPERUSER only — the general-purpose staff history browser.
    Before this endpoint existed, AuditLog had no query surface at
    all anywhere in the API — every event since this table's creation
    was being written but never actually readable by anyone.
    """
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        logs = AuditLog.objects.all()

        event_type = request.query_params.get("event_type")
        if event_type:
            logs = logs.filter(event_type=event_type)

        actor_id = request.query_params.get("actor_user_id")
        if actor_id:
            logs = logs.filter(actor_user_id=actor_id)

        target_id = request.query_params.get("target_user_id")
        if target_id:
            logs = logs.filter(target_user_id=target_id)

        logs = _apply_date_range(logs, request)
        logs = logs[:500]  # a hard ceiling, not pagination — see note in tests

        user_ids = set()
        for entry in logs:
            user_ids.add(entry.actor_user_id)
            user_ids.add(entry.target_user_id)
        names = build_user_names_map(user_ids)

        return Response(AuditLogSerializer(logs, many=True, context={"user_names": names}).data)


class PatientAuditHistoryView(APIView):
    """
    GET /api/audit/logs/patient/<patient_id>/?start=&end=

    The specific feature requested: any family member with an
    APPROVED link to this patient can see the real history of what
    happened to their own patient's record — who did what, and when
    — by real name, not just an internal id. Scoped to events whose
    metadata carries this patient_id, which covers the large majority
    of patient-centric events (family link changes, assignments, care
    log entries, reviews, complaints, notes) since they were all
    already written with patient_id in metadata for exactly this kind
    of future query, well before this view existed to actually use it.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        from apps.families.models import FamilyPatientLink, LinkStatus
        has_access = FamilyPatientLink.objects.filter(
            family__user=request.user, patient_id=patient_id, status=LinkStatus.APPROVED,
        ).exists()
        if not has_access:
            return Response({"detail": "شما به این سالمند دسترسی تأییدشده ندارید."}, status=status.HTTP_403_FORBIDDEN)

        logs = AuditLog.objects.filter(metadata__patient_id=patient_id)
        logs = _apply_date_range(logs, request)
        logs = logs[:500]

        user_ids = set()
        for entry in logs:
            user_ids.add(entry.actor_user_id)
            user_ids.add(entry.target_user_id)
        names = build_user_names_map(user_ids)

        return Response(AuditLogSerializer(logs, many=True, context={"user_names": names}).data)


class MyAuditHistoryView(APIView):
    """
    GET /api/audit/logs/me/?start=&end=

    Any authenticated user's own history — events where they were
    either the target or the actor. Closes the gap between the two
    endpoints already built: family-panel got patient-scoped history,
    admin-panel got the full staff-wide browser, but nobody had a way
    to see events concerning their OWN account — a caregiver couldn't
    see when they were approved, rejected, or blacklisted anywhere
    except the one-line status banner added earlier; the actual dated
    history of it was still invisible to the person it happened to.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q
        logs = AuditLog.objects.filter(Q(target_user_id=request.user.id) | Q(actor_user_id=request.user.id))
        logs = _apply_date_range(logs, request)
        logs = logs[:500]

        user_ids = set()
        for entry in logs:
            user_ids.add(entry.actor_user_id)
            user_ids.add(entry.target_user_id)
        names = build_user_names_map(user_ids)

        return Response(AuditLogSerializer(logs, many=True, context={"user_names": names}).data)
