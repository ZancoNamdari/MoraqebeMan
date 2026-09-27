from rest_framework import serializers

from apps.accounts.jalali_fields import JalaliDateField, JalaliDateTimeField
from apps.finance.models import Payment
from apps.reminders.services import compute_active_reminders

from .models import EpisodicService


class ActiveReminderSerializer(serializers.Serializer):
    label = serializers.CharField()
    color = serializers.CharField()
    days_elapsed = serializers.IntegerField()


class EpisodicServiceSerializer(serializers.ModelSerializer):
    stage_display = serializers.CharField(source="get_stage_display", read_only=True)
    assigned_caregiver_name = serializers.SerializerMethodField()
    invoice_amount = serializers.DecimalField(source="invoice.amount", max_digits=12, decimal_places=0, read_only=True, default=None)
    invoice_status = serializers.CharField(source="invoice.status", read_only=True, default=None)
    invoice_status_display = serializers.CharField(source="invoice.get_status_display", read_only=True, default=None)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)
    phone_coordination_at = JalaliDateTimeField(read_only=True)
    dispatched_at = JalaliDateTimeField(read_only=True)
    settled_at = JalaliDateTimeField(read_only=True)
    followup_at = JalaliDateTimeField(read_only=True)
    created_at = JalaliDateTimeField(read_only=True)
    active_reminders = serializers.SerializerMethodField()

    class Meta:
        model = EpisodicService
        fields = [
            "id", "recipient_full_name", "recipient_phone_number", "notes",
            "stage", "stage_display", "assigned_caregiver", "assigned_caregiver_name",
            "phone_coordination_at", "dispatched_at", "settled_at", "followup_at",
            "invoice", "invoice_amount", "invoice_status", "invoice_status_display",
            "active_reminders", "created_by_username", "created_at",
        ]
        read_only_fields = [
            "id", "stage_display", "assigned_caregiver", "assigned_caregiver_name",
            "phone_coordination_at", "dispatched_at", "settled_at", "followup_at",
            "invoice", "invoice_amount", "invoice_status", "invoice_status_display",
            "active_reminders", "created_by_username", "created_at",
        ]

    def get_assigned_caregiver_name(self, obj):
        if obj.assigned_caregiver_id is None:
            return None
        identity = getattr(obj.assigned_caregiver.user, "caregiver_identity_profile", None)
        return (identity.full_name if identity else None) or obj.assigned_caregiver.user.username

    def get_active_reminders(self, obj):
        # `rules` is passed once per request via the view (list or
        # detail), not re-queried per row — see views.py.
        rules = self.context.get("rules") or []
        return compute_active_reminders("episodic_services", obj, rules)


class CreateEpisodicServiceSerializer(serializers.Serializer):
    recipient_full_name = serializers.CharField(max_length=150)
    recipient_phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class UpdateEpisodicServiceStageSerializer(serializers.Serializer):
    """
    PATCH payload for moving a card between stages. assigned_caregiver_id
    only makes sense alongside a move into "dispatched" (who's being
    sent), and amount/method/paid_at only alongside a move into
    "settled" (creates the real Invoice + Payment — see the view) — both
    are optional here and validated contextually in the view instead of
    being force-required by stage, since an agency may also just update
    the caregiver on an already-dispatched card without changing stage.
    """
    stage = serializers.ChoiceField(choices=EpisodicService._meta.get_field("stage").choices, required=False)
    assigned_caregiver_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=0, required=False, min_value=0)
    method = serializers.ChoiceField(choices=Payment._meta.get_field("method").choices, required=False)
    paid_at = JalaliDateField(required=False)
