from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    CaregiverExperience,
    CaregiverProfile,
    CaregiverReference,
    CaregiverServiceArea,
    CaregiverSkills,
    CaregiverWorkPreferences,
)
from .permissions import IsAdminOrSuperuser, IsCaregiver
from .serializers import (
    CaregiverExperienceSerializer,
    CaregiverFullProfileSerializer,
    CaregiverReferenceListSerializer,
    CaregiverReferenceSerializer,
    CaregiverServiceAreaSerializer,
    CaregiverSkillsSerializer,
    CaregiverWorkPreferencesSerializer,
)


def _get_or_create_profile(user_id: int) -> CaregiverProfile:
    profile, _ = CaregiverProfile.objects.get_or_create(user_id=user_id)
    return profile


def _get_identity_dict(user_id: int) -> dict | None:
    """
    Form 1 lives in apps.accounts.IdentityProfile (see models.py's
    module docstring for why it isn't duplicated here). This is the one
    place apps.caregivers reads from another app's model directly —
    justified because it's read-only, and specifically for assembling
    the aggregate profile view, not for any business decision within
    this app. Imported locally (not at module level) to keep the two
    apps' import graphs independent except where this view explicitly
    needs to bridge them.
    """
    from apps.accounts.models import IdentityProfile

    profile = IdentityProfile.objects.filter(user_id=user_id).first()
    if profile is None:
        return None
    from apps.accounts.serializers import IdentityProfileSerializer
    return IdentityProfileSerializer(profile).data


class MyWorkPreferencesView(APIView):
    """PUT /api/caregivers/me/work-preferences/ — Form 2."""
    permission_classes = [IsCaregiver]

    def get(self, request):
        profile = _get_or_create_profile(request.user.id)
        prefs = getattr(profile, "work_preferences", None)
        if prefs is None:
            return Response({"detail": "این بخش هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CaregiverWorkPreferencesSerializer(prefs).data)

    def put(self, request):
        profile = _get_or_create_profile(request.user.id)
        existing = getattr(profile, "work_preferences", None)
        serializer = CaregiverWorkPreferencesSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


class MyServiceAreasView(APIView):
    """GET/POST /api/caregivers/me/service-areas/ — nested province/city/district list (part of Form 2)."""
    permission_classes = [IsCaregiver]

    def get(self, request):
        profile = _get_or_create_profile(request.user.id)
        areas = profile.service_areas.all()
        return Response(CaregiverServiceAreaSerializer(areas, many=True).data)

    def post(self, request):
        profile = _get_or_create_profile(request.user.id)
        serializer = CaregiverServiceAreaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ServiceAreaDetailView(APIView):
    """DELETE /api/caregivers/me/service-areas/<id>/ — remove one covered area."""
    permission_classes = [IsCaregiver]

    def delete(self, request, area_id):
        profile = _get_or_create_profile(request.user.id)
        deleted, _ = CaregiverServiceArea.objects.filter(id=area_id, profile=profile).delete()
        if not deleted:
            return Response({"detail": "یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyExperienceView(APIView):
    """PUT /api/caregivers/me/experience/ — Form 3, part 1."""
    permission_classes = [IsCaregiver]

    def get(self, request):
        profile = _get_or_create_profile(request.user.id)
        exp = getattr(profile, "experience", None)
        if exp is None:
            return Response({"detail": "این بخش هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CaregiverExperienceSerializer(exp).data)

    def put(self, request):
        profile = _get_or_create_profile(request.user.id)
        existing = getattr(profile, "experience", None)
        serializer = CaregiverExperienceSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


class MySkillsView(APIView):
    """PUT /api/caregivers/me/skills/ — Form 3, part 2."""
    permission_classes = [IsCaregiver]

    def get(self, request):
        profile = _get_or_create_profile(request.user.id)
        skills = getattr(profile, "skills", None)
        if skills is None:
            return Response({"detail": "این بخش هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CaregiverSkillsSerializer(skills).data)

    def put(self, request):
        profile = _get_or_create_profile(request.user.id)
        existing = getattr(profile, "skills", None)
        serializer = CaregiverSkillsSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


class MyReferencesView(APIView):
    """
    GET /api/caregivers/me/references/ — list
    PUT /api/caregivers/me/references/ — replace the full set at once
    (at least two required — see CaregiverReferenceListSerializer)
    """
    permission_classes = [IsCaregiver]

    def get(self, request):
        profile = _get_or_create_profile(request.user.id)
        refs = profile.references.all()
        return Response(CaregiverReferenceSerializer(refs, many=True).data)

    def put(self, request):
        profile = _get_or_create_profile(request.user.id)
        serializer = CaregiverReferenceListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile.references.all().delete()
        created = [
            CaregiverReference.objects.create(profile=profile, **ref)
            for ref in serializer.validated_data["references"]
        ]
        return Response(CaregiverReferenceSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


class MyFullProfileView(APIView):
    """
    GET /api/caregivers/me/full/
    The nested aggregate view — Form 1 (from apps.accounts) plus Forms
    2, 3, 4 (from this app), assembled into one nested response.
    """
    permission_classes = [IsCaregiver]

    def get(self, request):
        profile = _get_or_create_profile(request.user.id)
        data = {
            "is_approved": profile.is_approved,
            "identity": _get_identity_dict(request.user.id),
            "work_preferences": getattr(profile, "work_preferences", None),
            "service_areas": profile.service_areas.all(),
            "experience": getattr(profile, "experience", None),
            "skills": getattr(profile, "skills", None),
            "references": profile.references.all(),
        }
        return Response(CaregiverFullProfileSerializer(data).data)


class ApproveCaregiverView(APIView):
    """
    POST /api/caregivers/<user_id>/approve/
    ADMIN/SUPERUSER only. Requires all four forms to be complete first —
    approving an incomplete profile is refused, not just discouraged.
    """
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, user_id):
        try:
            profile = CaregiverProfile.objects.get(user_id=user_id)
        except CaregiverProfile.DoesNotExist:
            return Response({"detail": "پروفایل مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        missing = []
        if not _get_identity_dict(user_id):
            missing.append("اطلاعات هویتی (فرم ۱)")
        if not hasattr(profile, "work_preferences"):
            missing.append("شرایط همکاری (فرم ۲)")
        if not hasattr(profile, "experience"):
            missing.append("سوابق کاری (فرم ۳)")
        if not hasattr(profile, "skills"):
            missing.append("مهارت‌ها (فرم ۳)")
        if profile.references.count() < 2:
            missing.append("معرف‌ها — حداقل دو مورد (فرم ۴)")

        if missing:
            return Response(
                {"detail": "پروفایل ناقص است و قابل تأیید نیست.", "missing": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.is_approved = True
        profile.approved_by_user_id = request.user.id
        profile.approved_at = timezone.now()
        profile.save(update_fields=["is_approved", "approved_by_user_id", "approved_at"])
        return Response({"detail": "پروفایل تأیید شد.", "is_approved": True})
