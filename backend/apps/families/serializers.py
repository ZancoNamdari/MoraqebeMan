from rest_framework import serializers

from apps.accounts.jalali_fields import JalaliDateField

from .models import (
    FamilyProfile,
    GuardianshipStatus,
    PatientCompatibilityQuestionnaire,
    PatientProfile,
)


class FamilyProfileSerializer(serializers.ModelSerializer):
    # The model field is `user` (a real FK) now, not `user_id` — this
    # keeps the API's JSON shape exactly as it was (a plain integer
    # under "user_id"), not a nested user object, so nothing consuming
    # this endpoint needs to change alongside the model.
    user_id = serializers.IntegerField(read_only=True)
    # province/city are real FKs now (write: send the id) — these two
    # are read-only conveniences so a family's location can be
    # displayed without a separate fetch, same pattern already
    # established for apps.caregivers.CaregiverServiceAreaSerializer.
    province_name = serializers.CharField(source="province.name", read_only=True, default=None)
    city_name = serializers.CharField(source="city.name", read_only=True, default=None)

    class Meta:
        model = FamilyProfile
        fields = ["id", "user_id", "display_name", "province", "city", "province_name", "city_name", "address", "created_at"]
        read_only_fields = ["id", "user_id", "created_at"]


class PatientProfileSerializer(serializers.ModelSerializer):
    birth_date = JalaliDateField(required=False, allow_null=True)
    # Same reasoning as FamilyProfileSerializer.user_id — keep the JSON
    # shape stable as a plain (possibly null) integer.
    user_id = serializers.IntegerField(read_only=True, allow_null=True)
    province_name = serializers.CharField(source="province.name", read_only=True, default=None)
    city_name = serializers.CharField(source="city.name", read_only=True, default=None)
    district_name = serializers.CharField(source="district.name", read_only=True, default=None)

    class Meta:
        model = PatientProfile
        fields = [
            "id", "user_id", "full_name", "father_name", "birth_date",
            "national_id", "birth_certificate_number", "birth_certificate_issue_place",
            "full_address", "province", "city", "district", "province_name", "city_name", "district_name",
            "postal_code", "emergency_contact_phone",
            "guardianship_status", "guardian_details",
            "language_dialect", "basic_medical_info",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "user_id", "created_at", "updated_at"]

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
    endpoint where relation/patient_user_id are also accepted."""
    relation = serializers.CharField(max_length=50)
    patient_user_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta(PatientProfileSerializer.Meta):
        fields = PatientProfileSerializer.Meta.fields + ["relation", "patient_user_id"]


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
