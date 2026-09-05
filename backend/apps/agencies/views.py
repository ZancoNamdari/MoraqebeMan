from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, UserRole
from apps.audit.services import AuditService
from apps.authorization.permissions import IsAgency, IsSuperuser
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from apps.caregivers.permissions import IsCaregiver
from apps.families.models import FamilyPatientLink, FamilyProfile, LinkStatus, PatientProfile
from apps.families.permissions import IsFamily
from apps.families.serializers import PatientProfileSerializer
from apps.care.matching import suggest_caregivers_for_agency_patient

from .models import AgencyCaregiverLink, AgencyFamilyLink, AgencyLinkStatus, AgencyPatientLink, AgencyProfile, AgencySupervisor
from .tenancy import agency_caregiver_profile_ids, resolve_tenant_context
from .serializers import (
    AgencyCaregiverLinkSerializer,
    AgencyDashboardSerializer,
    AgencyFamilyLinkSerializer,
    AgencyProfileSerializer,
    AgencySupervisorSerializer,
    CreateAgencySerializer,
    CreateAgencySupervisorSerializer,
    CreateFamilyForPatientSerializer,
    JoinAgencyByCodeSerializer,
)

audit = AuditService()


def _get_or_create_agency(user) -> AgencyProfile:
    agency, _ = AgencyProfile.objects.get_or_create(
        user_id=user.id, defaults={"company_name": user.phone_number}
    )
    return agency


def _agency_for_request(request) -> AgencyProfile | None:
    return AgencyProfile.objects.filter(user_id=request.user.id).first()


def _resolve_my_agency(request) -> AgencyProfile | None:
    """
    Resolves "my own agency" for the /me/-style endpoints below,
    uniformly across the two roles that can now legitimately reach
    them — the agency owner (auto-creates their profile on first
    touch, unchanged from before) and, since the AgencySupervisor
    feature landed, an AGENCY_SUPERVISOR resolving through their own
    linked agency instead (never auto-created — a supervisor doesn't
    own or create the agency, only acts on its behalf).
    """
    if request.user.role == UserRole.AGENCY:
        return _get_or_create_agency(request.user)

    if request.user.role == UserRole.AGENCY_SUPERVISOR:
        from .tenancy import resolve_own_agency_for_supervisor
        return resolve_own_agency_for_supervisor(request.user)

    return None


class IsAgencyOwnerOrSupervisor(BasePermission):
    """
    Gate for the /me/-style endpoints below — both roles pass the
    permission check here; _resolve_my_agency() above is what
    actually determines whose agency they end up touching. Kept
    local to this file rather than apps.authorization.permissions
    since "supervisor" here specifically means AgencySupervisor, the
    agency-scoped role, not the unrelated platform-wide Supervisor
    Django group.
    """
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(
            user and getattr(user, "is_authenticated", False)
            and user.role in (UserRole.AGENCY, UserRole.AGENCY_SUPERVISOR)
        )


class MyAgencyProfileView(APIView):
    """GET/PUT /api/agencies/me/ — GET is available to the agency
    owner or any of its supervisors (both need to see the same
    dashboard-level info, including the join access_code). PUT
    (changing company_name/license_number) stays owner-only — a
    supervisor entering caregiver/patient data shouldn't also be able
    to rename the agency itself."""
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def get(self, request):
        agency = _resolve_my_agency(request)
        if agency is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        return Response(AgencyProfileSerializer(agency).data)

    def put(self, request):
        if request.user.role != UserRole.AGENCY:
            return Response(
                {"detail": "فقط خود آژانس می‌تواند اطلاعات پروفایل را تغییر دهد."}, status=status.HTTP_403_FORBIDDEN,
            )
        agency = _get_or_create_agency(request.user)
        serializer = AgencyProfileSerializer(instance=agency, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AgencyDashboardView(APIView):
    """GET /api/agencies/me/dashboard/ — Phase-1 basic counts. See
    AgencyDashboardSerializer's docstring for scope reasoning.
    Available to the agency owner or any of its supervisors."""
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def get(self, request):
        agency = _resolve_my_agency(request)
        if agency is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)

        from apps.caregivers.models import BlacklistAppeal, BlacklistAppealStatus, CaregiverProfile, CaregiverStatus
        from apps.reviews.models import Complaint, ComplaintStatus

        # Two different scopes, deliberately: complaints/appeals only
        # make sense for caregivers actually approved onto the
        # roster, but a caregiver stuck in "needs more docs" is BY
        # DEFINITION not yet approved — agency_caregiver_profile_ids()
        # is approved-only, so it would always undercount that one to
        # zero. Any-status is needed there specifically.
        approved_roster_ids = agency_caregiver_profile_ids(agency)
        any_link_ids = agency.caregiver_links.values_list("caregiver_id", flat=True)

        data = {
            "company_name": agency.company_name,
            "access_code": agency.access_code,
            "approved_family_count": agency.family_links.filter(status=AgencyLinkStatus.APPROVED).count(),
            "pending_family_requests": agency.family_links.filter(status=AgencyLinkStatus.PENDING).count(),
            "approved_caregiver_count": agency.caregiver_links.filter(status=AgencyLinkStatus.APPROVED).count(),
            "pending_caregiver_requests": agency.caregiver_links.filter(status=AgencyLinkStatus.PENDING).count(),
            # "Needs attention" counts — added so the dashboard can
            # actually surface urgent items at a glance instead of an
            # agency owner having to click into every section to find
            # out whether anything needs their attention right now.
            "open_complaints_count": Complaint.objects.filter(
                about_caregiver_id__in=approved_roster_ids, status__in=[ComplaintStatus.OPEN, ComplaintStatus.UNDER_REVIEW],
            ).count(),
            "pending_appeals_count": BlacklistAppeal.objects.filter(
                caregiver_id__in=approved_roster_ids, status=BlacklistAppealStatus.PENDING,
            ).count(),
            "candidates_needing_docs_count": CaregiverProfile.objects.filter(
                id__in=any_link_ids, status=CaregiverStatus.NEEDS_MORE_DOCS,
            ).count(),
        }
        return Response(AgencyDashboardSerializer(data).data)


# ---------------------------------------------------------------------
# Family side — a family requests to join an agency's roster.
# ---------------------------------------------------------------------

class JoinAgencyAsFamilyView(APIView):
    """POST /api/agencies/join/family/ — family-facing. Always creates
    a PENDING link; unlike the family/patient code flows elsewhere in
    this platform, there's no side here that already has standing to
    auto-approve, so the agency always has to act on it."""
    permission_classes = [IsFamily]

    def post(self, request):
        serializer = JoinAgencyByCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agency = AgencyProfile.objects.get(access_code=serializer.validated_data["agency_code"])
        family, _ = FamilyProfile.objects.get_or_create(
            user_id=request.user.id, defaults={"display_name": request.user.phone_number}
        )

        if AgencyFamilyLink.objects.filter(agency=agency, family=family).exists():
            return Response({"detail": "شما قبلاً به این آژانس درخواست داده‌اید یا عضو آن هستید."}, status=status.HTTP_400_BAD_REQUEST)

        link = AgencyFamilyLink.objects.create(agency=agency, family=family)
        return Response(AgencyFamilyLinkSerializer(link).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------
# Caregiver side — a caregiver requests to join an agency's roster.
# ---------------------------------------------------------------------

class JoinAgencyAsCaregiverView(APIView):
    """POST /api/agencies/join/caregiver/ — caregiver-facing. Same
    always-PENDING reasoning as JoinAgencyAsFamilyView. Joining an
    agency's roster is a separate affiliation on top of the
    caregiver's core CaregiverProfile — it doesn't require that
    profile to already be APPROVED, since an agency may want to see
    (and even advocate for) a caregiver still in its own vetting
    pipeline."""
    permission_classes = [IsCaregiver]

    def post(self, request):
        serializer = JoinAgencyByCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agency = AgencyProfile.objects.get(access_code=serializer.validated_data["agency_code"])
        caregiver = CaregiverProfile.objects.filter(user_id=request.user.id).first()
        if caregiver is None:
            return Response({"detail": "پروفایل مراقب شما هنوز ایجاد نشده است."}, status=status.HTTP_400_BAD_REQUEST)

        if AgencyCaregiverLink.objects.filter(agency=agency, caregiver=caregiver).exists():
            return Response({"detail": "شما قبلاً به این آژانس درخواست داده‌اید یا عضو آن هستید."}, status=status.HTTP_400_BAD_REQUEST)

        link = AgencyCaregiverLink.objects.create(agency=agency, caregiver=caregiver)
        return Response(AgencyCaregiverLinkSerializer(link).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------
# Agency side — view roster, view pending requests, approve/reject.
# ---------------------------------------------------------------------

class AgencyFamilyRosterView(APIView):
    """GET /api/agencies/me/families/ — approved family roster.
    Available to the agency owner or any of its supervisors."""
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def get(self, request):
        agency = _resolve_my_agency(request)
        if agency is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        links = agency.family_links.filter(status=AgencyLinkStatus.APPROVED).select_related("family", "family__user")
        return Response(AgencyFamilyLinkSerializer(links, many=True).data)


class AgencyFamilyRequestsView(APIView):
    """GET /api/agencies/me/families/requests/ — pending requests.
    Available to the agency owner or any of its supervisors."""
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def get(self, request):
        agency = _resolve_my_agency(request)
        if agency is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        links = agency.family_links.filter(status=AgencyLinkStatus.PENDING).select_related("family", "family__user")
        return Response(AgencyFamilyLinkSerializer(links, many=True).data)


class AgencyFamilyRequestDecisionView(APIView):
    """POST /api/agencies/me/families/requests/<link_id>/<decision>/
    where decision is 'approve' or 'reject'. Available to the agency
    owner or any of its supervisors — a supervisor deciding on join
    requests is exactly the kind of day-to-day work the role exists
    for."""
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def post(self, request, link_id, decision):
        agency = _resolve_my_agency(request)
        if agency is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        link = AgencyFamilyLink.objects.filter(id=link_id, agency=agency, status=AgencyLinkStatus.PENDING).first()
        if link is None:
            return Response({"detail": "درخواست یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        if decision == "approve":
            link.status = AgencyLinkStatus.APPROVED
            link.decided_by = request.user
            link.decided_at = timezone.now()
            link.save(update_fields=["status", "decided_by", "decided_at"])
            audit.agency_family_link_decided(request.user.id, link.family.user_id, "approved")
        else:
            link.status = AgencyLinkStatus.REJECTED
            link.decided_by = request.user
            link.decided_at = timezone.now()
            link.save(update_fields=["status", "decided_by", "decided_at"])
            audit.agency_family_link_decided(request.user.id, link.family.user_id, "rejected")

        return Response(AgencyFamilyLinkSerializer(link).data)


class AgencyCaregiverRosterView(APIView):
    """GET /api/agencies/me/caregivers/ — approved caregiver pool.
    Available to the agency owner or any of its supervisors."""
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def get(self, request):
        agency = _resolve_my_agency(request)
        if agency is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        links = agency.caregiver_links.filter(status=AgencyLinkStatus.APPROVED).select_related("caregiver", "caregiver__user")
        return Response(AgencyCaregiverLinkSerializer(links, many=True).data)


class AgencyCandidateTrackingView(APIView):
    """
    GET /api/agencies/me/candidates/ — every caregiver linked to this
    agency at ANY link status (pending or approved), with the full
    interview/notes tracking data. Deliberately broader than
    AgencyCaregiverRosterView above (approved-only) — this mirrors a
    real spreadsheet an agency was already keeping manually to track
    candidates through their own vetting process, which starts well
    before a candidate is actually approved onto the roster.
    """
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def get(self, request):
        from apps.caregivers.serializers import CandidateTrackingSerializer
        agency = _resolve_my_agency(request)
        if agency is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        links = agency.caregiver_links.filter(
            status__in=[AgencyLinkStatus.PENDING, AgencyLinkStatus.APPROVED],
        ).select_related(
            "caregiver__user__caregiver_identity_profile__city",
            "caregiver__experience",
            "caregiver__interviewed_by__caregiver_identity_profile",
        )
        candidates = [link.caregiver for link in links]
        return Response(CandidateTrackingSerializer(candidates, many=True).data)


class AgencyCaregiverRequestsView(APIView):
    """GET /api/agencies/me/caregivers/requests/ — pending requests.
    Available to the agency owner or any of its supervisors."""
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def get(self, request):
        agency = _resolve_my_agency(request)
        if agency is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        links = agency.caregiver_links.filter(status=AgencyLinkStatus.PENDING).select_related("caregiver", "caregiver__user")
        return Response(AgencyCaregiverLinkSerializer(links, many=True).data)


class AgencyCaregiverRequestDecisionView(APIView):
    """POST /api/agencies/me/caregivers/requests/<link_id>/<decision>/
    Available to the agency owner or any of its supervisors."""
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def post(self, request, link_id, decision):
        agency = _resolve_my_agency(request)
        if agency is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        link = AgencyCaregiverLink.objects.filter(id=link_id, agency=agency, status=AgencyLinkStatus.PENDING).first()
        if link is None:
            return Response({"detail": "درخواست یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        if decision == "approve":
            link.status = AgencyLinkStatus.APPROVED
            link.decided_by = request.user
            link.decided_at = timezone.now()
            link.save(update_fields=["status", "decided_by", "decided_at"])
            audit.agency_caregiver_link_decided(request.user.id, link.caregiver.user_id, "approved")
        else:
            link.status = AgencyLinkStatus.REJECTED
            link.decided_by = request.user
            link.decided_at = timezone.now()
            link.save(update_fields=["status", "decided_by", "decided_at"])
            audit.agency_caregiver_link_decided(request.user.id, link.caregiver.user_id, "rejected")

        return Response(AgencyCaregiverLinkSerializer(link).data)


# ---------------------------------------------------------------------
# Agency supervisors — agency staff, always scoped to exactly one
# agency. Creatable by the agency itself or by a superuser (confirmed
# requirement — not guessed); NOT creatable by another supervisor.
# ---------------------------------------------------------------------

class AgencySupervisorListCreateView(APIView):
    """
    GET/POST /api/agencies/<agency_id>/supervisors/

    Deliberately not under /agencies/me/ like the other agency-facing
    endpoints in this file — a superuser needs to create a supervisor
    for an agency that isn't "their own", so the target agency has to
    be addressable by id, not implied from request.user.

    allow_supervisor=False on both resolve_tenant_context() calls
    below is deliberate and load-bearing: creating a NEW supervisor is
    agency-owner/superuser-only per the confirmed requirement — a
    supervisor creating a peer supervisor was never part of that.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id, allow_supervisor=False)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)

        supervisors = ctx.agency.supervisors.select_related("user", "created_by")
        return Response(AgencySupervisorSerializer(supervisors, many=True).data)

    def post(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id, allow_supervisor=False)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        agency = ctx.agency

        serializer = CreateAgencySupervisorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if User.objects.filter(phone_number=data["phone_number"]).exists():
            return Response({"detail": "این شماره تلفن قبلاً ثبت شده است."}, status=status.HTTP_400_BAD_REQUEST)

        # Same reasoning as CreateCaregiverSerializer's own docstring:
        # whoever creates this account is entering someone ELSE's
        # information, so a random password is generated server-side
        # rather than the creator inventing one on the supervisor's
        # behalf — the supervisor resets it later via the existing
        # phone-based password-reset flow.
        user = User(
            first_name=data["first_name"], last_name=data["last_name"],
            phone_number=data["phone_number"], email=data.get("email", ""),
            role=UserRole.AGENCY_SUPERVISOR,
        )
        user.set_password(get_random_string(32))
        user.save()

        supervisor = AgencySupervisor.objects.create(user=user, agency=agency, created_by=request.user)
        audit.agency_supervisor_created(request.user.id, user.id, agency.id)

        return Response(AgencySupervisorSerializer(supervisor).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------
# Agency-scoped patient creation — the actual "receptionist" job per
# the confirmed requirement: an agency (or its supervisor) enters a
# new patient/elder, in one of two modes, both confirmed as needed.
# ---------------------------------------------------------------------

class AgencyPatientListCreateView(APIView):
    """
    GET/POST /api/agencies/<agency_id>/patients/

    Allowed actors: the agency itself, one of its own
    AgencySupervisors, or a superuser — deliberately BROADER than
    AgencySupervisorListCreateView above (which excludes supervisors
    creating peer supervisors); day-to-day patient entry is exactly
    what a supervisor's job is, per the confirmed requirement.

    POST body:
      {"mode": "standalone", "patient": {...PatientProfileSerializer fields...}}
      {"mode": "with_family", "patient": {...}, "family": {first_name, last_name, phone_number, relation}}

    "standalone" creates only a PatientProfile (no User behind it) —
    the agency hands the patient's own access_code (ELD-...) to a
    family to link later, same as any other family-less patient on
    this platform. "with_family" ALSO creates a new User(role=FAMILY)
    + FamilyProfile on the family's behalf, same "enters someone
    else's information, no password field" pattern used for
    caregiver/supervisor creation elsewhere in this codebase — for
    families who can't self-register.

    Either way, an APPROVED AgencyPatientLink is created immediately;
    see that model's own docstring for why this always happens
    regardless of mode.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        agency = ctx.agency

        patients = PatientProfile.objects.filter(
            agency_links__agency=agency, agency_links__status=AgencyLinkStatus.APPROVED,
        ).distinct()
        return Response(PatientProfileSerializer(patients, many=True).data)

    def post(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        agency = ctx.agency

        mode = request.data.get("mode")
        if mode not in ("standalone", "with_family"):
            return Response(
                {"detail": "فیلد mode باید standalone یا with_family باشد."}, status=status.HTTP_400_BAD_REQUEST,
            )

        patient_serializer = PatientProfileSerializer(data=request.data.get("patient", {}))
        patient_serializer.is_valid(raise_exception=True)

        family = None
        relation = None
        if mode == "with_family":
            family_serializer = CreateFamilyForPatientSerializer(data=request.data.get("family", {}))
            family_serializer.is_valid(raise_exception=True)
            family_data = dict(family_serializer.validated_data)
            relation = family_data.pop("relation")

            if User.objects.filter(phone_number=family_data["phone_number"]).exists():
                return Response({"detail": "این شماره تلفن قبلاً ثبت شده است."}, status=status.HTTP_400_BAD_REQUEST)

            family_user = User(
                first_name=family_data["first_name"], last_name=family_data["last_name"],
                phone_number=family_data["phone_number"], role=UserRole.FAMILY,
            )
            # Same reasoning as every other "someone else's account"
            # creation in this codebase — random password, never
            # invented by the creator on the family's behalf.
            family_user.set_password(get_random_string(32))
            family_user.save()

            family = FamilyProfile.objects.create(
                user=family_user, display_name=f"{family_data['first_name']} {family_data['last_name']}",
            )

            # Immediately APPROVED, not a pending join request — the
            # agency is entering this on the family's own behalf.
            AgencyFamilyLink.objects.create(
                agency=agency, family=family, status=AgencyLinkStatus.APPROVED, decided_by=request.user,
            )

        patient = patient_serializer.save()

        AgencyPatientLink.objects.create(
            agency=agency, patient=patient, status=AgencyLinkStatus.APPROVED, decided_by=request.user,
        )

        if family is not None:
            FamilyPatientLink.objects.create(
                family=family, patient=patient, relation=relation,
                status=LinkStatus.APPROVED, approved_by=request.user,
            )

        audit.patient_created(request.user.id, patient.id)

        response_data = PatientProfileSerializer(patient).data
        if family is not None:
            response_data["family"] = {
                "user_id": family.user.id,
                "phone_number": family.user.phone_number,
                "access_code": family.access_code,
            }
        return Response(response_data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------
# Agency-scoped matching — per the confirmed requirement, an agency
# requesting matching only ever sees its own roster as candidates.
# ---------------------------------------------------------------------

class AgencySuggestedCaregiversView(APIView):
    """
    GET /api/agencies/<agency_id>/patients/<patient_id>/suggest-caregivers/

    Same response shape as the platform-wide
    /api/care/suggest-caregivers/ endpoint (apps.care.views), so any
    frontend code rendering one can render the other unchanged — the
    only real difference is WHICH caregivers are even considered
    (this agency's own approved roster, via
    apps.care.matching.suggest_caregivers_for_agency_patient), not the
    shape of what comes back.

    Two separate checks, deliberately not conflated: is this actor
    allowed to act for this agency at all (resolve_tenant_context,
    same as every other agency-scoped endpoint), AND is this specific
    patient actually one of this agency's own (AgencyPatientLink) —
    an agency shouldn't be able to request matching for a patient it
    doesn't serve just by guessing a valid patient id.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id, patient_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        agency = ctx.agency

        patient_link = AgencyPatientLink.objects.filter(
            agency=agency, patient_id=patient_id, status=AgencyLinkStatus.APPROVED,
        ).select_related("patient").defer("patient__created_at", "patient__updated_at").first()
        if patient_link is None:
            return Response({"detail": "این سالمند متعلق به این آژانس نیست."}, status=status.HTTP_404_NOT_FOUND)

        patient = patient_link.patient
        suggestions = suggest_caregivers_for_agency_patient(agency, patient)

        return Response({
            "patient_name": patient.full_name,
            "patient_gender": patient.gender,
            "suggestions": suggestions,
        })


# ---------------------------------------------------------------------
# Platform-wide analytics — SUPERUSER only. Per the confirmed
# decision: NOT a real AgencyProfile that "sees everything" (that
# would mean every per-agency scoping check throughout this codebase
# needs a special case for it, exactly the kind of one-off exception
# that risks becoming a real isolation bug later) — a genuine
# cross-tenant analytics view, structurally separate from the tenant
# model entirely, is the safer shape for this.
#
# This is intentionally the seed of what the platform architecture
# doc called out as a future apps.analytics — Phase 1 is one read-
# only endpoint with real counts, not a new Django app, since a
# single aggregate view doesn't justify one yet.
# ---------------------------------------------------------------------

class PlatformAnalyticsView(APIView):
    """
    GET /api/agencies/analytics/

    Deliberately lives under apps.agencies (not a new app) — every
    number here is fundamentally "how much of each thing exists
    across all agencies", and apps.agencies already owns every model
    that answers that. Read-only; nothing here can be used to modify
    any agency's data, only observe aggregate counts across all of
    them at once — which is exactly the SUPERUSER-only capability
    that was asked for, without needing a fake tenant to grant it.
    """
    permission_classes = [IsSuperuser]

    def get(self, request):
        agencies = AgencyProfile.objects.all().order_by("company_name")

        agency_rows = []
        for agency in agencies:
            agency_rows.append({
                "id": agency.id,
                "company_name": agency.company_name,
                "access_code": agency.access_code,
                "supervisor_count": agency.supervisors.count(),
                "approved_caregiver_count": agency.caregiver_links.filter(status=AgencyLinkStatus.APPROVED).count(),
                "pending_caregiver_requests": agency.caregiver_links.filter(status=AgencyLinkStatus.PENDING).count(),
                "approved_family_count": agency.family_links.filter(status=AgencyLinkStatus.APPROVED).count(),
                "patient_count": agency.patient_links.filter(status=AgencyLinkStatus.APPROVED).count(),
                # .isoformat() explicitly — this is a raw dict, not
                # passed through a serializer, so DRF's JSON renderer
                # can't encode a django_jalali datetime object on its
                # own (a real, reproduced bug: a POST response going
                # through AgencyProfileSerializer worked fine, since
                # DRF's serializer fields already handle datetime
                # encoding; this hand-built dict bypassed that).
                "created_at": agency.created_at.isoformat() if agency.created_at else None,
            })

        totals = {
            "agency_count": agencies.count(),
            "supervisor_count": AgencySupervisor.objects.count(),
            "caregiver_count": CaregiverProfile.objects.count(),
            "approved_caregiver_count": CaregiverProfile.objects.filter(status=CaregiverStatus.APPROVED).count(),
            "patient_count": PatientProfile.objects.count(),
            "family_count": FamilyProfile.objects.count(),
        }

        return Response({"totals": totals, "agencies": agency_rows})


# ---------------------------------------------------------------------
# One-step agency onboarding — SUPERUSER only. Deliberately its own
# view at the bare "agencies/" root, distinct from PlatformAnalyticsView
# above (that one is a read-only aggregate; this one is the actual
# management action of bringing a new B2B customer onto the platform).
# ---------------------------------------------------------------------

class PlatformAgencyListCreateView(APIView):
    """
    GET/POST /api/agencies/

    GET: a simple management-facing list of every agency (not the
    aggregate counts PlatformAnalyticsView returns — this is closer
    to "which agencies exist and who owns each one").

    POST: creates a brand-new agency in one step (see
    CreateAgencySerializer's docstring for why this didn't exist
    before and what it replaces).
    """
    permission_classes = [IsSuperuser]

    def get(self, request):
        agencies = AgencyProfile.objects.select_related("user").order_by("-created_at")
        return Response([
            {
                "id": a.id,
                "company_name": a.company_name,
                "license_number": a.license_number,
                "access_code": a.access_code,
                "owner_phone_number": a.user.phone_number,
                "owner_username": a.user.username,
                # .isoformat() explicitly — same reason as
                # PlatformAnalyticsView above: a raw hand-built dict,
                # not run through a serializer, so DRF's JSON renderer
                # can't encode a django_jalali datetime on its own.
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in agencies
        ])

    def post(self, request):
        serializer = CreateAgencySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if User.objects.filter(phone_number=data["phone_number"]).exists():
            return Response({"detail": "این شماره تلفن قبلاً ثبت شده است."}, status=status.HTTP_400_BAD_REQUEST)

        # Same reasoning as every other "someone else's account"
        # creation in this codebase — random password, never invented
        # by the creator on the agency's behalf.
        owner_user = User(
            first_name=data["first_name"], last_name=data["last_name"],
            phone_number=data["phone_number"], email=data.get("email", ""),
            role=UserRole.AGENCY,
        )
        owner_user.set_password(get_random_string(32))
        owner_user.save()

        agency = AgencyProfile.objects.create(
            user=owner_user,
            company_name=data["company_name"],
            license_number=data.get("license_number", ""),
        )
        audit.agency_created(request.user.id, owner_user.id)

        return Response(AgencyProfileSerializer(agency).data, status=status.HTTP_201_CREATED)


class AgencyComplaintsAboutOwnRosterView(APIView):
    """
    GET /api/agencies/<agency_id>/complaints/ — read-only visibility
    into complaints filed about THIS agency's own approved caregiver
    roster. Deliberately still no resolve/dismiss action here — that
    stays platform-wide staff-only (see apps.reviews.views.
    ComplaintListView's own docstring for why: an agency resolving
    complaints about its own caregivers would be reviewing itself).
    This is purely "does my roster have a problem I should know
    about," not authority to act on it — closing a real gap found
    after Complaint/CaregiverNoteAboutPatient shipped: an agency had
    no way to see complaints about its own people at all.
    """
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def get(self, request, agency_id):
        from apps.reviews.models import Complaint
        from apps.reviews.serializers import ComplaintListItemSerializer

        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)

        roster_ids = agency_caregiver_profile_ids(ctx.agency)
        complaints = Complaint.objects.filter(about_caregiver_id__in=roster_ids).select_related(
            "patient", "about_caregiver__user__caregiver_identity_profile", "filed_by",
        )
        return Response(ComplaintListItemSerializer(complaints, many=True).data)
