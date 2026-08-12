from rest_framework import serializers

from .models import CareLogEntry, CaregiverAssignment


class CaregiverAssignmentSerializer(serializers.ModelSerializer):
    caregiver_name = serializers.SerializerMethodField()
    caregiver_gender = serializers.SerializerMethodField()
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_gender = serializers.CharField(source="patient.gender", read_only=True)
    patient_code = serializers.CharField(source="patient.access_code", read_only=True)
    assigned_by_username = serializers.CharField(source="assigned_by.username", read_only=True, default=None)

    class Meta:
        model = CaregiverAssignment
        fields = [
            "id", "caregiver", "caregiver_name", "caregiver_gender", "patient", "patient_name", "patient_gender", "patient_code",
            "assigned_by", "assigned_by_username", "status", "notes", "assigned_at", "ended_at",
        ]
        read_only_fields = ["id", "caregiver_name", "caregiver_gender", "patient_name", "patient_gender", "patient_code", "assigned_by", "assigned_by_username", "status", "assigned_at", "ended_at"]

    def get_caregiver_name(self, obj):
        identity = getattr(obj.caregiver.user, "caregiver_identity_profile", None)
        return (identity.full_name if identity else None) or obj.caregiver.user.username

    def get_caregiver_gender(self, obj):
        identity = getattr(obj.caregiver.user, "caregiver_identity_profile", None)
        return identity.gender if identity else ""


class CreateAssignmentSerializer(serializers.Serializer):
    """A supervisor creating a new assignment — identifies the
    caregiver by their account id (how supervisor-panel already refers
    to caregivers) and the patient by their access code (the same
    identification scheme used everywhere else in apps.families now),
    bridging the two systems' existing conventions rather than
    inventing a third."""
    caregiver_user_id = serializers.IntegerField()
    patient_code = serializers.CharField(max_length=20)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class CareLogEntrySerializer(serializers.ModelSerializer):
    caregiver_name = serializers.SerializerMethodField()
    caregiver_gender = serializers.SerializerMethodField()

    class Meta:
        model = CareLogEntry
        fields = ["id", "assignment", "caregiver", "caregiver_name", "caregiver_gender", "patient", "category", "note", "created_at"]
        read_only_fields = ["id", "assignment", "caregiver", "caregiver_name", "caregiver_gender", "patient", "created_at"]

    def get_caregiver_name(self, obj):
        identity = getattr(obj.caregiver.user, "caregiver_identity_profile", None)
        return (identity.full_name if identity else None) or obj.caregiver.user.username

    def get_caregiver_gender(self, obj):
        identity = getattr(obj.caregiver.user, "caregiver_identity_profile", None)
        return identity.gender if identity else ""


class CreateCareLogEntrySerializer(serializers.Serializer):
    """A caregiver submitting a report — identifies which patient by
    the patient's own id (the caregiver already sees this from their
    own assigned-patients list, no code lookup needed here — unlike
    the supervisor assigning a caregiver, who has no existing UI
    listing patients)."""
    patient = serializers.IntegerField()
    category = serializers.ChoiceField(choices=CareLogEntry._meta.get_field("category").choices)
    note = serializers.CharField()
