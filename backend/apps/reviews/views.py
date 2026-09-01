from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import AuditService
from apps.authentication.tasks import send_urgent_alert_sms
from apps.authorization.permissions import IsAdminOrSuperuser, IsCaregiver, IsFamily

from .models import CaregiverNoteAboutPatient, Complaint
from .serializers import (
    ComplaintDetailSerializer,
    ComplaintListItemSerializer,
    CreateComplaintSerializer,
    CreatePatientNoteSerializer,
    PatientNoteDetailSerializer,
    PatientNoteListItemSerializer,
    ResolveComplaintSerializer,
)

audit = AuditService()


def _notify_staff_of_urgent_note(note):
    """
    Fires on every flagged_urgent patient note — per an explicit
    product decision that urgent items can't rely on someone happening
    to check a dashboard. Sends to every ADMIN/SUPERUSER account's
    phone, not a fixed on-call number, since this platform has no
    on-call/shift concept anywhere else to hook into.

    One independent task per recipient — see send_urgent_alert_sms's
    own docstring for why a transient failure reaching one admin
    shouldn't block or repeat the send to the others. Wrapped in
    try/except, matching the same convention already used for the
    welcome-notification queue call: a failure here must never block
    the actual note from being saved.
    """
    from apps.accounts.models import User, UserRole
    caregiver_name = note.caregiver.display_name
    patient_name = note.patient.full_name if note.patient else "نامشخص"
    message = (
        f"یادداشت فوری ثبت شد. مراقب: {caregiver_name} — سالمند: {patient_name}. "
        f"لطفاً در پنل ادمین بررسی کنید."
    )
    staff_phones = User.objects.filter(role__in=[UserRole.ADMIN, UserRole.SUPERUSER]).values_list("phone_number", flat=True)
    for phone in staff_phones:
        try:
            send_urgent_alert_sms.delay(phone, message)
        except Exception:
            import logging
            logging.getLogger("apps.reviews").exception("Failed to queue urgent alert SMS for phone=%s", phone)


class MyComplaintsView(APIView):
    """
    GET  /api/reviews/complaints/me/ — complaints I've filed.
    POST /api/reviews/complaints/me/ — file a new one.
    FAMILY only — this is deliberately a "the person filing this IS
    the account making the request" endpoint, same reasoning as
    terms-acceptance being personal rather than delegable: a
    complaint is this family member's own account of what happened,
    not something a supervisor or agency could file on their behalf.
    """
    permission_classes = [IsFamily]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        complaints = Complaint.objects.filter(filed_by=request.user).select_related(
            "patient", "about_caregiver__user__caregiver_identity_profile", "filed_by",
        )
        return Response(ComplaintListItemSerializer(complaints, many=True).data)

    def post(self, request):
        serializer = CreateComplaintSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save(filed_by=request.user)
        audit.complaint_filed(request.user.id, complaint.patient_id, complaint.id, complaint.category)
        return Response(ComplaintDetailSerializer(complaint).data, status=status.HTTP_201_CREATED)


class ComplaintListView(APIView):
    """
    GET /api/reviews/complaints/?status=open&about_caregiver=<id> —
    ADMIN/SUPERUSER only. Platform-wide, not agency-scoped — a
    complaint's resolution is a platform trust-and-safety matter, not
    something delegated to the agency the caregiver happens to
    currently be linked to (an agency reviewing complaints about its
    own caregivers would be reviewing itself).

    about_caregiver filter added specifically to connect this to the
    caregiver approval/review workflow in admin-panel — before this,
    an admin deciding whether to approve or blacklist a caregiver had
    no visibility into complaints filed about them at all, despite
    both features existing independently.
    """
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        complaints = Complaint.objects.select_related(
            "patient", "about_caregiver__user__caregiver_identity_profile", "filed_by",
        ).all()
        caregiver_filter = request.query_params.get("about_caregiver")
        if caregiver_filter:
            complaints = complaints.filter(about_caregiver__user_id=caregiver_filter)
        status_filter = request.query_params.get("status")
        if status_filter:
            complaints = complaints.filter(status=status_filter)
        return Response(ComplaintListItemSerializer(complaints, many=True).data)


class ComplaintDetailView(APIView):
    """GET /api/reviews/complaints/<id>/ — ADMIN/SUPERUSER only."""
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request, complaint_id):
        complaint = Complaint.objects.select_related(
            "patient", "about_caregiver__user__caregiver_identity_profile", "filed_by",
        ).filter(id=complaint_id).first()
        if complaint is None:
            return Response({"detail": "شکایت یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ComplaintDetailSerializer(complaint).data)


def _get_complaint_or_404(complaint_id):
    return Complaint.objects.filter(id=complaint_id).first()


class MarkComplaintUnderReviewView(APIView):
    """POST /api/reviews/complaints/<id>/under-review/ — ADMIN/SUPERUSER only."""
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, complaint_id):
        complaint = _get_complaint_or_404(complaint_id)
        if complaint is None:
            return Response({"detail": "شکایت یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        complaint.mark_under_review(request.user)
        audit.complaint_under_review(request.user.id, complaint.id)
        return Response(ComplaintDetailSerializer(complaint).data)


class ResolveComplaintView(APIView):
    """POST /api/reviews/complaints/<id>/resolve/  {"note": "..."}"""
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, complaint_id):
        complaint = _get_complaint_or_404(complaint_id)
        if complaint is None:
            return Response({"detail": "شکایت یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ResolveComplaintSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint.resolve(request.user, note=serializer.validated_data.get("note", ""))
        audit.complaint_resolved(request.user.id, complaint.id)
        return Response(ComplaintDetailSerializer(complaint).data)


class DismissComplaintView(APIView):
    """POST /api/reviews/complaints/<id>/dismiss/  {"note": "..."}"""
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, complaint_id):
        complaint = _get_complaint_or_404(complaint_id)
        if complaint is None:
            return Response({"detail": "شکایت یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ResolveComplaintSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint.dismiss(request.user, note=serializer.validated_data.get("note", ""))
        audit.complaint_dismissed(request.user.id, complaint.id)
        return Response(ComplaintDetailSerializer(complaint).data)


class MyPatientNotesView(APIView):
    """
    GET  /api/reviews/patient-notes/me/ — notes I've written.
    POST /api/reviews/patient-notes/me/ — write a new one.
    CAREGIVER only, same "the account making this request must be the
    one it's actually about" reasoning as MyComplaintsView.
    """
    permission_classes = [IsCaregiver]

    def get(self, request):
        notes = CaregiverNoteAboutPatient.objects.filter(caregiver__user=request.user).select_related(
            "patient", "caregiver__user__caregiver_identity_profile",
        )
        return Response(PatientNoteListItemSerializer(notes, many=True).data)

    def post(self, request):
        serializer = CreatePatientNoteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        note = serializer.save(caregiver=request.user.caregiver_profile)
        audit.patient_note_created(request.user.id, note.patient_id, note.id, note.flagged_urgent)
        if note.flagged_urgent:
            _notify_staff_of_urgent_note(note)
        return Response(PatientNoteDetailSerializer(note).data, status=status.HTTP_201_CREATED)


class PatientNoteListView(APIView):
    """
    GET /api/reviews/patient-notes/?flagged_urgent=true — ADMIN/
    SUPERUSER only, platform-wide — same reasoning as
    ComplaintListView for why this isn't agency-scoped.
    """
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        notes = CaregiverNoteAboutPatient.objects.select_related(
            "patient", "caregiver__user__caregiver_identity_profile",
        ).all()
        if request.query_params.get("flagged_urgent") == "true":
            notes = notes.filter(flagged_urgent=True)
        if request.query_params.get("unacknowledged") == "true":
            notes = notes.filter(acknowledged_at__isnull=True)
        return Response(PatientNoteListItemSerializer(notes, many=True).data)


class PatientNoteDetailView(APIView):
    """GET /api/reviews/patient-notes/<id>/ — ADMIN/SUPERUSER only."""
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request, note_id):
        note = CaregiverNoteAboutPatient.objects.select_related(
            "patient", "caregiver__user__caregiver_identity_profile",
        ).filter(id=note_id).first()
        if note is None:
            return Response({"detail": "یادداشت یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientNoteDetailSerializer(note).data)


class AcknowledgePatientNoteView(APIView):
    """POST /api/reviews/patient-notes/<id>/acknowledge/ — ADMIN/SUPERUSER only."""
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, note_id):
        note = CaregiverNoteAboutPatient.objects.filter(id=note_id).first()
        if note is None:
            return Response({"detail": "یادداشت یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        note.acknowledge(request.user)
        audit.patient_note_acknowledged(request.user.id, note.id)
        return Response(PatientNoteDetailSerializer(note).data)
