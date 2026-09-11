from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authorization.permissions import IsAdminOrSuperuser
from apps.accounts.models import User, UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyFamilyLink, AgencyLinkStatus, AgencyPatientLink, AgencyProfile
from apps.caregivers.models import CaregiverProfile, CaregiverStatus

from .models import PageView


class RecordPageViewView(APIView):
    """
    Public, no auth — hit once per page load from the landing page's
    own client code. Deliberately fire-and-forget from the caller's
    side: this always returns 201 immediately and never surfaces a
    validation error to the visitor, since a visit-tracking beacon
    breaking a person's actual page load would be a worse outcome
    than losing one row of analytics data.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        path = str(request.data.get("path", ""))[:255]
        referrer = str(request.data.get("referrer", ""))[:500]
        ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", ""))
        ip = ip.split(",")[0].strip() if ip else "0.0.0.0"
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]

        try:
            PageView.objects.create(path=path, ip_address=ip, user_agent=user_agent, referrer=referrer)
        except Exception:
            pass
        return Response(status=status.HTTP_201_CREATED)


def _date_range_from_request(request):
    """Shared by PageViewStatsView below — defaults to the last 7
    days if no explicit range is given, since "all time" on an
    unbounded table would only get slower and less useful as it
    grows."""
    start = parse_date(request.query_params.get("start", "")) if request.query_params.get("start") else None
    end = parse_date(request.query_params.get("end", "")) if request.query_params.get("end") else None
    if not start and not end:
        end = timezone.now().date()
        start = end - timedelta(days=6)
    elif start and not end:
        end = timezone.now().date()
    elif end and not start:
        start = end - timedelta(days=6)
    return start, end


class PageViewStatsView(APIView):
    """
    GET /api/analytics/pageviews/?start=&end=&path=
    Admin/superuser only. Returns today's visit count, today's unique
    visitor count (see PageView's own docstring for exactly what
    "unique" means here), and a most-viewed-pages breakdown for the
    requested date range (defaulting to the last 7 days) — the
    "advanced filtering" surface for this data.
    """
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        today = timezone.now().date()
        today_qs = PageView.objects.filter(created_at__date=today)
        today_visits = today_qs.count()
        today_unique = today_qs.values("ip_address").distinct().count()

        start, end = _date_range_from_request(request)
        range_qs = PageView.objects.filter(created_at__date__gte=start, created_at__date__lte=end)

        path_filter = request.query_params.get("path")
        if path_filter:
            range_qs = range_qs.filter(path__icontains=path_filter)

        most_viewed = (
            range_qs.values("path")
            .annotate(views=Count("id"))
            .order_by("-views")[:10]
        )
        range_unique = range_qs.values("ip_address").distinct().count()

        return Response({
            "today_visits": today_visits,
            "today_unique_visitors": today_unique,
            "range_start": start.isoformat(),
            "range_end": end.isoformat(),
            "range_total_visits": range_qs.count(),
            "range_unique_visitors": range_unique,
            "most_viewed_pages": list(most_viewed),
        })


class PlatformCountsView(APIView):
    """
    GET /api/analytics/platform-counts/
    Admin/superuser only. The straightforward part of this whole
    feature — just counts of data that already exists (users by
    role, agencies, approved caregivers, agency customers) — nothing
    here requires the PageView tracking above at all.

    "Agency customers" is deliberately the count of APPROVED
    family+patient links specifically (not pending/rejected), since
    a pending request isn't yet a real customer of that agency.
    """
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        role_counts = {}
        for row in User.objects.values("role").annotate(count=Count("id")):
            role_counts[row["role"]] = row["count"]

        agency_customers = (
            AgencyFamilyLink.objects.filter(status=AgencyLinkStatus.APPROVED).count()
            + AgencyPatientLink.objects.filter(status=AgencyLinkStatus.APPROVED).count()
        )

        return Response({
            "users_by_role": {
                "family": role_counts.get(UserRole.FAMILY, 0),
                "patient": role_counts.get(UserRole.PATIENT, 0),
                "caregiver": role_counts.get(UserRole.CAREGIVER, 0),
                "agency": role_counts.get(UserRole.AGENCY, 0),
                "admin": role_counts.get(UserRole.ADMIN, 0),
                "superuser": role_counts.get(UserRole.SUPERUSER, 0),
            },
            "total_users": User.objects.count(),
            "total_agencies": AgencyProfile.objects.count(),
            "total_caregivers_approved": CaregiverProfile.objects.filter(status=CaregiverStatus.APPROVED).count(),
            "total_caregivers_all": CaregiverProfile.objects.count(),
            "agency_customers": agency_customers,
        })
