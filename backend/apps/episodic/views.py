import jdatetime
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.agencies.models import PipelineType
from apps.agencies.pipeline_stages import stage_choices
from apps.agencies.tenancy import agency_caregiver_profile_ids, resolve_tenant_context
from apps.finance.models import BillingCycle, Invoice, InvoiceStatus, Payment
from apps.reminders.services import agency_reminder_rules
from apps.reminders.utils import jalali_now

from .models import EpisodicService, EpisodicServiceStage
from .serializers import CreateEpisodicServiceSerializer, EpisodicServiceSerializer, UpdateEpisodicServiceStageSerializer

# Card-movement endpoints pass allow_admin=True — dispatching/settling
# a one-off request is exactly the receptionist-level, day-to-day work
# apps.agencies.models.AgencyAdmin's own docstring describes, the same
# reasoning that already gives the patient Kanban admin access.
# Reminder-rule CONFIGURATION lives entirely in apps.reminders now
# (shared across every pipeline) — see that app's views.py.
_STAGE_TIMESTAMP_FIELD = {
    EpisodicServiceStage.PHONE_COORDINATION: "phone_coordination_at",
    EpisodicServiceStage.DISPATCHED: "dispatched_at",
    EpisodicServiceStage.SETTLED: "settled_at",
    EpisodicServiceStage.FOLLOWUP: "followup_at",
}


class EpisodicCaregiverRosterView(APIView):
    """
    GET /api/agencies/<agency_id>/episodic-caregiver-roster/ — id +
    display name for this agency's own APPROVED caregivers, just
    enough to populate the "چه کسی اعزام شد" dropdown when moving a
    card into "اعزام". Deliberately its own tiny endpoint rather than
    apps.agencies.AgencyCaregiverRosterView (GET /agencies/me/caregivers/)
    — that one is owner/supervisor-only (IsAgencyOwnerOrSupervisor),
    while dispatching a one-off card is exactly the admin-level task
    this app's other endpoints already allow (allow_admin=True above).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id, allow_admin=True)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        from apps.caregivers.models import CaregiverProfile
        caregivers = CaregiverProfile.objects.filter(
            id__in=agency_caregiver_profile_ids(ctx.agency),
        ).select_related("user__caregiver_identity_profile")
        result = []
        for caregiver in caregivers:
            identity = getattr(caregiver.user, "caregiver_identity_profile", None)
            name = (identity.full_name if identity else None) or caregiver.user.username
            result.append({"id": caregiver.id, "full_name": name})
        return Response(result)


class EpisodicServiceListCreateView(APIView):
    """GET/POST /api/agencies/<agency_id>/episodic-services/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id, allow_admin=True)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        services = (
            EpisodicService.objects.filter(agency=ctx.agency)
            .select_related("assigned_caregiver__user__caregiver_identity_profile", "invoice", "created_by")
        )
        rules = agency_reminder_rules(ctx.agency, "episodic_services")
        data = EpisodicServiceSerializer(services, many=True, context={"rules": rules}).data
        return Response(data)

    def post(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id, allow_admin=True)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = CreateEpisodicServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        service = EpisodicService.objects.create(
            agency=ctx.agency,
            recipient_full_name=data["recipient_full_name"],
            recipient_phone_number=data.get("recipient_phone_number", ""),
            notes=data.get("notes", ""),
            stage=EpisodicServiceStage.PHONE_COORDINATION,
            phone_coordination_at=jalali_now(),
            created_by=request.user,
        )
        rules = agency_reminder_rules(ctx.agency, "episodic_services")
        return Response(
            EpisodicServiceSerializer(service, context={"rules": rules}).data,
            status=status.HTTP_201_CREATED,
        )


class EpisodicServiceStageUpdateView(APIView):
    """
    PATCH /api/agencies/<agency_id>/episodic-services/<service_id>/

    Moves the card, optionally assigns a caregiver (validated against
    this agency's own approved roster), and — only when moving INTO
    "settled" for the first time — creates a real Invoice (status
    ISSUED) plus a matching full Payment (immediately marking it PAID),
    per the confirmed requirement that this stage produce a real
    finance record, not just a status flag. Revisiting "settled" on a
    card that already has an invoice does not create a second one.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, agency_id, service_id):
        ctx = resolve_tenant_context(request, agency_id, allow_admin=True)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        service = EpisodicService.objects.filter(id=service_id, agency=ctx.agency).first()
        if service is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateEpisodicServiceStageSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "assigned_caregiver_id" in data:
            caregiver_id = data["assigned_caregiver_id"]
            if caregiver_id is not None and caregiver_id not in agency_caregiver_profile_ids(ctx.agency):
                return Response({"detail": "این مراقب در فهرست تاییدشده‌ی این آژانس نیست."}, status=status.HTTP_400_BAD_REQUEST)
            service.assigned_caregiver_id = caregiver_id

        if "notes" in data:
            service.notes = data["notes"]

        new_stage = data.get("stage")
        if new_stage:
            valid_values = [value for value, _ in stage_choices(ctx.agency, PipelineType.EPISODIC)]
            if new_stage not in valid_values:
                return Response(
                    {"detail": f"مقدار stage باید یکی از {valid_values} باشد."}, status=status.HTTP_400_BAD_REQUEST,
                )
        if new_stage and new_stage != service.stage:
            if new_stage == EpisodicServiceStage.SETTLED and service.invoice_id is None:
                missing = [f for f in ("amount", "method", "paid_at") if f not in data]
                if missing:
                    return Response(
                        {"detail": "برای انتقال به مرحله تسویه‌حساب، مبلغ، روش پرداخت و تاریخ پرداخت لازم است."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                today = jdatetime.date.today()
                invoice = Invoice.objects.create(
                    agency=ctx.agency, assignment=None,
                    period_type=BillingCycle.ONE_OFF, period_start=today, period_end=today,
                    amount=data["amount"], status=InvoiceStatus.ISSUED, created_by=request.user,
                    notes=f"خدمت مقطعی — {service.recipient_full_name}",
                )
                Payment.objects.create(
                    invoice=invoice, amount=data["amount"], method=data["method"],
                    paid_at=data["paid_at"], recorded_by=request.user,
                )
                invoice.refresh_from_db()
                invoice.recompute_status()
                service.invoice = invoice

            service.stage = new_stage
            # A custom stage appended past the 4 built-in ones has no
            # timestamp field to set — nothing to anchor a reminder to
            # for it anyway, so this is simply skipped rather than a
            # KeyError.
            field_name = _STAGE_TIMESTAMP_FIELD.get(new_stage)
            if field_name and getattr(service, field_name) is None:
                setattr(service, field_name, jalali_now())

        service.save()
        rules = agency_reminder_rules(ctx.agency, "episodic_services")
        return Response(EpisodicServiceSerializer(service, context={"rules": rules}).data)
