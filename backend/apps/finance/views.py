import jdatetime
from django.db.models import Sum
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.agencies.models import AgencyPatientLink
from apps.agencies.tenancy import resolve_tenant_context
from apps.care.models import CaregiverAssignment

from .models import BillingCycle, Invoice, InvoiceStatus, Payment, ServiceTariff
from .serializers import (
    AssignmentBillingSerializer,
    CreateInvoiceSerializer,
    CreatePaymentSerializer,
    InvoiceSerializer,
    PaymentSerializer,
    ServiceTariffSerializer,
    UpdateAssignmentBillingSerializer,
    UpdateInvoiceStatusSerializer,
    UpsertServiceTariffSerializer,
)
from .services import RateNotConfigured, compute_invoice_amount

# Every view in this file resolves tenancy with the tenancy module's
# default (allow_supervisor=True, allow_admin=False) — deliberately
# NOT passing allow_admin=True the way the patient Kanban endpoints do.
# Money is a materially more sensitive surface than caregiver/patient
# data entry, and AGENCY_ADMIN was introduced for exactly that
# narrower, receptionist-like scope (see AgencyAdmin's own docstring)
# — an agency choosing to also expose finance to admins is a real,
# separate future decision, not an oversight here.


def _parse_jalali_date(value):
    return jdatetime.date.fromisoformat(str(value))


def _date_range_from_query(request, default_days=30):
    from_raw = request.query_params.get("from")
    to_raw = request.query_params.get("to")
    today = jdatetime.date.today()
    date_to = _parse_jalali_date(to_raw) if to_raw else today
    date_from = _parse_jalali_date(from_raw) if from_raw else date_to - jdatetime.timedelta(days=default_days)
    return date_from, date_to


def _paid_amounts_by_invoice(invoice_ids):
    rows = (
        Payment.objects.filter(invoice_id__in=invoice_ids)
        .values("invoice_id")
        .annotate(total=Sum("amount"))
    )
    return {row["invoice_id"]: row["total"] or 0 for row in rows}


class ServiceTariffListCreateView(APIView):
    """
    GET/POST /api/agencies/<agency_id>/finance/tariffs/

    POST upserts by (agency, service_type) — see
    UpsertServiceTariffSerializer's docstring for why create and edit
    share one endpoint here.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        tariffs = ctx.agency.tariffs.select_related("created_by").all()
        return Response(ServiceTariffSerializer(tariffs, many=True).data)

    def post(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = UpsertServiceTariffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        tariff, _created = ServiceTariff.objects.update_or_create(
            agency=ctx.agency, service_type=data["service_type"],
            defaults={
                "hourly_rate": data.get("hourly_rate"),
                "daily_rate": data.get("daily_rate"),
                "monthly_rate": data.get("monthly_rate"),
                "is_active": data.get("is_active", True),
                "created_by": request.user,
            },
        )
        return Response(ServiceTariffSerializer(tariff).data, status=status.HTTP_200_OK)


class AssignmentBillingListView(APIView):
    """GET /api/agencies/<agency_id>/finance/assignments/ — every active
    assignment in this agency's roster, with its current billing setup,
    as the base list the "مدیریت تعرفه‌ها" screen edits per-assignment
    overrides from."""
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        patient_ids = AgencyPatientLink.objects.filter(agency=ctx.agency).values_list("patient_id", flat=True)
        assignments = (
            CaregiverAssignment.objects.filter(patient_id__in=patient_ids)
            .select_related("caregiver__user", "patient")
        )
        return Response(AssignmentBillingSerializer(assignments, many=True).data)


class AssignmentBillingUpdateView(APIView):
    """PATCH /api/agencies/<agency_id>/finance/assignments/<assignment_id>/
    — sets which service type/cycle/override rates this one assignment
    bills at."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, agency_id, assignment_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        patient_ids = AgencyPatientLink.objects.filter(agency=ctx.agency).values_list("patient_id", flat=True)
        assignment = CaregiverAssignment.objects.filter(id=assignment_id, patient_id__in=patient_ids).first()
        if assignment is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateAssignmentBillingSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(assignment, field, value)
        assignment.save()
        return Response(AssignmentBillingSerializer(assignment).data)


class InvoiceListCreateView(APIView):
    """
    GET /api/agencies/<agency_id>/finance/invoices/
        ?period_type=daily|weekly|monthly&status=...&caregiver_user_id=...&from=&to=
    POST — generates one invoice for one assignment/period; amount is
    always computed server-side (see services.compute_invoice_amount),
    never accepted from the client.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)

        invoices = Invoice.objects.filter(agency=ctx.agency).select_related(
            "assignment__caregiver__user", "assignment__patient", "created_by",
        ).prefetch_related("payments")

        period_type = request.query_params.get("period_type")
        if period_type:
            invoices = invoices.filter(period_type=period_type)
        status_filter = request.query_params.get("status")
        if status_filter:
            invoices = invoices.filter(status=status_filter)
        caregiver_user_id = request.query_params.get("caregiver_user_id")
        if caregiver_user_id:
            invoices = invoices.filter(assignment__caregiver__user_id=caregiver_user_id)
        from_raw = request.query_params.get("from")
        to_raw = request.query_params.get("to")
        if from_raw:
            invoices = invoices.filter(period_start__gte=_parse_jalali_date(from_raw))
        if to_raw:
            invoices = invoices.filter(period_start__lte=_parse_jalali_date(to_raw))

        return Response(InvoiceSerializer(invoices, many=True).data)

    def post(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer = CreateInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        patient_ids = AgencyPatientLink.objects.filter(agency=ctx.agency).values_list("patient_id", flat=True)
        assignment = CaregiverAssignment.objects.filter(
            id=data["assignment_id"], patient_id__in=patient_ids,
        ).first()
        if assignment is None:
            return Response({"detail": "این تخصیص در آژانس شما یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        try:
            amount = compute_invoice_amount(
                assignment, ctx.agency, data["period_type"], data["period_start"], data["period_end"],
            )
        except RateNotConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        invoice = Invoice.objects.create(
            agency=ctx.agency, assignment=assignment,
            period_type=data["period_type"], period_start=data["period_start"], period_end=data["period_end"],
            amount=amount, status=InvoiceStatus.ISSUED,
            due_date=data.get("due_date"), notes=data.get("notes", ""), created_by=request.user,
        )
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class InvoiceStatusUpdateView(APIView):
    """PATCH /api/agencies/<agency_id>/finance/invoices/<invoice_id>/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, agency_id, invoice_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        invoice = Invoice.objects.filter(id=invoice_id, agency=ctx.agency).first()
        if invoice is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = UpdateInvoiceStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice.status = serializer.validated_data["status"]
        invoice.save(update_fields=["status", "updated_at"])
        return Response(InvoiceSerializer(invoice).data)


class PaymentCreateView(APIView):
    """POST /api/agencies/<agency_id>/finance/invoices/<invoice_id>/payments/
    — records a real payment, then recomputes the invoice's status from
    the actual total received (see Invoice.recompute_status)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, agency_id, invoice_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        invoice = Invoice.objects.filter(id=invoice_id, agency=ctx.agency).first()
        if invoice is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if invoice.status == InvoiceStatus.CANCELLED:
            return Response({"detail": "این صورت‌حساب لغو شده و پرداختی روی آن ثبت نمی‌شود."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        Payment.objects.create(
            invoice=invoice, amount=data["amount"], method=data["method"],
            paid_at=data["paid_at"], notes=data.get("notes", ""), recorded_by=request.user,
        )
        invoice.refresh_from_db()
        invoice.recompute_status()
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class FinanceOverviewView(APIView):
    """
    GET /api/agencies/<agency_id>/finance/overview/?granularity=daily|weekly|monthly&from=&to=

    Agency-wide "نظارت بر عملکرد مالی": total billed/collected/
    outstanding for the range, plus a bucketed series at the requested
    granularity — the "انواع فیلترهای مالی روزانه/هفتگی/ماهانه" the
    financial section is meant to offer.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)

        granularity = request.query_params.get("granularity", "monthly")
        if granularity not in BillingCycle.values:
            granularity = "monthly"
        date_from, date_to = _date_range_from_query(request)

        invoices = list(
            Invoice.objects.filter(
                agency=ctx.agency, period_start__gte=date_from, period_start__lte=date_to,
            ).exclude(status=InvoiceStatus.CANCELLED)
        )
        paid_by_invoice = _paid_amounts_by_invoice([inv.id for inv in invoices])

        buckets = {}
        total_billed = 0
        total_paid = 0
        for inv in invoices:
            paid = paid_by_invoice.get(inv.id, 0)
            total_billed += inv.amount
            total_paid += paid
            key = _bucket_key(inv.period_start, granularity)
            bucket = buckets.setdefault(key, {"period": key, "billed": 0, "paid": 0, "invoice_count": 0})
            bucket["billed"] += inv.amount
            bucket["paid"] += paid
            bucket["invoice_count"] += 1

        series = [buckets[key] for key in sorted(buckets.keys())]

        return Response({
            "range": {"from": date_from.strftime("%Y-%m-%d"), "to": date_to.strftime("%Y-%m-%d")},
            "granularity": granularity,
            "total_billed": total_billed,
            "total_paid": total_paid,
            "total_outstanding": total_billed - total_paid,
            "invoice_count": len(invoices),
            "series": series,
        })


def _bucket_key(jalali_date, granularity):
    if granularity == "daily":
        return jalali_date.strftime("%Y-%m-%d")
    if granularity == "weekly":
        # Jalali weeks run Saturday->Friday; weekday() is 0=Saturday in jdatetime.
        week_start = jalali_date - jdatetime.timedelta(days=jalali_date.weekday())
        return week_start.strftime("%Y-%m-%d")
    return jalali_date.strftime("%Y-%m")


class CaregiverFinancialPerformanceView(APIView):
    """GET /api/agencies/<agency_id>/finance/performance/caregivers/
    — per-caregiver billed/collected/outstanding for the range, the
    "نظارت بر عملکرد مالی کارمندان" requirement's caregiver half."""
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)

        date_from, date_to = _date_range_from_query(request)
        # assignment__isnull=False — a خدمات مقطعی settlement has no
        # CaregiverAssignment to attribute per-caregiver performance
        # to (see finance.models.Invoice.assignment's docstring); it
        # still counts in FinanceOverviewView's agency-wide totals
        # above, just not broken out per caregiver here.
        invoices = list(
            Invoice.objects.filter(
                agency=ctx.agency, period_start__gte=date_from, period_start__lte=date_to, assignment__isnull=False,
            ).exclude(status=InvoiceStatus.CANCELLED).select_related("assignment__caregiver__user")
        )
        paid_by_invoice = _paid_amounts_by_invoice([inv.id for inv in invoices])

        rows = {}
        for inv in invoices:
            caregiver = inv.assignment.caregiver
            identity = getattr(caregiver.user, "caregiver_identity_profile", None)
            name = (identity.full_name if identity else None) or caregiver.user.username
            row = rows.setdefault(caregiver.id, {
                "caregiver_id": caregiver.id, "caregiver_name": name,
                "billed": 0, "paid": 0, "invoice_count": 0,
            })
            row["billed"] += inv.amount
            row["paid"] += paid_by_invoice.get(inv.id, 0)
            row["invoice_count"] += 1

        result = sorted(rows.values(), key=lambda r: r["billed"], reverse=True)
        for row in result:
            row["outstanding"] = row["billed"] - row["paid"]
        return Response(result)


class StaffFinancialPerformanceView(APIView):
    """
    GET /api/agencies/<agency_id>/finance/performance/staff/
    — attributes revenue to whichever supervisor/admin actually
    registered the paying patient (AgencyPatientLink.decided_by, the
    same field the patient Kanban's own scoping already treats as "who
    brought this record in"), the "نظارت بر عملکرد مالی کارمندان"
    requirement's supervisor/admin half.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)

        date_from, date_to = _date_range_from_query(request)
        # Same assignment__isnull=False reasoning as
        # CaregiverFinancialPerformanceView above — a خدمات مقطعی
        # settlement has no AgencyPatientLink.decided_by to attribute
        # staff credit to.
        invoices = list(
            Invoice.objects.filter(
                agency=ctx.agency, period_start__gte=date_from, period_start__lte=date_to, assignment__isnull=False,
            ).exclude(status=InvoiceStatus.CANCELLED).select_related("assignment__patient")
        )
        paid_by_invoice = _paid_amounts_by_invoice([inv.id for inv in invoices])

        patient_creator = dict(
            AgencyPatientLink.objects.filter(agency=ctx.agency).values_list("patient_id", "decided_by_id")
        )

        rows = {}
        for inv in invoices:
            staff_user_id = patient_creator.get(inv.assignment.patient_id)
            row = rows.setdefault(staff_user_id, {
                "staff_user_id": staff_user_id, "billed": 0, "paid": 0, "invoice_count": 0, "patient_ids": set(),
            })
            row["billed"] += inv.amount
            row["paid"] += paid_by_invoice.get(inv.id, 0)
            row["invoice_count"] += 1
            row["patient_ids"].add(inv.assignment.patient_id)

        from apps.accounts.models import User
        user_names = {
            u.id: (f"{u.first_name} {u.last_name}".strip() or u.username)
            for u in User.objects.filter(id__in=[k for k in rows if k is not None])
        }

        result = []
        for staff_user_id, row in rows.items():
            result.append({
                "staff_user_id": staff_user_id,
                "staff_name": user_names.get(staff_user_id, "نامشخص"),
                "billed": row["billed"], "paid": row["paid"], "outstanding": row["billed"] - row["paid"],
                "invoice_count": row["invoice_count"], "patient_count": len(row["patient_ids"]),
            })
        result.sort(key=lambda r: r["billed"], reverse=True)
        return Response(result)
