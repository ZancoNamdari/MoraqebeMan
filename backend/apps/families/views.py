from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FamilyPatientLink, FamilyProfile, PatientCompatibilityQuestionnaire, PatientProfile
from .permissions import IsFamily
from .serializers import (
    AddPatientSerializer,
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

    def _get_patient_for_request(self, request, patient_id):
        family = FamilyProfile.objects.filter(user_id=request.user.id).first()
        if family is None:
            return None
        return PatientProfile.objects.filter(id=patient_id, family_links__family=family).first()

    def get(self, request, patient_id):
        patient = self._get_patient_for_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientProfileSerializer(patient).data)

    def put(self, request, patient_id):
        patient = self._get_patient_for_request(request, patient_id)
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

    def _get_patient_for_request(self, request, patient_id):
        family = FamilyProfile.objects.filter(user_id=request.user.id).first()
        if family is None:
            return None
        return PatientProfile.objects.filter(id=patient_id, family_links__family=family).first()

    def get(self, request, patient_id):
        patient = self._get_patient_for_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        questionnaire = PatientCompatibilityQuestionnaire.objects.filter(patient=patient).first()
        if questionnaire is None:
            return Response({"detail": "پرسشنامه هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientCompatibilityQuestionnaireSerializer(questionnaire).data)

    def put(self, request, patient_id):
        patient = self._get_patient_for_request(request, patient_id)
        if patient is None:
            return Response({"detail": "بیمار یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        existing = PatientCompatibilityQuestionnaire.objects.filter(patient=patient).first()
        serializer = PatientCompatibilityQuestionnaireSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(patient=patient)
        return Response(
            serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED
        )
