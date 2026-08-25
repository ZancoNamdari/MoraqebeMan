from rest_framework import serializers

from apps.accounts.jalali_fields import JalaliDateField

from .models import (
    AccessLevel,
    FamilyPatientLink,
    FamilyProfile,
    GuardianshipStatus,
    PatientCompatibilityQuestionnaire,
    PatientProfile,
    RelationType,
)


class FamilyProfileSerializer(serializers.ModelSerializer):
    # The model field is `user` (a real FK) now, not `user_id` — this
    # keeps the API's JSON shape exactly as it was (a plain integer
    # under "user_id"), not a nested user object, so nothing consuming
    # this endpoint needs to change alongside the model.
    user_id = serializers.IntegerField(read_only=True)
    access_code = serializers.CharField(read_only=True)
    province_name = serializers.CharField(source="province.name", read_only=True, default=None)
    city_name = serializers.CharField(source="city.name", read_only=True, default=None)

    class Meta:
        model = FamilyProfile
        fields = ["id", "user_id", "access_code", "display_name", "province", "city", "province_name", "city_name", "address", "created_at"]
        read_only_fields = ["id", "user_id", "access_code", "created_at"]


class PatientProfileSerializer(serializers.ModelSerializer):
    birth_date = JalaliDateField(required=False, allow_null=True)
    # Same reasoning as FamilyProfileSerializer.user_id — keep the JSON
    # shape stable as a plain (possibly null) integer.
    user_id = serializers.IntegerField(read_only=True, allow_null=True)
    access_code = serializers.CharField(read_only=True)
    province_name = serializers.CharField(source="province.name", read_only=True, default=None)
    city_name = serializers.CharField(source="city.name", read_only=True, default=None)
    district_name = serializers.CharField(source="district.name", read_only=True, default=None)

    class Meta:
        model = PatientProfile
        fields = [
            "id", "user_id", "access_code", "full_name", "gender", "father_name", "birth_date",
            "national_id", "birth_certificate_number", "birth_certificate_issue_place",
            "full_address", "province", "city", "district", "province_name", "city_name", "district_name",
            "postal_code", "emergency_contact_phone",
            "guardianship_status", "guardian_details",
            "language_dialect", "basic_medical_info",
            "physical_condition", "needed_shifts",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "user_id", "access_code", "created_at", "updated_at"]

    def validate(self, attrs):
        # "آیا وصی یا قیم قانونی دارد؟" — if the answer is yes, the form
        # implies there should be identifying info for that guardian, not
        # just a status flag with nothing behind it.
        status = attrs.get("guardianship_status", getattr(self.instance, "guardianship_status", GuardianshipStatus.NONE))
        details = attrs.get("guardian_details", getattr(self.instance, "guardian_details", ""))
        if status != GuardianshipStatus.NONE and not details:
            raise serializers.ValidationError({
                "guardian_details": "در صورت داشتن وصی یا قیم قانونی، اطلاعات ایشان الزامی است."
            })
        return attrs


class AddPatientSerializer(PatientProfileSerializer):
    """Same shape as PatientProfileSerializer, used for the creation
    endpoint where relation is also accepted — the creating family
    account is automatically linked as an APPROVED family member (they
    just did the work of registering this patient; no reason to make
    them separately request access to a record they created)."""
    relation = serializers.ChoiceField(choices=RelationType.choices)

    class Meta(PatientProfileSerializer.Meta):
        fields = PatientProfileSerializer.Meta.fields + ["relation"]


class PatientCompatibilityQuestionnaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientCompatibilityQuestionnaire
        fields = [
            "religious_beliefs_priority", "new_treatment_openness",
            "caregiver_as_family_member", "respectful_disagreement_acceptance",
            "privacy_comfort_with_caregiver",
            "noise_smell_sensitivity", "meal_time_strictness", "special_diet_preference",
            "medication_timing_priority",
            "accent_customs_annoyance", "cultural_respect_expectation",
            "willingness_to_express_opinion",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class FamilyPatientLinkSerializer(serializers.ModelSerializer):
    """One row in a patient's "who has access" list, or in a pending
    "who's asking for access" list — status distinguishes the two."""
    family_display_name = serializers.CharField(source="family.display_name", read_only=True)
    family_phone_number = serializers.SerializerMethodField()
    patient_full_name = serializers.CharField(source="patient.full_name", read_only=True)

    class Meta:
        model = FamilyPatientLink
        fields = [
            "id", "family", "family_display_name", "family_phone_number", "patient", "patient_full_name",
            "relation", "is_primary_contact", "status", "access_level", "approved_at", "created_at",
        ]
        read_only_fields = [
            "id", "family", "family_display_name", "family_phone_number", "patient", "patient_full_name",
            "status", "approved_at", "created_at",
        ]

    def get_family_phone_number(self, obj):
        return obj.family.user.phone_number if obj.family.user else None


class RequestPatientAccessSerializer(serializers.Serializer):
    """A family member requesting access to a patient using the
    patient's access code — creates a PENDING link, needs approval
    from the patient (if they have their own account) or an already-
    approved family member."""
    patient_code = serializers.CharField(max_length=20)
    relation = serializers.ChoiceField(choices=RelationType.choices)

    def validate_patient_code(self, value):
        if not PatientProfile.objects.filter(access_code=value.strip().upper()).exists():
            raise serializers.ValidationError("کد بیمار معتبر نیست.")
        return value.strip().upper()


class InviteFamilyByCodeSerializer(serializers.Serializer):
    """The patient side inviting a family member using THAT family
    member's access code — approved immediately, since whoever holds
    the patient's own authority (the patient, or an already-approved
    family member) already has standing to grant it, without a second
    round of approval."""
    family_code = serializers.CharField(max_length=20)
    relation = serializers.ChoiceField(choices=RelationType.choices)
    access_level = serializers.ChoiceField(choices=AccessLevel.choices, required=False, default=AccessLevel.FULL)

    def validate_family_code(self, value):
        if not FamilyProfile.objects.filter(access_code=value.strip().upper()).exists():
            raise serializers.ValidationError("کد عضو خانواده معتبر نیست.")
        return value.strip().upper()


class UpdateFamilyLinkSerializer(serializers.Serializer):
    """PATCH payload for changing a family member's relation label,
    access level, and/or handing off primary-contact status."""
    relation = serializers.ChoiceField(choices=RelationType.choices, required=False)
    is_primary_contact = serializers.BooleanField(required=False)
    access_level = serializers.ChoiceField(choices=AccessLevel.choices, required=False)
