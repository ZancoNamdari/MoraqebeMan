from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User, UserRole
from apps.audit.services import AuditService
from apps.authorization.permissions import IsAgency, IsSuperuser
from apps.caregivers.models import CaregiverAgencyPipelineStatus, CaregiverProcessMilestone, CaregiverProfile, CaregiverStatus
from apps.caregivers.permissions import IsCaregiver
from apps.caregivers.serializers import CreateCaregiverSerializer
from apps.families.models import FamilyPatientLink, FamilyProfile, LinkStatus, PatientPipelineStatus, PatientProfile
from apps.families.permissions import IsFamily
from apps.families.serializers import PatientProfileSerializer
from apps.care.matching import suggest_caregivers_for_agency_patient
from apps.reminders.services import agency_reminder_rules, record_stage_transition

from .models import AgencyAdmin, AgencyCaregiverLink, AgencyFamilyLink, AgencyLinkStatus, AgencyPatientLink, AgencyProfile, AgencySupervisor
from .tenancy import agency_caregiver_profile_ids, resolve_tenant_context, visible_creator_user_ids
from .serializers import (
    AgencyAdminSerializer,
    AgencyCaregiverLinkSerializer,
    AgencyCaregiverPipelineSerializer,
    AgencyDashboardSerializer,
    AgencyFamilyLinkSerializer,
    AgencyProfileSerializer,
    AgencySupervisorSerializer,
    CreateAgencyAdminSerializer,
    CreateAgencySerializer,
    CreateAgencySupervisorSerializer,
    UpdateAgencyAdminSerializer,
    UpdateAgencySupervisorSerializer,
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


class AgencyDashboardInsightsView(APIView):
    """
    GET /api/agencies/me/dashboard/insights/

    Phase-2 dashboard data: chart-ready breakdowns and a short trend,
    on top of the same tables AgencyDashboardView already counts from
    — nothing new is tracked here, this just slices the existing data
    a different way so the dashboard can show it visually instead of
    as bare numbers.

    Deliberately a raw dict response (same pattern as
    PlatformAnalyticsView below) rather than a Serializer — this is a
    read-only aggregate view with a shape that varies by section
    (breakdown lists, a trend list), not a single flat resource.

    Available to the agency owner or any of its supervisors, same as
    AgencyDashboardView.
    """
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def get(self, request):
        agency = _resolve_my_agency(request)
        if agency is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Count
        from apps.caregivers.models import CaregiverProfile, CaregiverStatus
        from apps.families.models import PatientPipelineStatus, PatientProfile
        from apps.reviews.models import Complaint, ComplaintCategory

        # ------------------------------------------------------------
        # 1) Caregiver status breakdown — this is also, deliberately,
        # the "کل / تایید شده / در حال بررسی / نیاز به تکمیل مدارک /
        # رد شده" counters that were asked for: every caregiver ever
        # linked to this agency (any link status, same any_link_ids
        # reasoning as AgencyDashboardView above), grouped by their
        # platform-wide CaregiverStatus.
        # ------------------------------------------------------------
        any_link_ids = list(agency.caregiver_links.values_list("caregiver_id", flat=True))
        status_counts = dict(
            CaregiverProfile.objects.filter(id__in=any_link_ids)
            .values("status").annotate(n=Count("id")).values_list("status", "n")
        )
        caregiver_status_breakdown = [
            {"status": value, "label": label, "count": status_counts.get(value, 0)}
            for value, label in CaregiverStatus.choices
        ]
        caregiver_total_count = len(any_link_ids)

        # ------------------------------------------------------------
        # 2) Patient pipeline breakdown — this agency's own approved
        # patients, by their operational Kanban stage.
        # ------------------------------------------------------------
        approved_patient_ids = agency.patient_links.filter(
            status=AgencyLinkStatus.APPROVED,
        ).values_list("patient_id", flat=True)
        pipeline_counts = dict(
            PatientProfile.objects.filter(id__in=approved_patient_ids)
            .values("pipeline_status").annotate(n=Count("id")).values_list("pipeline_status", "n")
        )
        patient_pipeline_breakdown = [
            {"status": value, "label": label, "count": pipeline_counts.get(value, 0)}
            for value, label in PatientPipelineStatus.choices
        ]

        # ------------------------------------------------------------
        # 3) Complaints about this agency's own roster, by category —
        # same roster scope as AgencyComplaintsAboutOwnRosterView.
        # ------------------------------------------------------------
        roster_ids = agency_caregiver_profile_ids(agency)
        complaint_counts = dict(
            Complaint.objects.filter(about_caregiver_id__in=roster_ids)
            .values("category").annotate(n=Count("id")).values_list("category", "n")
        )
        complaints_by_category = [
            {"category": value, "label": label, "count": complaint_counts.get(value, 0)}
            for value, label in ComplaintCategory.choices
        ]

        # ------------------------------------------------------------
        # 4) Growth trend, last 8 calendar weeks — how many NEW family
        # and caregiver join requests this agency received per week.
        # Weeks are plain calendar weeks (Saturday-aligned, to match
        # how the rest of this app already thinks in Persian weeks),
        # each one only labeled with its Jalali start date for display
        # — the underlying filtering stays on the real Gregorian
        # column django_jalali stores, so this is exact, not an
        # approximation.
        # ------------------------------------------------------------
        import jdatetime
        from datetime import timedelta
        from django.utils import timezone

        now = timezone.now()
        days_since_saturday = (now.weekday() - 5) % 7  # Monday=0 .. Sunday=6; Saturday=5
        this_week_start = (now - timedelta(days=days_since_saturday)).replace(
            hour=0, minute=0, second=0, microsecond=0,
        )

        # Persian digits, built by hand rather than relying on
        # strftime locale — jdatetime's %d/%B render Latin digits and
        # transliterated (not Farsi-script) month names by default.
        _fa_digits = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")

        def _jalali_week_label(g_date):
            j = jdatetime.date.fromgregorian(date=g_date)
            return f"{j.day} {j.j_months_fa[j.month - 1]}".translate(_fa_digits)

        weekly_growth_trend = []
        for i in range(7, -1, -1):
            start = this_week_start - timedelta(weeks=i)
            end = start + timedelta(weeks=1)
            weekly_growth_trend.append({
                "week_label": _jalali_week_label(start.date()),
                "new_families": agency.family_links.filter(requested_at__gte=start, requested_at__lt=end).count(),
                "new_caregivers": agency.caregiver_links.filter(requested_at__gte=start, requested_at__lt=end).count(),
            })

        return Response({
            "caregiver_total_count": caregiver_total_count,
            "caregiver_status_breakdown": caregiver_status_breakdown,
            "patient_pipeline_breakdown": patient_pipeline_breakdown,
            "complaints_by_category": complaints_by_category,
            "weekly_growth_trend": weekly_growth_trend,
        })


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

        supervisor = AgencySupervisor.objects.create(
            user=user, agency=agency, created_by=request.user, position=data.get("position", ""),
        )
        audit.agency_supervisor_created(request.user.id, user.id, agency.id)

        return Response(AgencySupervisorSerializer(supervisor).data, status=status.HTTP_201_CREATED)


class AgencyAdminListCreateView(APIView):
    """
    GET/POST /api/agencies/<agency_id>/admins/

    Owner/superuser only (allow_supervisor=False, same reasoning as
    AgencySupervisorListCreateView above) - creating a new admin, and
    deciding which supervisor they report to, is the owner/manager's
    call per the confirmed requirement, not something a supervisor
    can do for themselves.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id, allow_supervisor=False)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)

        admins = ctx.agency.admins.select_related("user", "supervisor__user", "created_by")
        return Response(AgencyAdminSerializer(admins, many=True).data)

    def post(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id, allow_supervisor=False)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        agency = ctx.agency

        serializer = CreateAgencyAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        supervisor = AgencySupervisor.objects.filter(id=data["supervisor_id"], agency=agency).first()
        if supervisor is None:
            return Response(
                {"detail": "سوپروایزر انتخاب‌شده یافت نشد یا متعلق به این آژانس نیست."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(phone_number=data["phone_number"]).exists():
            return Response({"detail": "این شماره تلفن قبلاً ثبت شده است."}, status=status.HTTP_400_BAD_REQUEST)

        user = User(
            first_name=data["first_name"], last_name=data["last_name"],
            phone_number=data["phone_number"], email=data.get("email", ""),
            role=UserRole.AGENCY_ADMIN,
        )
        user.set_password(get_random_string(32))
        user.save()

        admin = AgencyAdmin.objects.create(
            user=user, agency=agency, supervisor=supervisor, created_by=request.user,
            position=data.get("position", ""),
        )

        return Response(AgencyAdminSerializer(admin).data, status=status.HTTP_201_CREATED)


class AgencySupervisorDetailView(APIView):
    """
    PATCH /api/agencies/<agency_id>/supervisors/<supervisor_id>/

    Owner/superuser only, same reasoning as AgencySupervisorListCreateView
    above — editing a supervisor's info is a management action, not
    something exposed to the supervisor themselves through this route.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, agency_id, supervisor_id):
        ctx = resolve_tenant_context(request, agency_id, allow_supervisor=False)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)

        supervisor = AgencySupervisor.objects.filter(
            id=supervisor_id, agency=ctx.agency,
        ).select_related("user").first()
        if supervisor is None:
            return Response({"detail": "سوپروایزر یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateAgencySupervisorSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "phone_number" in data and User.objects.filter(
            phone_number=data["phone_number"],
        ).exclude(id=supervisor.user_id).exists():
            return Response({"detail": "این شماره تلفن قبلاً ثبت شده است."}, status=status.HTTP_400_BAD_REQUEST)

        user_changed = False
        if "first_name" in data:
            supervisor.user.first_name = data["first_name"]
            user_changed = True
        if "last_name" in data:
            supervisor.user.last_name = data["last_name"]
            user_changed = True
        if "phone_number" in data:
            supervisor.user.phone_number = data["phone_number"]
            user_changed = True
        if user_changed:
            supervisor.user.save()

        if "position" in data:
            supervisor.position = data["position"]
            supervisor.save()

        return Response(AgencySupervisorSerializer(supervisor).data)


class AgencyAdminDetailView(APIView):
    """
    PATCH /api/agencies/<agency_id>/admins/<admin_id>/

    Owner/superuser only, same reasoning as above. Reassigning which
    supervisor this admin reports to also goes through here, validated
    against this same agency's own supervisor roster.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, agency_id, admin_id):
        ctx = resolve_tenant_context(request, agency_id, allow_supervisor=False)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)

        admin = AgencyAdmin.objects.filter(
            id=admin_id, agency=ctx.agency,
        ).select_related("user", "supervisor").first()
        if admin is None:
            return Response({"detail": "ادمین یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateAgencyAdminSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "phone_number" in data and User.objects.filter(
            phone_number=data["phone_number"],
        ).exclude(id=admin.user_id).exists():
            return Response({"detail": "این شماره تلفن قبلاً ثبت شده است."}, status=status.HTTP_400_BAD_REQUEST)

        if "supervisor_id" in data:
            new_supervisor = AgencySupervisor.objects.filter(
                id=data["supervisor_id"], agency=ctx.agency,
            ).first()
            if new_supervisor is None:
                return Response(
                    {"detail": "سوپروایزر انتخاب‌شده یافت نشد یا متعلق به این آژانس نیست."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            admin.supervisor = new_supervisor

        user_changed = False
        if "first_name" in data:
            admin.user.first_name = data["first_name"]
            user_changed = True
        if "last_name" in data:
            admin.user.last_name = data["last_name"]
            user_changed = True
        if "phone_number" in data:
            admin.user.phone_number = data["phone_number"]
            user_changed = True
        if user_changed:
            admin.user.save()

        if "position" in data:
            admin.position = data["position"]
        admin.save()

        return Response(AgencyAdminSerializer(admin).data)


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
        ctx = resolve_tenant_context(request, agency_id, allow_admin=True)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        agency = ctx.agency

        links = AgencyPatientLink.objects.filter(
            agency=agency, status=AgencyLinkStatus.APPROVED,
        ).select_related("patient", "decided_by")

        # Per the confirmed data-scoping requirement: an admin sees
        # only their own created patients, a supervisor sees their
        # own plus every admin reporting to them, and the owner (or a
        # superuser) sees everyone — visible_creator_user_ids()
        # returns None for that last case, meaning "no restriction".
        creator_scope = visible_creator_user_ids(request.user)
        if creator_scope is not None:
            links = links.filter(decided_by_id__in=creator_scope)

        rules = agency_reminder_rules(agency, "patients")
        patients_data = PatientProfileSerializer(
            [link.patient for link in links], many=True, context={"rules": rules},
        ).data

        # created_by is attached here rather than as a field on
        # PatientProfileSerializer itself, since "who created this"
        # is a fact about the AgencyPatientLink (this agency's
        # relationship to the patient), not an intrinsic property of
        # the patient record — a patient could theoretically have a
        # different creator per agency in a multi-agency future,
        # though that doesn't happen today.
        creator_by_patient_id = {
            link.patient_id: (link.decided_by.get_full_name() or link.decided_by.username) if link.decided_by else None
            for link in links
        }
        for row in patients_data:
            row["created_by"] = creator_by_patient_id.get(row["id"])

        return Response(patients_data)


class AgencyCaregiverPipelineListView(APIView):
    """
    GET /api/agencies/<agency_id>/caregivers-pipeline/
    The خدمت‌دهنده Kanban board's data source — same data-scoping
    rule as AgencyPatientListCreateView.get() above (admin sees own,
    supervisor sees own + their admins, owner sees all), applied here
    via AgencyCaregiverLink.decided_by rather than
    AgencyPatientLink.decided_by, but otherwise identical logic.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id, allow_admin=True)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        agency = ctx.agency

        links = AgencyCaregiverLink.objects.filter(
            agency=agency, status=AgencyLinkStatus.APPROVED,
        ).select_related("caregiver", "caregiver__user", "decided_by")

        creator_scope = visible_creator_user_ids(request.user)
        if creator_scope is not None:
            links = links.filter(decided_by_id__in=creator_scope)

        rules = agency_reminder_rules(agency, "caregiver_candidates")
        caregivers_data = AgencyCaregiverPipelineSerializer(
            [link.caregiver for link in links], many=True, context={"rules": rules},
        ).data

        creator_by_caregiver_id = {
            link.caregiver_id: (link.decided_by.get_full_name() or link.decided_by.username) if link.decided_by else None
            for link in links
        }
        for row in caregivers_data:
            row["created_by"] = creator_by_caregiver_id.get(row["id"])

        return Response(caregivers_data)

    def post(self, request, agency_id):
        """
        POST /api/agencies/<agency_id>/caregivers-pipeline/

        Enters a brand-new caregiver directly into this agency's own
        Kanban — same "someone else's information, no password field"
        pattern as AgencyPatientListCreateView.post() and the
        platform-wide supervisor wizard's own account-creation step
        (apps.caregivers.supervisor_views.SupervisorCaregiverListView).
        Reuses that same CreateCaregiverSerializer so both entry
        points validate identically.

        Deliberately does NOT add any new "assigned supervisor" field:
        decided_by=request.user is enough on its own, because
        visible_creator_user_ids() already resolves the right
        audience from the existing agency staff hierarchy — an admin
        sees only what they entered, that admin's own supervisor sees
        it too automatically (supervisor sees "self + every admin
        reporting to them"), and the owner always sees everything.
        Whichever of the three roles clicks "افزودن خدمت‌دهنده" is
        exactly who this candidate is "linked to" from that point on.
        """
        ctx = resolve_tenant_context(request, agency_id, allow_admin=True)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        agency = ctx.agency

        serializer = CreateCaregiverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if User.objects.filter(phone_number=data["phone_number"]).exists():
            return Response({"detail": "این شماره تلفن قبلاً ثبت شده است."}, status=status.HTTP_400_BAD_REQUEST)

        user = User(
            first_name=data["first_name"],
            last_name=data["last_name"],
            phone_number=data["phone_number"],
            email=data.get("email", ""),
            role=UserRole.CAREGIVER,
        )
        user.set_password(get_random_string(32))
        user.save()

        caregiver = CaregiverProfile.objects.create(user=user, created_by=request.user)
        audit.caregiver_created(request.user.id, user.id)

        AgencyCaregiverLink.objects.create(
            agency=agency, caregiver=caregiver, status=AgencyLinkStatus.APPROVED, decided_by=request.user,
        )

        rules = agency_reminder_rules(agency, "caregiver_candidates")
        response_data = AgencyCaregiverPipelineSerializer(caregiver, context={"rules": rules}).data
        response_data["created_by"] = request.user.get_full_name() or request.user.username
        return Response(response_data, status=status.HTTP_201_CREATED)


class AgencyCaregiverPipelineUpdateView(APIView):
    """
    PATCH /api/agencies/<agency_id>/caregivers-pipeline/<caregiver_id>/
    Updates any subset of the agency-operational fields on
    CaregiverProfile — pipeline stage (drag-and-drop), the urgent
    flag, or any of the seven document-checklist booleans — in one
    flexible endpoint, since the frontend board needs to change these
    independently of each other (a stage move never touches the
    checklist, and vice versa) but they're all the same kind of
    "agency's own operational note on this caregiver" data.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, agency_id, caregiver_id):
        ctx = resolve_tenant_context(request, agency_id, allow_admin=True)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        agency = ctx.agency

        link = AgencyCaregiverLink.objects.filter(
            caregiver_id=caregiver_id, agency=agency, status=AgencyLinkStatus.APPROVED,
        ).select_related("caregiver").first()
        if link is None:
            return Response({"detail": "مراقب یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        caregiver = link.caregiver

        # Every actual change below is collected here as (field, old,
        # new) and logged individually via audit.candidate_field_edited
        # after save() — the same accountability trail
        # EditCandidateFieldsView already gives the caregiver's own
        # identity fields, extended to cover the operational fields
        # this view edits (pipeline stage, urgent flag, document
        # checklist, tags, milestones), since an agency asked for
        # "every edit, logged with who did it" and these fields were
        # editable here without ever being logged before.
        field_changes = []

        def _track(field, new_value):
            old_value = getattr(caregiver, field)
            if old_value != new_value:
                field_changes.append((field, old_value, new_value))
            setattr(caregiver, field, new_value)

        if "agency_pipeline_status" in request.data:
            valid_values = [choice[0] for choice in CaregiverAgencyPipelineStatus.choices]
            new_status = request.data["agency_pipeline_status"]
            if new_status not in valid_values:
                return Response(
                    {"detail": f"مقدار agency_pipeline_status باید یکی از {valid_values} باشد."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if new_status != caregiver.agency_pipeline_status:
                # Logged BEFORE the field actually changes on `caregiver`
                # below — record_stage_transition just needs the target
                # value and the object's id, not the live instance.
                record_stage_transition("caregiver_candidates", caregiver.id, new_status)
            _track("agency_pipeline_status", new_status)

        editable_bool_fields = [
            "is_urgent", "doc_no_criminal_record", "doc_no_addiction_test", "doc_identity_verified",
            "doc_personal_photo", "doc_mental_health_test", "doc_promissory_note", "doc_id_card_received",
        ]
        for field in editable_bool_fields:
            if field in request.data:
                _track(field, bool(request.data[field]))

        if "tags" in request.data:
            tags = request.data["tags"]
            if not isinstance(tags, list) or not all(isinstance(t, str) for t in tags):
                return Response({"detail": "tags باید فهرستی از رشته‌ها باشد."}, status=status.HTTP_400_BAD_REQUEST)
            _track("tags", tags)

        if "process_milestones" in request.data:
            milestones = request.data["process_milestones"]
            valid_values = [choice[0] for choice in CaregiverProcessMilestone.choices]
            if not isinstance(milestones, list) or not all(m in valid_values for m in milestones):
                return Response(
                    {"detail": f"process_milestones باید فهرستی از {valid_values} باشد."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            _track("process_milestones", milestones)

        caregiver.save()

        for field, old_value, new_value in field_changes:
            # old_value/new_value land straight in AuditLog.metadata
            # (a JSONField) — str, bool, and list (tags/milestones)
            # are all natively JSON-serializable, so no coercion is
            # needed here, unlike EditCandidateFieldsView's plain-text
            # identity fields.
            audit.candidate_field_edited(
                request.user.id, caregiver.user_id, field=field, old_value=old_value, new_value=new_value,
            )

        rules = agency_reminder_rules(agency, "caregiver_candidates")
        response_data = AgencyCaregiverPipelineSerializer(caregiver, context={"rules": rules}).data
        response_data["created_by"] = (link.decided_by.get_full_name() or link.decided_by.username) if link.decided_by else None
        return Response(response_data)

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


class AgencyPatientPipelineStatusView(APIView):
    """
    PATCH /api/agencies/<agency_id>/patients/<patient_id>/pipeline-status/
    Updates only pipeline_status — the single field the agency-panel
    Kanban board needs to change when a card moves to a different
    column, deliberately kept separate from the full patient-edit
    flow (which doesn't exist as a single endpoint yet) so moving a
    card never risks touching any of the patient's actual profile
    data.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, agency_id, patient_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)
        agency = ctx.agency

        patient = PatientProfile.objects.filter(
            id=patient_id, agency_links__agency=agency, agency_links__status=AgencyLinkStatus.APPROVED,
        ).first()
        if patient is None:
            return Response({"detail": "سالمند یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        update_fields = []

        if "pipeline_status" in request.data:
            new_status = request.data["pipeline_status"]
            valid_values = [choice[0] for choice in PatientPipelineStatus.choices]
            if new_status not in valid_values:
                return Response(
                    {"detail": f"مقدار pipeline_status باید یکی از {valid_values} باشد."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if new_status != patient.pipeline_status:
                record_stage_transition("patients", patient.id, new_status)
            patient.pipeline_status = new_status
            update_fields.append("pipeline_status")

        if "is_urgent" in request.data:
            patient.is_urgent = bool(request.data["is_urgent"])
            update_fields.append("is_urgent")

        if "tags" in request.data:
            tags = request.data["tags"]
            if not isinstance(tags, list) or not all(isinstance(t, str) for t in tags):
                return Response({"detail": "tags باید فهرستی از رشته‌ها باشد."}, status=status.HTTP_400_BAD_REQUEST)
            patient.tags = tags
            update_fields.append("tags")

        if update_fields:
            patient.save(update_fields=update_fields)

        # created_by is attached the same way as in
        # AgencyPatientListCreateView.get() — it's a fact about this
        # agency's AgencyPatientLink to the patient, not a field on
        # PatientProfileSerializer itself, so it has to be added here
        # too or the frontend's optimistic-update replacement (which
        # takes this exact response as the new card data) loses the
        # creator tag the moment a card is dragged to a new column.
        link = AgencyPatientLink.objects.filter(
            agency=agency, patient=patient, status=AgencyLinkStatus.APPROVED,
        ).select_related("decided_by").first()
        created_by = None
        if link is not None and link.decided_by is not None:
            created_by = link.decided_by.get_full_name() or link.decided_by.username

        rules = agency_reminder_rules(agency, "patients")
        response_data = PatientProfileSerializer(patient, context={"rules": rules}).data
        response_data["created_by"] = created_by
        return Response(response_data)


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


# ---------------------------------------------------------------------
# Per-candidate edit history — "هر ویرایش/اقدام با نام کاربر لاگ شود":
# apps.audit.AuditLog already records every relevant event (field
# edits via EditCandidateFieldsView/AgencyCaregiverPipelineUpdateView,
# approvals, rejections, interview records, doc requests) — what was
# missing was any way for an AGENCY to actually read that trail back
# for one of its own candidates. apps.audit's existing endpoints are
# either admin/superuser-only, patient-scoped, or self-scoped; none of
# them fit an agency looking at a caregiver who isn't them.
# ---------------------------------------------------------------------

class AgencyCandidateHistoryView(APIView):
    """
    GET /api/agencies/<agency_id>/candidates/<user_id>/history/

    Same permission and roster scope as AgencyCandidateTrackingView
    (any link status, not approved-only — an agency should be able to
    see the history of a candidate still in their own vetting
    pipeline, not just an already-approved one). Restricted to the
    event types that are actually meaningful from an agency's own
    point of view; deliberately excludes purely-platform events
    (blacklisting, appeals) that live on a different review track and
    would only confuse this specific "what has WE done to this
    candidate's record" view.
    """
    permission_classes = [IsAuthenticated]

    _RELEVANT_EVENT_TYPES = [
        "candidate_field_edited",
        "caregiver_interview_recorded",
        "caregiver_needs_more_documents",
        "caregiver_approved",
        "caregiver_rejected",
    ]

    def get(self, request, agency_id, user_id):
        from apps.audit.models import AuditLog
        from apps.audit.serializers import AuditLogSerializer, build_user_names_map

        ctx = resolve_tenant_context(request, agency_id, allow_admin=True)
        if ctx is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)

        is_linked = AgencyCaregiverLink.objects.filter(
            agency=ctx.agency, caregiver__user_id=user_id,
            status__in=[AgencyLinkStatus.PENDING, AgencyLinkStatus.APPROVED],
        ).exists()
        if not is_linked:
            return Response({"detail": "این مراقب متعلق به این آژانس نیست."}, status=status.HTTP_404_NOT_FOUND)

        logs = AuditLog.objects.filter(
            target_user_id=user_id, event_type__in=self._RELEVANT_EVENT_TYPES,
        ).order_by("-created_at")[:200]

        user_ids = set()
        for entry in logs:
            user_ids.add(entry.actor_user_id)
            user_ids.add(entry.target_user_id)
        names = build_user_names_map(user_ids)

        return Response(AuditLogSerializer(logs, many=True, context={"user_names": names}).data)


# ---------------------------------------------------------------------
# Deep analytics — "ghesmate analyze o tahlil": one level beyond the
# dashboard's category breakdowns (AgencyDashboardInsightsView above),
# which just slices existing counts. This answers different, more
# analytical questions: how well is the vetting pipeline converting,
# how fast are decisions actually made, which caregivers are drawing
# complaints, and how long are family requests sitting unanswered —
# all computed from data this agency already has, nothing new tracked.
# ---------------------------------------------------------------------

class AgencyAnalyticsView(APIView):
    """
    GET /api/agencies/me/analytics/

    Available to the agency owner or any of its supervisors, same as
    AgencyDashboardView/AgencyDashboardInsightsView. Deliberately its
    own endpoint rather than folded into AgencyDashboardInsightsView
    — that one answers "what does things look like right now",  this
    one answers "how well is the operation actually running", and the
    two pages using them (dashboard vs. a dedicated تحلیل page) are
    genuinely different questions an owner asks at different times.
    """
    permission_classes = [IsAgencyOwnerOrSupervisor]

    def get(self, request):
        agency = _resolve_my_agency(request)
        if agency is None:
            return Response({"detail": "دسترسی مجاز نیست."}, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Count
        from apps.care.models import AssignmentStatus, CaregiverAssignment
        from apps.caregivers.models import CaregiverProfile, CaregiverStatus
        from apps.reviews.models import Complaint

        # ------------------------------------------------------------
        # 1) Vetting funnel — every caregiver ever linked to this
        # agency (any link status), by where they ended up, plus the
        # average time it actually took to reach a decision. Decision
        # time is measured on the AGENCY LINK (requested_at ->
        # decided_at), not the platform-wide CaregiverProfile status —
        # that's the honest measure of "how long did THIS agency take
        # to decide on THIS candidate," which is what an owner
        # actually wants to know, not a platform-wide review time that
        # might include a totally different agency's delay.
        # ------------------------------------------------------------
        links = agency.caregiver_links.select_related("caregiver").all()
        total_candidates = links.count()

        status_counts = {}
        for link in links:
            st = link.caregiver.status
            status_counts[st] = status_counts.get(st, 0) + 1

        approved_count = status_counts.get(CaregiverStatus.APPROVED, 0)
        rejected_count = status_counts.get(CaregiverStatus.REJECTED, 0)
        needs_docs_count = status_counts.get(CaregiverStatus.NEEDS_MORE_DOCS, 0)
        pending_count = status_counts.get(CaregiverStatus.PENDING, 0)

        approval_rate = round(approved_count / total_candidates * 100, 1) if total_candidates else 0.0

        decided_links = links.filter(decided_at__isnull=False)
        avg_decision_days = None
        if decided_links.exists():
            # requested_at/decided_at are jDateTimeField — real
            # Gregorian datetimes underneath, so plain arithmetic on
            # the Python objects (not an ORM F-expression subtraction,
            # which django_jalali doesn't support cleanly) is the
            # reliable way to compute this.
            deltas = [
                (link.decided_at.togregorian() - link.requested_at.togregorian()).total_seconds() / 86400
                for link in decided_links
            ]
            avg_decision_days = round(sum(deltas) / len(deltas), 1)

        # ------------------------------------------------------------
        # 2) Complaint quality signal — same roster scope as
        # AgencyComplaintsAboutOwnRosterView/AgencyDashboardInsightsView.
        # complaints_per_approved_caregiver is a ratio, not a count,
        # so it stays meaningful whether an agency has 3 caregivers or
        # 300. top_flagged_caregivers surfaces WHO specifically is
        # drawing complaints, since a ratio alone hides that.
        # ------------------------------------------------------------
        roster_ids = agency_caregiver_profile_ids(agency)
        total_complaints = Complaint.objects.filter(about_caregiver_id__in=roster_ids).count()
        complaints_per_approved_caregiver = (
            round(total_complaints / approved_count, 2) if approved_count else 0.0
        )

        top_flagged_rows = (
            Complaint.objects.filter(about_caregiver_id__in=roster_ids)
            .values("about_caregiver_id")
            .annotate(n=Count("id"))
            .order_by("-n")[:5]
        )
        caregiver_names = {
            cp.id: (cp.user.get_full_name() or cp.user.username)
            for cp in CaregiverProfile.objects.filter(
                id__in=[row["about_caregiver_id"] for row in top_flagged_rows],
            ).select_related("user")
        }
        top_flagged_caregivers = [
            {"caregiver_id": row["about_caregiver_id"], "name": caregiver_names.get(row["about_caregiver_id"], "—"), "complaint_count": row["n"]}
            for row in top_flagged_rows
        ]

        # ------------------------------------------------------------
        # 3) Stale family requests — how long PENDING family join
        # requests have actually been sitting unanswered. Buckets, not
        # a single average, because an owner needs to know "how many
        # are overdue right now", not just a number that one very old
        # forgotten request can skew.
        # ------------------------------------------------------------
        from django.utils import timezone
        now = timezone.now()
        pending_family_links = agency.family_links.filter(status=AgencyLinkStatus.PENDING)
        stale_buckets = {"within_3_days": 0, "within_7_days": 0, "over_7_days": 0}
        for link in pending_family_links:
            age_days = (now - link.requested_at.togregorian()).total_seconds() / 86400
            if age_days <= 3:
                stale_buckets["within_3_days"] += 1
            elif age_days <= 7:
                stale_buckets["within_7_days"] += 1
            else:
                stale_buckets["over_7_days"] += 1

        # ------------------------------------------------------------
        # 4) Care activity — assignments serving this agency's own
        # patients (any caregiver, since a family's own patient is
        # the anchor an agency actually cares about here), and how
        # long an assignment lasts on average once it ends.
        # ------------------------------------------------------------
        agency_patient_ids = agency.patient_links.filter(
            status=AgencyLinkStatus.APPROVED,
        ).values_list("patient_id", flat=True)
        assignments = CaregiverAssignment.objects.filter(patient_id__in=agency_patient_ids)
        active_assignments_count = assignments.filter(status=AssignmentStatus.ACTIVE).count()
        ended_assignments = assignments.filter(status=AssignmentStatus.ENDED, ended_at__isnull=False)

        avg_assignment_duration_days = None
        if ended_assignments.exists():
            durations = [
                (a.ended_at.togregorian() - a.assigned_at.togregorian()).total_seconds() / 86400
                for a in ended_assignments
            ]
            avg_assignment_duration_days = round(sum(durations) / len(durations), 1)

        return Response({
            "vetting_funnel": {
                "total_candidates": total_candidates,
                "approved_count": approved_count,
                "rejected_count": rejected_count,
                "needs_more_docs_count": needs_docs_count,
                "pending_count": pending_count,
                "approval_rate_percent": approval_rate,
                "avg_decision_days": avg_decision_days,
            },
            "complaint_quality": {
                "total_complaints": total_complaints,
                "complaints_per_approved_caregiver": complaints_per_approved_caregiver,
                "top_flagged_caregivers": top_flagged_caregivers,
            },
            "stale_family_requests": stale_buckets,
            "care_activity": {
                "active_assignments_count": active_assignments_count,
                "ended_assignments_count": ended_assignments.count(),
                "avg_assignment_duration_days": avg_assignment_duration_days,
            },
        })
