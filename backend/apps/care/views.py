from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import AuditService
from apps.caregivers.models import CaregiverProfile
from apps.families.models import FamilyPatientLink, LinkStatus, PatientProfile

from .models import AssignmentStatus, CareLogEntry, CaregiverAssignment, CaregiverReview
from .matching import suggest_caregivers_for_patient
from .mcdm.ranking import rank_candidates_with_topsis
from .permissions import IsAdminOrSuperuser, IsCaregiver, IsFamilyOrPatient
from .serializers import (
    CareLogEntrySerializer,
    CaregiverAssignmentSerializer,
    CaregiverReviewSerializer,
    CreateAssignmentSerializer,
    CreateCareLogEntrySerializer,
    CreateReviewSerializer,
)

audit = AuditService()


def _patient_visible_to_user(user, patient_id) -> PatientProfile | None:
    """The same access rule as apps.families (approved family link, or
    the patient's own account) — reimplemented here against the
    models directly rather than importing apps.families' private view
    helpers, since apps.care already has a data dependency on both
    apps' models (the FK fields are literally "caregivers.
    CaregiverProfile" / "families.PatientProfile") and this is just
    another query against them, not a new service coupling."""
    if user.role == "patient":
        return PatientProfile.objects.filter(id=patient_id, user_id=user.id).first()
    if user.role == "family":
        return PatientProfile.objects.filter(
            id=patient_id, family_links__family__user_id=user.id, family_links__status=LinkStatus.APPROVED,
        ).first()
    return None


class SupervisorAssignmentsView(APIView):
    """
    GET  /api/care/assignments/?patient_code=X or ?caregiver_user_id=X
    POST /api/care/assignments/ — assign a caregiver to a patient.
    """
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        assignments = CaregiverAssignment.objects.select_related("caregiver__user", "patient", "assigned_by")
        patient_code = request.query_params.get("patient_code")
        caregiver_user_id = request.query_params.get("caregiver_user_id")
        if patient_code:
            assignments = assignments.filter(patient__access_code=patient_code.strip().upper())
        if caregiver_user_id:
            assignments = assignments.filter(caregiver__user_id=caregiver_user_id)
        return Response(CaregiverAssignmentSerializer(assignments, many=True).data)

    def post(self, request):
        serializer = CreateAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        caregiver = CaregiverProfile.objects.filter(user_id=data["caregiver_user_id"]).first()
        if caregiver is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        patient = PatientProfile.objects.filter(access_code=data["patient_code"].strip().upper()).first()
        if patient is None:
            return Response({"detail": "کد بیمار معتبر نیست."}, status=status.HTTP_404_NOT_FOUND)

        if CaregiverAssignment.objects.filter(caregiver=caregiver, patient=patient, status=AssignmentStatus.ACTIVE).exists():
            return Response({"detail": "این مراقب از قبل به این بیمار تخصیص یافته است."}, status=status.HTTP_400_BAD_REQUEST)

        assignment = CaregiverAssignment.objects.create(
            caregiver=caregiver, patient=patient, assigned_by=request.user, notes=data["notes"],
        )
        audit.caregiver_assigned(request.user.id, caregiver.user_id, patient.id)
        return Response(CaregiverAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)


class SupervisorEndAssignmentView(APIView):
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, assignment_id):
        assignment = CaregiverAssignment.objects.filter(id=assignment_id, status=AssignmentStatus.ACTIVE).first()
        if assignment is None:
            return Response({"detail": "تخصیص فعال یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        assignment.end()
        audit.caregiver_assignment_ended(request.user.id, assignment.caregiver.user_id, assignment.patient_id)
        return Response(CaregiverAssignmentSerializer(assignment).data)


class MyAssignedPatientsView(APIView):
    """GET /api/care/me/patients/ — a caregiver's own active assignments."""
    permission_classes = [IsCaregiver]

    def get(self, request):
        caregiver = CaregiverProfile.objects.filter(user_id=request.user.id).first()
        if caregiver is None:
            return Response([])
        assignments = CaregiverAssignment.objects.filter(
            caregiver=caregiver, status=AssignmentStatus.ACTIVE,
        ).select_related("patient")
        return Response(CaregiverAssignmentSerializer(assignments, many=True).data)


class MyCareLogEntriesView(APIView):
    """
    GET  /api/care/me/log-entries/?patient=<id> — my own submitted
         reports, optionally for one patient.
    POST /api/care/me/log-entries/ — submit a new report. Only allowed
         for a patient this caregiver is actively assigned to — a
         caregiver can't report on someone they're not caring for.
    """
    permission_classes = [IsCaregiver]

    def get(self, request):
        caregiver = CaregiverProfile.objects.filter(user_id=request.user.id).first()
        if caregiver is None:
            return Response([])
        entries = CareLogEntry.objects.filter(caregiver=caregiver)
        patient_id = request.query_params.get("patient")
        if patient_id:
            entries = entries.filter(patient_id=patient_id)
        return Response(CareLogEntrySerializer(entries, many=True).data)

    def post(self, request):
        caregiver = CaregiverProfile.objects.filter(user_id=request.user.id).first()
        if caregiver is None:
            return Response({"detail": "پروفایل مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CreateCareLogEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        assignment = CaregiverAssignment.objects.filter(
            caregiver=caregiver, patient_id=data["patient"], status=AssignmentStatus.ACTIVE,
        ).first()
        if assignment is None:
            return Response(
                {"detail": "شما در حال حاضر به این بیمار تخصیص ندارید."}, status=status.HTTP_403_FORBIDDEN
            )

        entry = CareLogEntry.objects.create(
            assignment=assignment, caregiver=caregiver, patient_id=data["patient"],
            category=data["category"], note=data["note"],
        )
        audit.care_log_entry_created(request.user.id, data["patient"], data["category"])
        return Response(CareLogEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class PatientCareTeamView(APIView):
    """GET /api/care/patients/<id>/team/ — who's currently caring for
    this patient. Visible to a family member with approved access, or
    the patient themselves."""
    permission_classes = [IsFamilyOrPatient]

    def get(self, request, patient_id):
        patient = _patient_visible_to_user(request.user, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        assignments = CaregiverAssignment.objects.filter(
            patient=patient, status=AssignmentStatus.ACTIVE,
        ).select_related("caregiver__user")
        return Response(CaregiverAssignmentSerializer(assignments, many=True).data)


class PatientCareTimelineView(APIView):
    """GET /api/care/patients/<id>/timeline/ — the care reports
    submitted about this patient, newest first. Same visibility rule
    as the care team view."""
    permission_classes = [IsFamilyOrPatient]

    def get(self, request, patient_id):
        patient = _patient_visible_to_user(request.user, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        entries = CareLogEntry.objects.filter(patient=patient).select_related("caregiver__user")
        return Response(CareLogEntrySerializer(entries, many=True).data)


class SuggestedCaregiversView(APIView):
    """
    GET /api/care/suggest-caregivers/?patient_code=ELD-XXXXXX
    A ranked list of approved caregivers for a supervisor to consider
    when assigning, instead of picking blind. Deliberately supervisor-
    only for now, same reasoning as assignment itself: this suggests,
    a human still decides.

    suggest_caregivers_for_patient() computes the underlying signals
    (objective fit, trait compatibility, rating, capacity) and an
    initial simple weighted ranking. rank_candidates_with_topsis()
    then re-ranks the same candidates using a proper AHP-weighted
    TOPSIS calculation across 7 criteria — the more academically
    rigorous "Phase 4" the matching engine's docstring always
    anticipated replacing the simple weighted average with. Every
    original field is preserved; mcdm_score, ahp_weights, and ahp_
    consistency_ratio are added, not substituted in place of anything.
    """
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        patient_code = request.query_params.get("patient_code", "").strip().upper()
        if not patient_code:
            return Response({"detail": "کد بیمار الزامی است."}, status=status.HTTP_400_BAD_REQUEST)

        patient = PatientProfile.objects.filter(access_code=patient_code).first()
        if patient is None:
            return Response({"detail": "کد بیمار معتبر نیست."}, status=status.HTTP_404_NOT_FOUND)

        suggestions = suggest_caregivers_for_patient(patient)
        suggestions = rank_candidates_with_topsis(suggestions)
        return Response({
            "patient_name": patient.full_name,
            "patient_gender": patient.gender,
            "suggestions": suggestions,
        })


class AssignmentReviewView(APIView):
    """
    POST /api/care/assignments/<id>/review/ — a family member (any
    access level — this doesn't touch the patient's own data, it's
    about the caregiver) or the patient themselves rates the
    caregiver on this specific assignment. Works whether the
    assignment is still active or has already ended — reviewing after
    the fact ("how did it go overall") is a completely normal use
    case, not just an active-assignment feature.
    """
    permission_classes = [IsFamilyOrPatient]

    def post(self, request, assignment_id):
        assignment = CaregiverAssignment.objects.filter(id=assignment_id).select_related("patient").first()
        if assignment is None:
            return Response({"detail": "تخصیص یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        # Same visibility rule as team/timeline — must actually have
        # standing on this patient to review who cared for them.
        if _patient_visible_to_user(request.user, assignment.patient_id) is None:
            return Response({"detail": "تخصیص یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        review, created = CaregiverReview.objects.update_or_create(
            assignment=assignment, reviewer=request.user,
            defaults={"caregiver": assignment.caregiver, "patient": assignment.patient, **data},
        )
        audit.caregiver_reviewed(request.user.id, assignment.caregiver.user_id, assignment.patient_id, data["rating"])
        return Response(
            CaregiverReviewSerializer(review).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PatientQuestionnaireForMatchingView(APIView):
    """
    GET /api/care/patient-questionnaire/?patient_code=ELD-XXXXXX
    Supervisor-only. A real, necessary gap this closes: until now,
    only the patient's own family could see their compatibility
    questionnaire (apps.families.PatientQuestionnaireView is
    IsFamily-only) — a supervisor comparing a patient's answers
    against a caregiver's flexibility questionnaire had no way to see
    the patient's side at all. Not a scoring endpoint — returns the
    patient's raw answers so the frontend (which already has the axis
    groupings) can show them next to a caregiver's per-section
    flexibility score for a human to compare, the same "inform, don't
    decide" pattern as every other matching signal.
    """
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        from apps.families.models import PatientCompatibilityQuestionnaire, PatientProfile
        from apps.families.serializers import PatientCompatibilityQuestionnaireSerializer

        patient_code = request.query_params.get("patient_code", "").strip().upper()
        if not patient_code:
            return Response({"detail": "کد بیمار الزامی است."}, status=status.HTTP_400_BAD_REQUEST)

        patient = PatientProfile.objects.filter(access_code=patient_code).first()
        if patient is None:
            return Response({"detail": "کد بیمار معتبر نیست."}, status=status.HTTP_404_NOT_FOUND)

        questionnaire = PatientCompatibilityQuestionnaire.objects.filter(patient=patient).first()
        if questionnaire is None:
            return Response({"detail": "پرسشنامه این بیمار هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)

        return Response(PatientCompatibilityQuestionnaireSerializer(questionnaire).data)
