"""
Supervisor-facing endpoints for the temp bulk-data-entry dashboard.

Every endpoint here does the same thing its /me/ counterpart in
views.py does, with two differences: it's keyed by an explicit user_id
path parameter instead of request.user, and it's gated to
IsAdminOrSuperuser instead of IsCaregiver. Deliberately kept as a
separate file rather than adding user_id branches into the existing
Views — those stay exactly as they are (a caregiver's own /me/ flow is
a different, permanent feature; this is explicitly temporary bulk
tooling, per the request), so nothing about how a caregiver manages
their own profile changes because this exists alongside it.

Every mutation (create, each form's save, delete) writes a real
AuditLog entry via apps.audit.services.AuditService — "who did what to
which caregiver, when" needs to be genuinely queryable later, not just
inferable from CaregiverProfile.created_by (which only ever holds the
LATEST value; the log is the actual history across edits by more than
one supervisor over time).
"""
from django.contrib.auth.hashers import make_password
from django.db.models import Count
from django.utils.crypto import get_random_string
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, UserRole
from apps.audit.services import AuditService

from .models import (
    CaregiverExperience,
    CaregiverProfile,
    CaregiverReference,
    CaregiverServiceArea,
    CaregiverSkills,
    CaregiverWorkPreferences,
    IdentityProfile,
)
from .permissions import IsAdminOrSuperuserOrAgencySupervisor
from .serializers import (
    CaregiverBasicInfoSerializer,
    CaregiverCompatibilityQuestionnaireSerializer,
    CaregiverExperienceSerializer,
    CaregiverListItemSerializer,
    CaregiverReferenceListSerializer,
    CaregiverReferenceSerializer,
    CaregiverServiceAreaSerializer,
    CaregiverSkillsSerializer,
    CaregiverWorkPreferencesSerializer,
    CreateCaregiverSerializer,
    IdentityProfileSerializer,
    SupervisorCaregiverFullProfileSerializer,
)
from .views import _get_identity_dict, _missing_forms

audit = AuditService()


def _get_target_user(request, user_id: int) -> User | None:
    """Returns None both when the user doesn't exist AND when the
    caller isn't allowed to see them — the two cases are
    indistinguishable to the caller on purpose (see
    _caregiver_visible_to_actor's docstring)."""
    if not _caregiver_visible_to_actor(request, user_id):
        return None
    return User.objects.filter(id=user_id, role=UserRole.CAREGIVER).first()


def _get_target_profile(request, user_id: int) -> CaregiverProfile | None:
    user = _get_target_user(request, user_id)
    if user is None:
        return None
    profile, _ = CaregiverProfile.objects.get_or_create(user=user)
    return profile


def _caregiver_visible_to_actor(request, user_id: int) -> bool:
    """
    ADMIN/SUPERUSER see every caregiver on the platform (unchanged
    behavior). AGENCY_SUPERVISOR only sees caregivers actually linked
    to their own agency, and only once that link is APPROVED — a
    supervisor entering a brand-new caregiver auto-approves that link
    themselves (see SupervisorCaregiverListView.post below), so this
    only ever blocks a DIFFERENT agency's caregivers, not their own
    freshly-created ones.

    Returns False (not an exception) for anything unexpected — e.g. an
    AGENCY_SUPERVISOR whose own AgencySupervisor row is somehow
    missing — callers turn a False into a 404, matching this
    platform's established "don't reveal whether the record exists at
    all to someone who can't see it" convention (see apps.families's
    patients app: "stranger gets 404 not 403").
    """
    if request.user.role in (UserRole.ADMIN, UserRole.SUPERUSER):
        return True

    if request.user.role != UserRole.AGENCY_SUPERVISOR:
        return False

    from apps.agencies.tenancy import caregiver_visible_to_tenant, resolve_own_agency_for_supervisor

    agency = resolve_own_agency_for_supervisor(request.user)
    if agency is None:
        return False

    return caregiver_visible_to_tenant(agency, user_id)


class SupervisorCaregiverDetailView(APIView):
    """
    GET    /api/supervisor/caregivers/<user_id>/ — basic account info
           (first/last name, phone, email) for pre-filling the wizard's
           first step when resuming an in-progress or already-complete
           caregiver — e.g. correcting a typo in the name after the
           fact.
    PATCH  /api/supervisor/caregivers/<user_id>/ — update that same
           basic info.
    DELETE /api/supervisor/caregivers/<user_id>/ — removes the
           caregiver's account entirely. Deleting the User cascades
           through CaregiverProfile (OneToOne, CASCADE) to every sub-
           form (WorkPreferences, ServiceAreas, Experience, Skills,
           References, IdentityProfile) — deleting the account is
           genuinely deleting all of it, not a soft-delete. Used for a
           supervisor correcting a mis-entered caregiver during the
           bulk import, not meant as a routine "remove someone from
           the platform" action.
    """
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def get(self, request, user_id):
        user = _get_target_user(request, user_id)
        if user is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "user_id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": user.phone_number,
            "email": user.email,
        })

    def patch(self, request, user_id):
        user = _get_target_user(request, user_id)
        if user is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        serializer = CaregiverBasicInfoSerializer(data=request.data, context={"user_id": user_id})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user.first_name = data["first_name"]
        user.last_name = data["last_name"]
        user.phone_number = data["phone_number"]
        if "email" in data:
            user.email = data["email"]
        user.save(update_fields=["first_name", "last_name", "phone_number", "email"])
        audit.caregiver_updated(request.user.id, user_id, section="basic_info")
        return Response({
            "user_id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": user.phone_number,
            "email": user.email,
        })

    def delete(self, request, user_id):
        user = _get_target_user(request, user_id)
        if user is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        # Logged before the delete, not after — user_id would still be
        # a valid value to log afterward too, but there's no reason to
        # risk the log write racing the cascade delete.
        audit.caregiver_deleted(request.user.id, user_id)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SupervisorCaregiverFullProfileView(APIView):
    """
    GET /api/supervisor/caregivers/<user_id>/full/
    Everything about one caregiver in one nested response — the
    reviewer needs to actually see the data before approving or
    rejecting, not just a completion checklist. Mirrors
    MyFullProfileView (the caregiver's own /me/full/ equivalent),
    scoped by an explicit user_id and gated to IsAdminOrSuperuser
    instead of IsCaregiver, same pattern as every other view in this
    file.
    """
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def get(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        data = {
            "is_approved": profile.status == "approved",
            "status": profile.status,
            "rejection_reason": profile.rejection_reason,
            "blacklist_reason": profile.blacklist_reason,
            "identity": _get_identity_dict(user_id),
            "work_preferences": getattr(profile, "work_preferences", None),
            "service_areas": profile.service_areas.all(),
            "experience": getattr(profile, "experience", None),
            "skills": getattr(profile, "skills", None),
            "references": profile.references.all(),
        }
        return Response(SupervisorCaregiverFullProfileSerializer(data).data)


class SupervisorCaregiverListView(APIView):
    """
    GET  /api/supervisor/caregivers/ — every caregiver, with progress,
         for the dashboard's "40-50 to get through" list view.
    POST /api/supervisor/caregivers/ — Step 0: create the account.
         Returns the new user_id the frontend then uses for every
         subsequent step of the wizard.
    """
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def get(self, request):
        caregivers = User.objects.filter(role=UserRole.CAREGIVER).order_by("-date_joined")

        if request.user.role == UserRole.AGENCY_SUPERVISOR:
            from apps.agencies.tenancy import agency_caregiver_user_ids, resolve_own_agency_for_supervisor
            agency = resolve_own_agency_for_supervisor(request.user)
            if agency is None:
                caregivers = caregivers.none()
            else:
                caregivers = caregivers.filter(id__in=agency_caregiver_user_ids(agency))

        # This used to run up to 6 separate queries PER ROW (a fresh
        # CaregiverProfile lookup, an IdentityProfile .exists() check,
        # three hasattr() calls that each silently trigger their own
        # query on an unfetched reverse OneToOne, and a .count() on
        # references) — a severe N+1, worse than the one found and
        # fixed in the matching pipeline itself, on an endpoint used
        # by both supervisor-panel and admin-panel's main dashboard
        # list. At 1000 caregivers this was potentially 6000+ queries
        # for one page load. Every one of those is now covered by a
        # single JOIN (select_related) or a single aggregate query
        # across all rows at once (annotate), regardless of row count.
        caregivers = caregivers.select_related(
            "caregiver_identity_profile",
            "caregiver_profile",
            "caregiver_profile__work_preferences",
            "caregiver_profile__experience",
            "caregiver_profile__skills",
            "caregiver_profile__created_by",
        ).annotate(
            reference_count=Count("caregiver_profile__references", distinct=True),
        )

        rows = []
        for user in caregivers:
            profile = getattr(user, "caregiver_profile", None)
            done = 0
            if getattr(user, "caregiver_identity_profile", None) is not None:
                done += 1
            if profile:
                if getattr(profile, "work_preferences", None) is not None:
                    done += 1
                if getattr(profile, "experience", None) is not None and getattr(profile, "skills", None) is not None:
                    done += 1
                if user.reference_count >= 1:
                    done += 1
            created_by_user = profile.created_by if profile else None
            rows.append({
                "user_id": user.id,
                "full_name": user.get_full_name() or user.username,
                "phone_number": user.phone_number,
                "status": profile.status if profile else "draft",
                "forms_completed": done,
                "created_by": f"{created_by_user.username}({created_by_user.role})" if created_by_user else None,
            })
        return Response(CaregiverListItemSerializer(rows, many=True).data)

    def post(self, request):
        serializer = CreateCaregiverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        agency_to_link = None
        if request.user.role == UserRole.AGENCY_SUPERVISOR:
            from apps.agencies.tenancy import resolve_own_agency_for_supervisor
            agency_to_link = resolve_own_agency_for_supervisor(request.user)
            if agency_to_link is None:
                return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)

        if User.objects.filter(phone_number=data["phone_number"]).exists():
            return Response(
                {"detail": "این شماره تلفن قبلاً ثبت شده است."}, status=status.HTTP_400_BAD_REQUEST
            )

        user = User(
            first_name=data["first_name"],
            last_name=data["last_name"],
            phone_number=data["phone_number"],
            email=data.get("email", ""),
            role=UserRole.CAREGIVER,
        )
        # Random password the supervisor never sees or invents on the
        # caregiver's behalf — username is auto-generated the same way
        # (User.save()'s generate_username()), and the caregiver resets
        # their password later via the existing phone-based flow.
        user.set_password(get_random_string(32))
        user.save()

        profile, _ = CaregiverProfile.objects.get_or_create(user=user, defaults={"created_by": request.user})
        audit.caregiver_created(request.user.id, user.id)

        if agency_to_link is not None:
            # Unlike the caregiver-initiated join-request flow (which
            # always starts PENDING — see apps.agencies.views), an
            # agency supervisor is entering this caregiver directly
            # ON BEHALF of their own agency, so the link is
            # immediately APPROVED — there's no separate party who'd
            # need to review and approve their own supervisor's entry.
            from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus
            AgencyCaregiverLink.objects.create(
                agency=agency_to_link, caregiver=profile,
                status=AgencyLinkStatus.APPROVED, decided_by=request.user,
            )

        return Response({
            "user_id": user.id,
            "username": user.username,
            "full_name": user.get_full_name(),
        }, status=status.HTTP_201_CREATED)


class SupervisorIdentityView(APIView):
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def get(self, request, user_id):
        user = _get_target_user(request, user_id)
        if user is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        profile = IdentityProfile.objects.filter(user=user).first()
        if profile is None:
            return Response({"detail": "این بخش هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(IdentityProfileSerializer(profile).data)

    def put(self, request, user_id):
        user = _get_target_user(request, user_id)
        if user is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        existing = IdentityProfile.objects.filter(user=user).first()
        serializer = IdentityProfileSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user)
        audit.caregiver_updated(request.user.id, user_id, section="identity")
        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


class SupervisorWorkPreferencesView(APIView):
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def get(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        prefs = getattr(profile, "work_preferences", None)
        if prefs is None:
            return Response({"detail": "این بخش هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CaregiverWorkPreferencesSerializer(prefs).data)

    def put(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        existing = getattr(profile, "work_preferences", None)
        serializer = CaregiverWorkPreferencesSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        audit.caregiver_updated(request.user.id, user_id, section="work_preferences")
        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


class SupervisorCompatibilityQuestionnaireView(APIView):
    """
    GET/PUT /api/supervisor/caregivers/<id>/compatibility-questionnaire/
    Deliberately NOT counted in forms_completed/forms_total — same
    reasoning already applied to references (relaxed earlier this
    session): this genuinely improves matching quality but isn't a
    hard requirement to approve and work as a caregiver, so it stays
    optional rather than becoming a new gate on approval.
    """
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def get(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        questionnaire = getattr(profile, "compatibility_questionnaire", None)
        if questionnaire is None:
            return Response({"detail": "این بخش هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CaregiverCompatibilityQuestionnaireSerializer(questionnaire).data)

    def put(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        existing = getattr(profile, "compatibility_questionnaire", None)
        serializer = CaregiverCompatibilityQuestionnaireSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(caregiver=profile)
        audit.caregiver_updated(request.user.id, user_id, section="compatibility_questionnaire")
        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


class SupervisorServiceAreasView(APIView):
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def get(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CaregiverServiceAreaSerializer(profile.service_areas.all(), many=True).data)

    def post(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        serializer = CaregiverServiceAreaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        audit.caregiver_updated(request.user.id, user_id, section="service_areas")
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SupervisorServiceAreaDetailView(APIView):
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def delete(self, request, user_id, area_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        deleted, _ = CaregiverServiceArea.objects.filter(id=area_id, profile=profile).delete()
        if not deleted:
            return Response({"detail": "یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        audit.caregiver_updated(request.user.id, user_id, section="service_areas")
        return Response(status=status.HTTP_204_NO_CONTENT)


class SupervisorExperienceView(APIView):
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def get(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        exp = getattr(profile, "experience", None)
        if exp is None:
            return Response({"detail": "این بخش هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CaregiverExperienceSerializer(exp).data)

    def put(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        existing = getattr(profile, "experience", None)
        serializer = CaregiverExperienceSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        audit.caregiver_updated(request.user.id, user_id, section="experience")
        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


class SupervisorSkillsView(APIView):
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def get(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        skills = getattr(profile, "skills", None)
        if skills is None:
            return Response({"detail": "این بخش هنوز تکمیل نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CaregiverSkillsSerializer(skills).data)

    def put(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        existing = getattr(profile, "skills", None)
        serializer = CaregiverSkillsSerializer(instance=existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(profile=profile)
        audit.caregiver_updated(request.user.id, user_id, section="skills")
        return Response(serializer.data, status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED)


class SupervisorReferencesView(APIView):
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def get(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CaregiverReferenceSerializer(profile.references.all(), many=True).data)

    def put(self, request, user_id):
        profile = _get_target_profile(request, user_id)
        if profile is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        serializer = CaregiverReferenceListSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        profile.references.all().delete()
        created = [
            CaregiverReference.objects.create(profile=profile, **ref)
            for ref in serializer.validated_data["references"]
        ]
        audit.caregiver_updated(request.user.id, user_id, section="references")
        return Response(CaregiverReferenceSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


class SupervisorCaregiverProgressView(APIView):
    """GET /api/supervisor/caregivers/<user_id>/progress/ — which of
    the 4 forms are done, for the wizard's step indicator / resume
    logic when a supervisor comes back to an in-progress entry."""
    permission_classes = [IsAdminOrSuperuserOrAgencySupervisor]

    def get(self, request, user_id):
        user = _get_target_user(request, user_id)
        if user is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        profile, _ = CaregiverProfile.objects.get_or_create(user=user)
        return Response({
            "user_id": user.id,
            "full_name": user.get_full_name(),
            "identity_done": IdentityProfile.objects.filter(user=user).exists(),
            "work_preferences_done": hasattr(profile, "work_preferences"),
            "experience_done": hasattr(profile, "experience"),
            "skills_done": hasattr(profile, "skills"),
            "references_done": profile.references.count() >= 1,
            "missing": _missing_forms(profile, user.id),
        })
