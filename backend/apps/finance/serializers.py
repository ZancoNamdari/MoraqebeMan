from rest_framework import serializers

from apps.accounts.jalali_fields import JalaliDateField, JalaliDateTimeField
from apps.care.models import CaregiverAssignment

from .models import Invoice, Payment, ServiceTariff


class ServiceTariffSerializer(serializers.ModelSerializer):
    service_type_display = serializers.CharField(source="get_service_type_display", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)
    created_at = JalaliDateTimeField(read_only=True)
    updated_at = JalaliDateTimeField(read_only=True)

    class Meta:
        model = ServiceTariff
        fields = [
            "id", "service_type", "service_type_display", "hourly_rate", "daily_rate", "monthly_rate",
            "is_active", "created_by_username", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "service_type_display", "created_by_username", "created_at", "updated_at"]


class UpsertServiceTariffSerializer(serializers.Serializer):
    """One serializer for both create and edit — a tariff is keyed by
    (agency, service_type), so "create" for a service type that
    already has a row is really an edit; the view decides which via
    update_or_create rather than forcing the caller to know which verb
    applies to which service type."""
    service_type = serializers.ChoiceField(choices=ServiceTariff._meta.get_field("service_type").choices)
    hourly_rate = serializers.DecimalField(max_digits=12, decimal_places=0, required=False, allow_null=True, min_value=0)
    daily_rate = serializers.DecimalField(max_digits=12, decimal_places=0, required=False, allow_null=True, min_value=0)
    monthly_rate = serializers.DecimalField(max_digits=12, decimal_places=0, required=False, allow_null=True, min_value=0)
    is_active = serializers.BooleanField(required=False, default=True)


class AssignmentBillingSerializer(serializers.ModelSerializer):
    """Read-side view of an assignment's billing setup — exposed under
    apps.finance's own URLs (not apps.care's) since service_type/
    billing_cycle/custom_*_rate only mean anything in a financial
    context, even though the fields live on CaregiverAssignment."""
    caregiver_name = serializers.SerializerMethodField()
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    service_type_display = serializers.CharField(source="get_service_type_display", read_only=True)
    billing_cycle_display = serializers.CharField(source="get_billing_cycle_display", read_only=True)

    class Meta:
        model = CaregiverAssignment
        fields = [
            "id", "caregiver_name", "patient_name", "status",
            "service_type", "service_type_display", "billing_cycle", "billing_cycle_display",
            "custom_hourly_rate", "custom_daily_rate", "custom_monthly_rate",
        ]
        read_only_fields = ["id", "caregiver_name", "patient_name", "status", "service_type_display", "billing_cycle_display"]

    def get_caregiver_name(self, obj):
        identity = getattr(obj.caregiver.user, "caregiver_identity_profile", None)
        return (identity.full_name if identity else None) or obj.caregiver.user.username


class UpdateAssignmentBillingSerializer(serializers.Serializer):
    service_type = serializers.ChoiceField(
        choices=CaregiverAssignment._meta.get_field("service_type").choices, required=False, allow_blank=True,
    )
    billing_cycle = serializers.ChoiceField(
        choices=CaregiverAssignment._meta.get_field("billing_cycle").choices, required=False, allow_blank=True,
    )
    custom_hourly_rate = serializers.DecimalField(max_digits=12, decimal_places=0, required=False, allow_null=True, min_value=0)
    custom_daily_rate = serializers.DecimalField(max_digits=12, decimal_places=0, required=False, allow_null=True, min_value=0)
    custom_monthly_rate = serializers.DecimalField(max_digits=12, decimal_places=0, required=False, allow_null=True, min_value=0)


class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source="get_method_display", read_only=True)
    recorded_by_username = serializers.CharField(source="recorded_by.username", read_only=True, default=None)
    paid_at = JalaliDateField()
    created_at = JalaliDateTimeField(read_only=True)

    class Meta:
        model = Payment
        fields = ["id", "amount", "method", "method_display", "paid_at", "notes", "recorded_by_username", "created_at"]
        read_only_fields = ["id", "method_display", "recorded_by_username", "created_at"]


class CreatePaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=0, min_value=0)
    method = serializers.ChoiceField(choices=Payment._meta.get_field("method").choices)
    paid_at = JalaliDateField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class InvoiceSerializer(serializers.ModelSerializer):
    period_type_display = serializers.CharField(source="get_period_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    caregiver_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    is_episodic = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)
    period_start = JalaliDateField()
    period_end = JalaliDateField()
    due_date = JalaliDateField(required=False, allow_null=True)
    created_at = JalaliDateTimeField(read_only=True)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "assignment", "is_episodic", "caregiver_name", "patient_name",
            "period_type", "period_type_display", "period_start", "period_end",
            "amount", "paid_amount", "remaining_amount",
            "status", "status_display", "due_date", "notes",
            "created_by_username", "created_at", "payments",
        ]
        read_only_fields = [
            "id", "is_episodic", "caregiver_name", "patient_name", "period_type_display", "status_display",
            "amount", "paid_amount", "remaining_amount", "status", "created_by_username", "created_at", "payments",
        ]

    def get_is_episodic(self, obj):
        # True for a settlement created by apps.episodic (خدمات
        # مقطعی) rather than a recurring CaregiverAssignment — see
        # finance.models.Invoice.assignment's docstring for why exactly
        # one of the two is ever set.
        return obj.assignment_id is None

    def get_caregiver_name(self, obj):
        if obj.assignment_id is None:
            episodic = getattr(obj, "episodic_service", None)
            caregiver = getattr(episodic, "assigned_caregiver", None) if episodic else None
            if caregiver is None:
                return None
            identity = getattr(caregiver.user, "caregiver_identity_profile", None)
            return (identity.full_name if identity else None) or caregiver.user.username
        identity = getattr(obj.assignment.caregiver.user, "caregiver_identity_profile", None)
        return (identity.full_name if identity else None) or obj.assignment.caregiver.user.username

    def get_patient_name(self, obj):
        if obj.assignment_id is None:
            episodic = getattr(obj, "episodic_service", None)
            # "بیمار" doesn't quite apply to a one-off request with no
            # existing patient record — this is the recipient name
            # stored directly on EpisodicService instead (see its
            # model docstring for why there's no PatientProfile here).
            return episodic.recipient_full_name if episodic else None
        return obj.assignment.patient.full_name


class CreateInvoiceSerializer(serializers.Serializer):
    assignment_id = serializers.IntegerField()
    period_type = serializers.ChoiceField(choices=Invoice._meta.get_field("period_type").choices)
    period_start = JalaliDateField()
    period_end = JalaliDateField()
    due_date = JalaliDateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs["period_end"] < attrs["period_start"]:
            raise serializers.ValidationError("پایان دوره نمی‌تواند قبل از شروع دوره باشد.")
        return attrs


class UpdateInvoiceStatusSerializer(serializers.Serializer):
    """Only the manual statuses (draft->issued, or cancel) go through
    here — PARTIALLY_PAID/PAID are derived by Invoice.recompute_status()
    from actual Payment rows and are deliberately not settable through
    this endpoint, so the two paths can never contradict each other."""
    status = serializers.ChoiceField(choices=[("issued", ""), ("cancelled", "")])
