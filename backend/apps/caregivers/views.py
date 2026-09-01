from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import AuditService

from .models import (
    BlacklistAppeal,
    CaregiverProfile,
    CaregiverReference,
    CaregiverServiceArea,
    CaregiverStatus,
    IdentityProfile,
)
from .permissions import IsAdminOrSuperuser, IsCaregiver
from .serializers import (
    BlacklistAppealSerializer,
    CaregiverExperienceSerializer,
    CaregiverFullProfileSerializer,
    CaregiverReferenceListSerializer,
    CaregiverReferenceSerializer,
    CaregiverServiceAreaSerializer,
    CaregiverSkillsSerializer,
    CaregiverWorkPreferencesSerializer,
    CreateBlacklistAppealSerializer,
    IdentityProfileSerializer,
    ReviewBlacklistAppealSerializer,
)


def _get_or_create_profile(user_id: int) -> CaregiverProfile:
    profile, _ = CaregiverProfile.objects.get_or_create(user_id=user_id)
    return profile


def _get_identity_dict(user_id: int) -> dict | None:
    profile = IdentityProfile.objects.filter(user_id=user_id).first()
    if profile is None:
        return None
    return IdentityProfileSerializer(profile).data


class MyIdentityProfileView(APIView):
    """
    GET/PUT /api/caregivers/me/identity/ - Form 1.
    Lives here (not apps.accounts) since IdentityProfile itself now
    lives in this app - see models.py's module docstring for the
    reasoning and the tradeoff being made.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = IdentityProfile.objects.filter(user=request.user).first()
        if profile is None:
            return Response({"detail": "پروفایل هویتی هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(IdentityProfileSerializer(profile).data)

    def put(self, request):
        profile = IdentityProfile.objects.filter(user=request.user).first()
        serializer = IdentityProfileSerializer(instance=profile, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        status_code = status.HTTP_200_OK if profile else status.HTTP_201_CREATED
        return Response(serializer.data, status=status_code)


class MyWorkPreferencesView(APIView):
    """PUT /api/caregivers/me/work-preferences/ - Form 2."""
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
        was_already_accepted = bool(existing and existing.terms_accepted)
        serializer = CaregiverWorkPreferencesSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        saved = serializer.save(profile=profile)
        if saved.terms_accepted and not was_already_accepted:
            # Only fires on the actual transition to accepted, not on
            # every subsequent edit to this form afterward — otherwise
            # a caregiver tweaking an unrelated field months later
            # would generate a misleading duplicate "accepted terms"
            # entry in their own history.
            audit.terms_accepted(request.user.id)
        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


class MyServiceAreasView(APIView):
    """GET/POST /api/caregivers/me/service-areas/ - nested province/city/district list (part of Form 2)."""
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
    """DELETE /api/caregivers/me/service-areas/<id>/ - remove one covered area."""
    permission_classes = [IsCaregiver]

    def delete(self, request, area_id):
        profile = _get_or_create_profile(request.user.id)
        deleted, _ = CaregiverServiceArea.objects.filter(id=area_id, profile=profile).delete()
        if not deleted:
            return Response({"detail": "یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyExperienceView(APIView):
    """PUT /api/caregivers/me/experience/ - Form 3, part 1."""
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
    """PUT /api/caregivers/me/skills/ - Form 3, part 2."""
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
    GET /api/caregivers/me/references/ - list
    PUT /api/caregivers/me/references/ - replace the full set at once
    (references are optional - see CaregiverReferenceListSerializer)
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
    The nested aggregate view - all four forms assembled into one
    nested response.
    """
    permission_classes = [IsCaregiver]

    def get(self, request):
        profile = _get_or_create_profile(request.user.id)
        data = {
            "is_approved": profile.status == "approved",
            "status": profile.status,
            "rejection_reason": profile.rejection_reason,
            "blacklist_reason": profile.blacklist_reason,
            "identity": _get_identity_dict(request.user.id),
            "work_preferences": getattr(profile, "work_preferences", None),
            "service_areas": profile.service_areas.all(),
            "experience": getattr(profile, "experience", None),
            "skills": getattr(profile, "skills", None),
            "references": profile.references.all(),
        }
        return Response(CaregiverFullProfileSerializer(data).data)


def _missing_forms(profile: CaregiverProfile, user_id: int) -> list[str]:
    missing = []
    if not _get_identity_dict(user_id):
        missing.append("اطلاعات هویتی (فرم ۱)")
    if not hasattr(profile, "work_preferences"):
        missing.append("شرایط همکاری (فرم ۲)")
    elif not profile.work_preferences.terms_accepted:
        # A supervisor can fill out every other field in form 2 on the
        # caregiver's behalf, but never this one (see
        # SupervisorCaregiverWorkPreferencesSerializer) — so a
        # caregiver whose profile was entirely supervisor-entered
        # still can't be approved until they personally log into
        # their own account and accept the terms themselves.
        missing.append("پذیرش شرایط و تعهدات عضویت (باید توسط خود مراقب انجام شود)")
    if not hasattr(profile, "experience"):
        missing.append("سوابق کاری (فرم ۳)")
    if not hasattr(profile, "skills"):
        missing.append("مهارت‌ها (فرم ۳)")
    # References are explicitly not required, at any stage including
    # approval — deliberately not part of this checklist.
    return missing


audit = AuditService()


class ApproveCaregiverView(APIView):
    """
    POST /api/caregivers/<user_id>/approve/
    ADMIN/SUPERUSER only. Requires all four forms to be complete first.
    Uses CaregiverProfile.approve(), which also writes a
    CaregiverApprovalLog entry.
    """
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, user_id):
        try:
            profile = CaregiverProfile.objects.get(user_id=user_id)
        except CaregiverProfile.DoesNotExist:
            return Response({"detail": "پروفایل مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        missing = _missing_forms(profile, user_id)
        if missing:
            return Response(
                {"detail": "پروفایل ناقص است و قابل تأیید نیست.", "missing": missing},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.approve(request.user)
        audit.caregiver_approved(request.user.id, user_id)
        return Response({"detail": "پروفایل تأیید شد.", "status": profile.status})


class RejectCaregiverView(APIView):
    """
    POST /api/caregivers/<user_id>/reject/  {"reason": "..."}
    ADMIN/SUPERUSER only. The counterpart to approval - the model has
    always had rejection_reason and a reject() method; this is the
    endpoint that was missing to actually use it.
    """
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, user_id):
        try:
            profile = CaregiverProfile.objects.get(user_id=user_id)
        except CaregiverProfile.DoesNotExist:
            return Response({"detail": "پروفایل مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get("reason", "")
        profile.reject(request.user, reason=reason)
        audit.caregiver_rejected(request.user.id, user_id, reason=reason)
        return Response({"detail": "پروفایل رد شد.", "status": profile.status, "rejection_reason": profile.rejection_reason})


class BlacklistCaregiverView(APIView):
    """
    POST /api/caregivers/<user_id>/blacklist/  {"reason": "..."}
    ADMIN/SUPERUSER only. Only meaningful for an already-APPROVED
    caregiver — see CaregiverProfile.blacklist()'s own docstring for
    why. Blacklisting an unapproved caregiver isn't rejected outright
    here (still allowed) since a supervisor's own record-keeping
    might legitimately need to flag someone mid-review too, but the
    normal path is approved -> blacklisted.
    """
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, user_id):
        try:
            profile = CaregiverProfile.objects.get(user_id=user_id)
        except CaregiverProfile.DoesNotExist:
            return Response({"detail": "پروفایل مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get("reason", "")
        profile.blacklist(request.user, reason=reason)
        audit.caregiver_blacklisted(request.user.id, user_id, reason=reason)
        return Response({"detail": "مراقب مسدود شد.", "status": profile.status, "blacklist_reason": profile.blacklist_reason})


class UnblacklistCaregiverView(APIView):
    """POST /api/caregivers/<user_id>/unblacklist/ — ADMIN/SUPERUSER
    only. Reverses BlacklistCaregiverView, back to APPROVED."""
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, user_id):
        try:
            profile = CaregiverProfile.objects.get(user_id=user_id)
        except CaregiverProfile.DoesNotExist:
            return Response({"detail": "پروفایل مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        if profile.status != CaregiverStatus.SUSPENDED:
            return Response({"detail": "این مراقب در حال حاضر مسدود نیست."}, status=status.HTTP_400_BAD_REQUEST)

        profile.unblacklist(request.user)
        audit.caregiver_unblacklisted(request.user.id, user_id)
        return Response({"detail": "مسدودیت مراقب رفع شد.", "status": profile.status})


def _resolve_agency_for_user(user):
    """
    Returns the AgencyProfile this user represents (owner or
    supervisor), or None. Imported locally, not at module level —
    apps.agencies already imports from apps.caregivers in several
    places, so importing apps.agencies.models here at module level
    would risk a circular import at Django app-loading time; this is
    the same locally-scoped-import pattern already used safely
    elsewhere in this codebase for the same reason.
    """
    agency_profile = getattr(user, "agency_profile", None)
    if agency_profile:
        return agency_profile
    supervisor_profile = getattr(user, "agency_supervisor_profile", None)
    if supervisor_profile:
        return supervisor_profile.agency
    return None


def _agency_has_link_to_caregiver(agency, caregiver_profile):
    from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus
    return AgencyCaregiverLink.objects.filter(
        agency=agency, caregiver=caregiver_profile, status=AgencyLinkStatus.APPROVED,
    ).exists()


class MyBlacklistAppealView(APIView):
    """
    GET  /api/caregivers/me/blacklist-appeal/ — my own appeal history.
    POST /api/caregivers/me/blacklist-appeal/ — submit a new one.
    Only meaningful while actually suspended — see
    CaregiverProfile.submit_blacklist_appeal() for the real
    validation (only one pending at a time, only while suspended).
    """
    permission_classes = [IsCaregiver]

    def get(self, request):
        profile = _get_or_create_profile(request.user.id)
        appeals = profile.blacklist_appeals.all()
        return Response(BlacklistAppealSerializer(appeals, many=True).data)

    def post(self, request):
        profile = _get_or_create_profile(request.user.id)
        serializer = CreateBlacklistAppealSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            appeal = profile.submit_blacklist_appeal(serializer.validated_data["appeal_reason"])
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        audit.blacklist_appeal_submitted(request.user.id)
        return Response(BlacklistAppealSerializer(appeal).data, status=status.HTTP_201_CREATED)


class BlacklistAppealListView(APIView):
    """
    GET /api/caregivers/blacklist-appeals/?status=pending
    Any authenticated staff or agency-role account — platform staff
    see every appeal; an agency account sees only appeals from
    caregivers with an approved link to their own agency. This is the
    one place in this codebase where "which rows you see" genuinely
    depends on WHO you are rather than a fixed queryset per role,
    since both audiences share the exact same endpoint by design.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if IsAdminOrSuperuser().has_permission(request, self):
            appeals = BlacklistAppeal.objects.select_related("caregiver__user__caregiver_identity_profile", "reviewed_by__caregiver_identity_profile")
        else:
            agency = _resolve_agency_for_user(request.user)
            if agency is None:
                return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
            from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus
            roster_ids = AgencyCaregiverLink.objects.filter(
                agency=agency, status=AgencyLinkStatus.APPROVED,
            ).values_list("caregiver_id", flat=True)
            appeals = BlacklistAppeal.objects.filter(caregiver_id__in=roster_ids).select_related(
                "caregiver__user__caregiver_identity_profile", "reviewed_by__caregiver_identity_profile",
            )

        status_filter = request.query_params.get("status")
        if status_filter:
            appeals = appeals.filter(status=status_filter)
        return Response(BlacklistAppealSerializer(appeals, many=True).data)


def _get_appeal_with_review_permission(request, appeal_id):
    """
    Shared by approve/deny below. Returns (appeal, None) on success,
    or (None, error_response) — the caller returns error_response
    directly when present, keeping both action views identical except
    for which method they call on success.
    """
    appeal = BlacklistAppeal.objects.filter(id=appeal_id).select_related("caregiver").first()
    if appeal is None:
        return None, Response({"detail": "درخواست یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

    if IsAdminOrSuperuser().has_permission(request, None):
        return appeal, None

    agency = _resolve_agency_for_user(request.user)
    if agency is None or not _agency_has_link_to_caregiver(agency, appeal.caregiver):
        return None, Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
    return appeal, None


class ApproveBlacklistAppealView(APIView):
    """POST /api/caregivers/blacklist-appeals/<id>/approve/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, appeal_id):
        appeal, error = _get_appeal_with_review_permission(request, appeal_id)
        if error:
            return error
        serializer = ReviewBlacklistAppealSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appeal.approve(request.user, note=serializer.validated_data.get("note", ""))
        audit.caregiver_unblacklisted(request.user.id, appeal.caregiver.user_id)
        return Response(BlacklistAppealSerializer(appeal).data)


class DenyBlacklistAppealView(APIView):
    """POST /api/caregivers/blacklist-appeals/<id>/deny/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, appeal_id):
        appeal, error = _get_appeal_with_review_permission(request, appeal_id)
        if error:
            return error
        serializer = ReviewBlacklistAppealSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appeal.deny(request.user, note=serializer.validated_data.get("note", ""))
        audit.blacklist_appeal_denied(request.user.id, appeal.caregiver.user_id)
        return Response(BlacklistAppealSerializer(appeal).data)
