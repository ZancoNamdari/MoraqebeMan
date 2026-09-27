"""
The seven "تکمیل مدارک" checklist items' real files — see
CaregiverDocumentUpload's own docstring in models.py for the full
picture. Kept as a separate module from views.py/supervisor_views.py
because these two endpoints are deliberately reachable from BOTH
admin-panel (platform admin/superuser) and agency-panel (that same
caregiver's own agency owner/supervisor) — neither of those existing
files is the natural home for a check that spans both.
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.agencies.tenancy import can_review_caregiver_document
from apps.audit.services import AuditService

from .models import CaregiverDocumentType, CaregiverDocumentUpload, CaregiverProfile
from .serializers import CaregiverDocumentUploadSerializer

audit = AuditService()


def _get_reviewable_upload(request, user_id: int, document_type: str):
    """
    Returns (upload, error_response) — the same "don't reveal whether
    it exists to someone who can't see it" convention used elsewhere
    in this codebase (apps.families, apps.caregivers.supervisor_views):
    a caregiver outside the actor's own reach gets 404, not 403,
    whether that's because the caregiver doesn't exist, this document
    was never uploaded, or the actor simply isn't allowed to see it.
    """
    if document_type not in CaregiverDocumentType.values:
        return None, Response({"detail": "نوع مدرک نامعتبر است."}, status=status.HTTP_404_NOT_FOUND)

    caregiver = CaregiverProfile.objects.filter(user_id=user_id).first()
    if caregiver is None or not can_review_caregiver_document(request.user, caregiver):
        return None, Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

    upload = CaregiverDocumentUpload.objects.filter(caregiver=caregiver, document_type=document_type).first()
    if upload is None:
        return None, Response(
            {"detail": "هنوز فایلی برای این مدرک بارگذاری نشده است."}, status=status.HTTP_404_NOT_FOUND,
        )
    return upload, None


class CaregiverDocumentApproveView(APIView):
    """
    POST /api/caregivers/<user_id>/documents/<document_type>/approve/
    Marks the currently-uploaded file for this document type as
    accepted, which also flips the matching doc_* checkbox on the
    agency-panel Kanban card to checked (CaregiverDocumentUpload.approve()).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id, document_type):
        upload, error = _get_reviewable_upload(request, user_id, document_type)
        if error:
            return error
        upload.approve(request.user)
        audit.caregiver_updated(request.user.id, user_id, section=f"document_approved:{document_type}")
        return Response(CaregiverDocumentUploadSerializer(upload).data)


class CaregiverDocumentRejectView(APIView):
    """
    POST /api/caregivers/<user_id>/documents/<document_type>/reject/
    Body: {"reason": "..."}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id, document_type):
        upload, error = _get_reviewable_upload(request, user_id, document_type)
        if error:
            return error
        reason = (request.data.get("reason") or "").strip()
        if not reason:
            return Response({"detail": "دلیل رد شدن الزامی است."}, status=status.HTTP_400_BAD_REQUEST)
        upload.reject(request.user, reason)
        audit.caregiver_updated(request.user.id, user_id, section=f"document_rejected:{document_type}")
        return Response(CaregiverDocumentUploadSerializer(upload).data)
