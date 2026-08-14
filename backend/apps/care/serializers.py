from rest_framework import serializers

from .models import CareLogEntry, CaregiverAssignment, CaregiverReview


class CaregiverAssignmentSerializer(serializers.ModelSerializer):
    caregiver_name = serializers.SerializerMethodField()
    caregiver_gender = serializers.SerializerMethodField()
    caregiver_avg_rating = serializers.SerializerMethodField()
    caregiver_review_count = serializers.SerializerMethodField()
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_gender = serializers.CharField(source="patient.gender", read_only=True)
    patient_code = serializers.CharField(source="patient.access_code", read_only=True)
    assigned_by_username = serializers.CharField(source="assigned_by.username", read_only=True, default=None)

    class Meta:
        model = CaregiverAssignment
        fields = [
            "id", "caregiver", "caregiver_name", "caregiver_gender", "caregiver_avg_rating", "caregiver_review_count",
            "patient", "patient_name", "patient_gender", "patient_code",
            "assigned_by", "assigned_by_username", "status", "notes", "assigned_at", "ended_at",
        ]
        read_only_fields = [
            "id", "caregiver_name", "caregiver_gender", "caregiver_avg_rating", "caregiver_review_count",
            "patient_name", "patient_gender", "patient_code", "assigned_by", "assigned_by_username", "status", "assigned_at", "ended_at",
        ]

    def get_caregiver_name(self, obj):
        identity = getattr(obj.caregiver.user, "caregiver_identity_profile", None)
        return (identity.full_name if identity else None) or obj.caregiver.user.username

    def get_caregiver_gender(self, obj):
        identity = getattr(obj.caregiver.user, "caregiver_identity_profile", None)
        return identity.gender if identity else ""

    def get_caregiver_avg_rating(self, obj):
        from django.db.models import Avg
        result = CaregiverReview.objects.filter(caregiver=obj.caregiver).aggregate(avg=Avg("rating"))
        return round(result["avg"], 1) if result["avg"] is not None else None

    def get_caregiver_review_count(self, obj):
        return CaregiverReview.objects.filter(caregiver=obj.caregiver).count()


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


class CaregiverReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = CaregiverReview
        fields = ["id", "assignment", "caregiver", "patient", "reviewer", "reviewer_name", "rating", "comment", "created_at"]
        read_only_fields = ["id", "assignment", "caregiver", "patient", "reviewer", "reviewer_name", "created_at"]

    def get_reviewer_name(self, obj):
        if obj.reviewer is None:
            return None
        family = getattr(obj.reviewer, "family_profile", None)
        if family:
            return family.display_name
        patient = getattr(obj.reviewer, "patient_profile", None)
        if patient:
            return patient.full_name
        return obj.reviewer.username


class CreateReviewSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, default="")
