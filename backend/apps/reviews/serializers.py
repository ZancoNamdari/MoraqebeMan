from rest_framework import serializers

from apps.care.models import AssignmentStatus, CaregiverAssignment
from apps.families.models import FamilyPatientLink, LinkStatus
from .models import MAX_VOICE_NOTE_SIZE_BYTES, CaregiverNoteAboutPatient, Complaint


class CreateComplaintSerializer(serializers.ModelSerializer):
    """
    Used by a family member filing a new complaint. patient is
    required (a complaint about "a caregiver" with no patient context
    is much harder to investigate); about_caregiver is optional since
    a family member filing this may not always know or remember which
    specific caregiver they mean, especially through a translated/
    assisted UI.
    """
    class Meta:
        model = Complaint
        fields = ["patient", "about_caregiver", "category", "description", "voice_note"]

    def validate_voice_note(self, value):
        if value and value.size > MAX_VOICE_NOTE_SIZE_BYTES:
            raise serializers.ValidationError(
                f"حجم فایل صوتی نباید بیشتر از {MAX_VOICE_NOTE_SIZE_BYTES // (1024*1024)} مگابایت باشد."
            )
        return value

    def validate_patient(self, patient):
        # A family member can only file a complaint about a patient
        # they actually have an approved link to — otherwise anyone
        # could file a complaint naming any random patient in the
        # system, with no real connection to them at all.
        request = self.context["request"]
        is_linked = FamilyPatientLink.objects.filter(
            family__user=request.user, patient=patient, status=LinkStatus.APPROVED,
        ).exists()
        if not is_linked:
            raise serializers.ValidationError("شما به این سالمند دسترسی تأییدشده ندارید.")
        return patient


class ComplaintListItemSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True, default=None)
    caregiver_name = serializers.SerializerMethodField()
    filed_by_phone = serializers.CharField(source="filed_by.phone_number", read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id", "category", "status", "patient_name", "caregiver_name",
            "filed_by_phone", "created_at",
        ]

    def get_caregiver_name(self, obj):
        if obj.about_caregiver is None:
            return None
        identity = getattr(obj.about_caregiver.user, "caregiver_identity_profile", None)
        return (identity.full_name if identity else None) or obj.about_caregiver.user.username


class ComplaintDetailSerializer(ComplaintListItemSerializer):
    class Meta(ComplaintListItemSerializer.Meta):
        fields = ComplaintListItemSerializer.Meta.fields + [
            "description", "voice_note", "resolution_note", "resolved_at", "updated_at",
        ]


class ResolveComplaintSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class CreatePatientNoteSerializer(serializers.ModelSerializer):
    """
    Used by a caregiver leaving a note about a patient. Validated the
    same way Complaint validates its own patient field — a real
    connection required, not any patient in the system by ID.
    Deliberately permissive on WHICH assignment status counts (active
    or ended): a caregiver reflecting after a handoff is a legitimate
    case too, not just ongoing care.
    """
    class Meta:
        model = CaregiverNoteAboutPatient
        fields = ["patient", "category", "note", "flagged_urgent"]

    def validate_patient(self, patient):
        request = self.context["request"]
        has_assignment = CaregiverAssignment.objects.filter(
            caregiver__user=request.user, patient=patient,
        ).exists()
        if not has_assignment:
            raise serializers.ValidationError("شما تاکنون به این سالمند تخصیص نداشته‌اید.")
        return patient


class PatientNoteListItemSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True, default=None)
    caregiver_name = serializers.SerializerMethodField()

    class Meta:
        model = CaregiverNoteAboutPatient
        fields = [
            "id", "category", "flagged_urgent", "patient_name", "caregiver_name",
            "acknowledged_at", "created_at",
        ]

    def get_caregiver_name(self, obj):
        identity = getattr(obj.caregiver.user, "caregiver_identity_profile", None)
        return (identity.full_name if identity else None) or obj.caregiver.user.username


class PatientNoteDetailSerializer(PatientNoteListItemSerializer):
    class Meta(PatientNoteListItemSerializer.Meta):
        fields = PatientNoteListItemSerializer.Meta.fields + ["note", "updated_at"]
