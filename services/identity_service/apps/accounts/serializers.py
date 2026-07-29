from rest_framework import serializers

from .models import Gender, IdentityProfile, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "phone_number", "role", "is_phone_verified"]
        read_only_fields = fields


class IdentityProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = IdentityProfile
        fields = [
            "father_name", "birth_certificate_number", "birth_certificate_issue_place",
            "birth_date", "gender", "marital_status", "children_count", "military_status",
            "height_range", "weight_range", "ethnicities",
            "has_chronic_disease", "chronic_disease_types",
            "takes_permanent_medication", "medication_types",
            "emergency_contact_phone", "emergency_contact_relation", "landline_phone",
            "province", "city", "district", "postal_code", "full_address",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        # These conditional rules come straight from "قوانین فرم" in the
        # source form — enforcing them server-side too, not just hiding
        # fields in the frontend, since the API must not trust the client
        # to have applied the form's own conditional-display logic.
        gender = attrs.get("gender", getattr(self.instance, "gender", None))
        military_status = attrs.get("military_status", getattr(self.instance, "military_status", None))
        if gender == Gender.FEMALE and military_status:
            raise serializers.ValidationError({
                "military_status": "وضعیت نظام وظیفه فقط برای جنسیت مرد قابل ثبت است."
            })

        has_chronic_disease = attrs.get("has_chronic_disease", getattr(self.instance, "has_chronic_disease", None))
        chronic_disease_types = attrs.get("chronic_disease_types", getattr(self.instance, "chronic_disease_types", None))
        if has_chronic_disease and not chronic_disease_types:
            raise serializers.ValidationError({
                "chronic_disease_types": "در صورت داشتن بیماری زمینه‌ای، نوع بیماری الزامی است."
            })

        takes_medication = attrs.get("takes_permanent_medication", getattr(self.instance, "takes_permanent_medication", None))
        medication_types = attrs.get("medication_types", getattr(self.instance, "medication_types", None))
        if takes_medication and not medication_types:
            raise serializers.ValidationError({
                "medication_types": "در صورت مصرف داروی دائمی، نوع دارو الزامی است."
            })

        return attrs
