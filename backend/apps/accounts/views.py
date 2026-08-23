from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.caregivers.models import IdentityProfile
from .serializers import IdentityProfileSerializer


class MyIdentityProfileView(APIView):
    """
    GET/PUT /api/auth/me/identity-profile/
    Form 1 (اطلاعات هویتی و اولیه) of the caregiver onboarding flow —
    kept here rather than in caregiver_service because it's identity/KYC
    data, reusable by any role that ends up needing identity verification
    later (PATIENT is the obvious future candidate), not just CAREGIVER.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = IdentityProfile.objects.filter(user=request.user).first()
        if profile is None:
            return Response(
                {"detail": "پروفایل هویتی هنوز تکمیل نشده است."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(IdentityProfileSerializer(profile).data)

    def put(self, request):
        profile = IdentityProfile.objects.filter(user=request.user).first()
        serializer = IdentityProfileSerializer(
            instance=profile, data=request.data, partial=False
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        status_code = status.HTTP_200_OK if profile else status.HTTP_201_CREATED
        return Response(serializer.data, status=status_code)
