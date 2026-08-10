from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, UserRole

from .models import FamilyPatientLink, FamilyProfile, PatientCompatibilityQuestionnaire, PatientProfile
from .permissions import IsFamily
from .serializers import (
    AddFamilyLinkSerializer,
    AddPatientSerializer,
    FamilyPatientLinkSerializer,
    FamilyProfileSerializer,
    PatientCompatibilityQuestionnaireSerializer,
    PatientProfileSerializer,
)


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
        family, created = FamilyProfile.objects.update_or_create(
            user_id=request.user.id, defaults=serializer.validated_data
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


def _get_patient_for_family_request(request, patient_id) -> PatientProfile | None:
    """Shared by every per-patient view below — a patient is only
    accessible to a request if the requesting family account has a
    real FamilyPatientLink to it, not just to whoever originally
    registered them."""
    family = FamilyProfile.objects.filter(user_id=request.user.id).first()
    if family is None:
        return None
    return PatientProfile.objects.filter(id=patient_id, family_links__family=family).first()


class MyPatientsView(APIView):
    """
    GET  /api/patients/ — list patients linked to my family account
    POST /api/patients/ — add a new patient (Tab 1 of the onboarding form)
    """
    permission_classes = [IsFamily]

    def get(self, request):
        family = FamilyProfile.objects.filter(user_id=request.user.id).first()
        if family is None:
            return Response([])
        patients = PatientProfile.objects.filter(family_links__family=family).distinct()
        return Response(PatientProfileSerializer(patients, many=True).data)

    def post(self, request):
        serializer = AddPatientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        relation = data.pop("relation")
        patient_user_id = data.pop("patient_user_id", None)

        family = _get_or_create_family(request.user)
        patient = PatientProfile.objects.create(user_id=patient_user_id, **data)
        FamilyPatientLink.objects.create(family=family, patient=patient, relation=relation)

        return Response(PatientProfileSerializer(patient).data, status=status.HTTP_201_CREATED)


class PatientDetailView(APIView):
    """GET/PUT /api/patients/<id>/ — only accessible to a family linked to this patient."""
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
        return Response(serializer.data)


class PatientQuestionnaireView(APIView):
    """
    GET/PUT /api/patients/<id>/questionnaire/
    Tab 2 of the onboarding form — the compatibility questionnaire that
    feeds matching_service's scoring.
    """
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
        return Response(
            serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED
        )


class PatientFamilyLinksView(APIView):
    """
    GET  /api/patients/<id>/family-links/ — everyone who currently has
         access to this patient's record, e.g. "who else can see mom's
         care info."
    POST /api/patients/<id>/family-links/ — link another existing
         FAMILY-role account (a sibling, most commonly) to this same
         patient by phone number. The actual missing piece: before
         this, the only way a FamilyPatientLink ever got created was
         MyPatientsView.post(), which always creates a brand-new
         patient alongside it — there was no way for a second family
         member to attach themselves to a patient someone else already
         registered.
    """
    permission_classes = [IsFamily]

    def get(self, request, patient_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        links = FamilyPatientLink.objects.filter(patient=patient).select_related("family", "family__user")
        return Response(FamilyPatientLinkSerializer(links, many=True).data)

    def post(self, request, patient_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AddFamilyLinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        target_user = User.objects.filter(phone_number=data["phone_number"], role=UserRole.FAMILY).first()
        if target_user is None:
            return Response(
                {"detail": "کاربری با این شماره تلفن و نقش «خانواده» یافت نشد. ابتدا باید در پلتفرم ثبت‌نام کرده باشد."},
                status=status.HTTP_404_NOT_FOUND,
            )

        target_family = _get_or_create_family(target_user)
        if FamilyPatientLink.objects.filter(family=target_family, patient=patient).exists():
            return Response({"detail": "این حساب از قبل به این بیمار دسترسی دارد."}, status=status.HTTP_400_BAD_REQUEST)

        link = FamilyPatientLink.objects.create(
            family=target_family, patient=patient,
            relation=data["relation"], is_primary_contact=data["is_primary_contact"],
        )
        return Response(FamilyPatientLinkSerializer(link).data, status=status.HTTP_201_CREATED)


class PatientFamilyLinkDetailView(APIView):
    """DELETE /api/patients/<id>/family-links/<link_id>/ — revoke a
    family member's access. Deliberately refuses to remove the last
    remaining link, rather than let a patient end up with zero family
    accounts able to see or manage their record — a supervisor/admin
    can always resolve that manually via Django admin if it's ever
    genuinely needed."""
    permission_classes = [IsFamily]

    def delete(self, request, patient_id, link_id):
        patient = _get_patient_for_family_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        link = FamilyPatientLink.objects.filter(id=link_id, patient=patient).first()
        if link is None:
            return Response({"detail": "یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        if FamilyPatientLink.objects.filter(patient=patient).count() <= 1:
            return Response(
                {"detail": "امکان حذف آخرین دسترسی این بیمار وجود ندارد."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
