from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, UserRole
from apps.audit.services import AuditService

from .models import AccessLevel, FamilyPatientLink, FamilyProfile, LinkStatus, PatientCompatibilityQuestionnaire, PatientProfile
from .permissions import IsFamily, IsPatient
from .serializers import (
    AddPatientSerializer,
    FamilyPatientLinkSerializer,
    FamilyProfileSerializer,
    InviteFamilyByCodeSerializer,
    PatientCompatibilityQuestionnaireSerializer,
    PatientProfileSerializer,
    RequestPatientAccessSerializer,
    UpdateFamilyLinkSerializer,
)

audit = AuditService()


class MyFamilyProfileView(APIView):
    permission_classes = [IsFamily]

    def get(self, request):
        family = FamilyProfile.objects.filter(user_id=request.user.id).first()
        if family is None:
            return Response({"detail": "پروفایل خانواده هنوز ایجاد نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(FamilyProfileSerializer(family).data)

    def post(self, request):
        serializer = FamilyProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        if not data.get("display_name"):
            # No need to make someone type their own name twice —
            # fall back to what's already on their account.
            data["display_name"] = request.user.get_full_name() or request.user.phone_number
        family, created = FamilyProfile.objects.update_or_create(
            user_id=request.user.id, defaults=data
        )
        return Response(
            FamilyProfileSerializer(family).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


def _get_or_create_family(user) -> FamilyProfile:
    family, _ = FamilyProfile.objects.get_or_create(
        user_id=user.id, defaults={"display_name": user.phone_number}
    )
    return family


def _family_for_request(request) -> FamilyProfile | None:
    return FamilyProfile.objects.filter(user_id=request.user.id).first()


def _get_patient_for_family_request(request, patient_id) -> PatientProfile | None:
    """Shared by every per-patient family-side view — a patient is only
    accessible if the requesting family account has an APPROVED
    FamilyPatientLink to it. A PENDING link (their own outstanding
    request) does not grant access yet."""
    family = _family_for_request(request)
    if family is None:
        return None
    return PatientProfile.objects.filter(
        id=patient_id, family_links__family=family, family_links__status=LinkStatus.APPROVED,
    ).first()


def _approve_link(link: FamilyPatientLink, approving_user) -> None:
    link.status = LinkStatus.APPROVED
    link.approved_by = approving_user
    link.approved_at = timezone.now()
    link.save(update_fields=["status", "approved_by", "approved_at"])


class MyPatientsView(APIView):
    """
    GET  /api/patients/ — patients I (a family account) have APPROVED
         access to.
    POST /api/patients/ — register a new patient (Tab 1 of the
         onboarding form). The registering family is auto-linked as an
         APPROVED family member — they just did the work of creating
         this record, no reason to make them separately request access
         to something they made.
    """
    permission_classes = [IsFamily]

    def get(self, request):
        family = _family_for_request(request)
        if family is None:
            return Response([])
        patients = PatientProfile.objects.filter(
            family_links__family=family, family_links__status=LinkStatus.APPROVED,
        ).distinct()
        return Response(PatientProfileSerializer(patients, many=True).data)

    def post(self, request):
        serializer = AddPatientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        relation = data.pop("relation")

        family = _get_or_create_family(request.user)
        patient = PatientProfile.objects.create(**data)
        FamilyPatientLink.objects.create(
            family=family, patient=patient, relation=relation,
            status=LinkStatus.APPROVED, approved_by=request.user,
        )
        audit.patient_created(request.user.id, patient.id)

        return Response(PatientProfileSerializer(patient).data, status=status.HTTP_201_CREATED)


class ConnectToPatientView(APIView):
    """
    POST /api/patients/connect/ — a family member joins using the
    patient's own access code.

    Grants immediate VIEW_ONLY access, not a pending request. The
    patient's code is itself the authorization here — it's something
    only their actual family circle would have, the same way a shared
    door code works. Requiring ANOTHER family member to separately
    approve every sibling who already holds that code created a real
    bottleneck: one sibling forgetting, refusing, or just being
    unavailable to click "approve" meant everyone else stayed locked
    out of even seeing basic status and timeline info. Every family
    member holding the same patient code now gets equal, immediate
    view access — solving that specific problem directly.

    Deliberately still VIEW_ONLY, not FULL — seeing status/timeline is
    safe to grant automatically; editing medical/identity info or
    managing who else has access stays a deliberate action via the
    invite-by-family-code flow (PatientFamilyLinksView.post /
    MyPatientInviteFamilyView.post), which still requires someone
    already inside the circle to actively grant it.
    """
    permission_classes = [IsFamily]

    def post(self, request):
        serializer = RequestPatientAccessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient = PatientProfile.objects.get(access_code=data["patient_code"])
        family = _get_or_create_family(request.user)

        if FamilyPatientLink.objects.filter(family=family, patient=patient).exists():
            return Response({"detail": "شما قبلاً با این بیمار ارتباط دارید."}, status=status.HTTP_400_BAD_REQUEST)

        link = FamilyPatientLink.objects.create(
            family=family, patient=patient, relation=data["relation"],
            status=LinkStatus.APPROVED, access_level=AccessLevel.VIEW_ONLY,
            approved_by=request.user, approved_at=timezone.now(), is_primary_contact=False,
        )
        return Response(
            {"detail": "با موفقیت متصل شدید — اکنون می‌توانید وضعیت و جدول زمانی مراقبت را مشاهده کنید.", "link_id": link.id},
            status=status.HTTP_201_CREATED,
        )


class PatientDetailView(APIView):
    """
    GET    /api/patients/<id>/ — only accessible to a family with
           APPROVED access to this patient.
    PUT    /api/patients/<id>/ — update.
    DELETE /api/patients/<id>/ — removes the patient record entirely.
    """
    permission_classes = [IsFamily]

    def get(self, request, patient_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientProfileSerializer(patient).data)

    def put(self, request, patient_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PatientProfileSerializer(instance=patient, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        audit.patient_updated(request.user.id, patient.id, section="profile")
        return Response(serializer.data)

    def delete(self, request, patient_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        audit.patient_deleted(request.user.id, patient.id)
        patient.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PatientQuestionnaireView(APIView):
    permission_classes = [IsFamily]

    def get(self, request, patient_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        questionnaire = PatientCompatibilityQuestionnaire.objects.filter(patient=patient).first()
        if questionnaire is None:
            return Response({"detail": "پرسشنامه هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientCompatibilityQuestionnaireSerializer(questionnaire).data)

    def put(self, request, patient_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        existing = PatientCompatibilityQuestionnaire.objects.filter(patient=patient).first()
        serializer = PatientCompatibilityQuestionnaireSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(patient=patient)
        audit.patient_updated(request.user.id, patient.id, section="questionnaire")
        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


class PatientFamilyLinksView(APIView):
    """
    GET  /api/patients/<id>/family-links/ — everyone with APPROVED
         access to this patient.
    POST /api/patients/<id>/family-links/ — invite a family member by
         THEIR access code — approved immediately, since the requester
         already has approved standing on this patient themselves.
    """
    permission_classes = [IsFamily]

    def get(self, request, patient_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        links = FamilyPatientLink.objects.filter(patient=patient, status=LinkStatus.APPROVED).select_related("family", "family__user")
        return Response(FamilyPatientLinkSerializer(links, many=True).data)

    def post(self, request, patient_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        serializer = InviteFamilyByCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        target_family = FamilyProfile.objects.get(access_code=data["family_code"])
        if FamilyPatientLink.objects.filter(family=target_family, patient=patient).exists():
            return Response({"detail": "این حساب از قبل به این بیمار دسترسی دارد یا درخواست داده است."}, status=status.HTTP_400_BAD_REQUEST)

        link = FamilyPatientLink.objects.create(
            family=target_family, patient=patient, relation=data["relation"],
            access_level=data["access_level"], status=LinkStatus.APPROVED,
            approved_by=request.user, is_primary_contact=False,
        )
        link.approved_at = timezone.now()
        link.save(update_fields=["approved_at"])

        audit.family_link_added(request.user.id, patient.id, target_family.user_id)
        return Response(FamilyPatientLinkSerializer(link).data, status=status.HTTP_201_CREATED)


class PatientAccessRequestsView(APIView):
    """GET /api/patients/<id>/access-requests/ — pending requests
    waiting for someone with standing on this patient to decide."""
    permission_classes = [IsFamily]

    def get(self, request, patient_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        pending = FamilyPatientLink.objects.filter(patient=patient, status=LinkStatus.PENDING).select_related("family", "family__user")
        return Response(FamilyPatientLinkSerializer(pending, many=True).data)


class PatientAccessRequestDecisionView(APIView):
    """POST .../access-requests/<link_id>/approve/ or /reject/"""
    permission_classes = [IsFamily]

    def post(self, request, patient_id, link_id, decision):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        link = FamilyPatientLink.objects.filter(id=link_id, patient=patient, status=LinkStatus.PENDING).first()
        if link is None:
            return Response({"detail": "درخواست یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        if decision == "approve":
            _approve_link(link, request.user)
            audit.family_link_added(request.user.id, patient.id, link.family.user_id)
        else:
            link.status = LinkStatus.REJECTED
            link.save(update_fields=["status"])

        return Response(FamilyPatientLinkSerializer(link).data)


class PatientFamilyLinkDetailView(APIView):
    """
    PATCH  /api/patients/<id>/family-links/<link_id>/ — update relation,
           access level, and/or hand off primary-contact status.
    DELETE /api/patients/<id>/family-links/<link_id>/ — revoke access.
           Refuses to remove the last remaining APPROVED link.
    """
    permission_classes = [IsFamily]

    def patch(self, request, patient_id, link_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        link = FamilyPatientLink.objects.filter(id=link_id, patient=patient).first()
        if link is None:
            return Response({"detail": "یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateFamilyLinkSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "relation" in data:
            link.relation = data["relation"]
        if "access_level" in data:
            link.access_level = data["access_level"]
        if data.get("is_primary_contact") is True:
            FamilyPatientLink.objects.filter(patient=patient).exclude(id=link.id).update(is_primary_contact=False)
            link.is_primary_contact = True
        elif "is_primary_contact" in data:
            link.is_primary_contact = data["is_primary_contact"]
        link.save()

        audit.patient_updated(request.user.id, patient.id, section="family_link")
        return Response(FamilyPatientLinkSerializer(link).data)

    def delete(self, request, patient_id, link_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        link = FamilyPatientLink.objects.filter(id=link_id, patient=patient).first()
        if link is None:
            return Response({"detail": "یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        if FamilyPatientLink.objects.filter(patient=patient, status=LinkStatus.APPROVED).count() <= 1:
            return Response({"detail": "امکان حذف آخرین دسترسی این بیمار وجود ندارد."}, status=status.HTTP_400_BAD_REQUEST)

        unlinked_user_id = link.family.user_id
        link.delete()
        audit.family_link_removed(request.user.id, patient.id, unlinked_user_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# Patient-facing endpoints — a PATIENT-role user managing their OWN
# record directly, now that patients can have their own account
# instead of always being a dependent profile managed entirely by
# family.
# ============================================================

def _patient_for_user(user) -> PatientProfile | None:
    return PatientProfile.objects.filter(user_id=user.id).first()


class MyPatientProfileView(APIView):
    """GET/PUT /api/patients/me/ — a patient managing their own record."""
    permission_classes = [IsPatient]

    def get(self, request):
        patient = _patient_for_user(request.user)
        if patient is None:
            return Response({"detail": "پروفایل بیمار برای این حساب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientProfileSerializer(patient).data)

    def put(self, request):
        patient = _patient_for_user(request.user)
        serializer = PatientProfileSerializer(instance=patient, data=request.data)
        serializer.is_valid(raise_exception=True)
        created = patient is None
        serializer.save(user=request.user) if created else serializer.save()
        audit.patient_updated(request.user.id, serializer.instance.id, section="profile")
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class MyPatientFamilyLinksView(APIView):
    """GET /api/patients/me/family-links/ — who currently has access
    to me."""
    permission_classes = [IsPatient]

    def get(self, request):
        patient = _patient_for_user(request.user)
        if patient is None:
            return Response({"detail": "پروفایل بیمار برای این حساب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        links = FamilyPatientLink.objects.filter(patient=patient, status=LinkStatus.APPROVED).select_related("family", "family__user")
        return Response(FamilyPatientLinkSerializer(links, many=True).data)


class MyPatientAccessRequestsView(APIView):
    """GET /api/patients/me/access-requests/ — family members asking
    for access to me, waiting on my decision."""
    permission_classes = [IsPatient]

    def get(self, request):
        patient = _patient_for_user(request.user)
        if patient is None:
            return Response({"detail": "پروفایل بیمار برای این حساب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        pending = FamilyPatientLink.objects.filter(patient=patient, status=LinkStatus.PENDING).select_related("family", "family__user")
        return Response(FamilyPatientLinkSerializer(pending, many=True).data)


class MyPatientAccessRequestDecisionView(APIView):
    """POST /api/patients/me/access-requests/<link_id>/approve|reject/"""
    permission_classes = [IsPatient]

    def post(self, request, link_id, decision):
        patient = _patient_for_user(request.user)
        if patient is None:
            return Response({"detail": "پروفایل بیمار برای این حساب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        link = FamilyPatientLink.objects.filter(id=link_id, patient=patient, status=LinkStatus.PENDING).first()
        if link is None:
            return Response({"detail": "درخواست یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        if decision == "approve":
            _approve_link(link, request.user)
            audit.family_link_added(request.user.id, patient.id, link.family.user_id)
        else:
            link.status = LinkStatus.REJECTED
            link.save(update_fields=["status"])

        return Response(FamilyPatientLinkSerializer(link).data)


class MyPatientInviteFamilyView(APIView):
    """POST /api/patients/me/invite-family/ — the patient inviting a
    family member by that family member's code, approved immediately
    (the patient has full authority over their own record)."""
    permission_classes = [IsPatient]

    def post(self, request):
        patient = _patient_for_user(request.user)
        if patient is None:
            return Response({"detail": "پروفایل بیمار برای این حساب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        serializer = InviteFamilyByCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        target_family = FamilyProfile.objects.get(access_code=data["family_code"])
        if FamilyPatientLink.objects.filter(family=target_family, patient=patient).exists():
            return Response({"detail": "این حساب از قبل به این بیمار دسترسی دارد یا درخواست داده است."}, status=status.HTTP_400_BAD_REQUEST)

        link = FamilyPatientLink.objects.create(
            family=target_family, patient=patient, relation=data["relation"],
            access_level=data["access_level"], status=LinkStatus.APPROVED,
            approved_by=request.user, approved_at=timezone.now(), is_primary_contact=False,
        )
        audit.family_link_added(request.user.id, patient.id, target_family.user_id)
        return Response(FamilyPatientLinkSerializer(link).data, status=status.HTTP_201_CREATED)


class MyPatientQuestionnaireView(APIView):
    """GET/PUT /api/patients/me/questionnaire/ — the patient filling in
    their own compatibility questionnaire directly, mirroring the
    family-facing PatientQuestionnaireView. Needed once a patient can
    have their own account at all — before now every patient record
    was necessarily created and filled in by a family member; this
    fills the same gap the rest of the /me/ patient endpoints already
    closed for profile/access-request management."""
    permission_classes = [IsPatient]

    def get(self, request):
        patient = _patient_for_user(request.user)
        if patient is None:
            return Response({"detail": "پروفایل بیمار برای این حساب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        questionnaire = PatientCompatibilityQuestionnaire.objects.filter(patient=patient).first()
        if questionnaire is None:
            return Response({"detail": "پرسشنامه هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientCompatibilityQuestionnaireSerializer(questionnaire).data)

    def put(self, request):
        patient = _patient_for_user(request.user)
        if patient is None:
            return Response({"detail": "پروفایل بیمار برای این حساب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        existing = PatientCompatibilityQuestionnaire.objects.filter(patient=patient).first()
        serializer = PatientCompatibilityQuestionnaireSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(patient=patient)
        audit.patient_updated(request.user.id, patient.id, section="questionnaire")
        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)
