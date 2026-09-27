from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User, UserRole


class UserSerializer(serializers.ModelSerializer):
    # Which agency this account belongs to — null for every role
    # that isn't tied to one (family, patient, caregiver, admin,
    # superuser). Added specifically so supervisor-panel (and
    # agency-panel) can show "شما سوپروایزر آژانس X هستید" right in
    # the header after login — MeView/UserSerializer is shared
    # across every panel, so this stays a no-op elsewhere rather than
    # a per-panel serializer.
    agency_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "national_id",
            "email",
            "phone_number",
            "role",
            "is_phone_verified",
            "agency_name",
        ]
        read_only_fields = fields

    def get_agency_name(self, obj):
        if obj.role == UserRole.AGENCY:
            profile = getattr(obj, "agency_profile", None)
            return profile.company_name if profile else None
        if obj.role == UserRole.AGENCY_ADMIN:
            profile = getattr(obj, "agency_admin_profile", None)
            return profile.agency.company_name if profile else None
        if obj.role == UserRole.AGENCY_SUPERVISOR:
            profile = getattr(obj, "agency_supervisor_profile", None)
            return profile.agency.company_name if profile else None
        return None


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "phone_number",
        ]

    def validate_phone_number(self, value):
        user = self.instance

        if User.objects.filter(phone_number=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError(
                "این شماره موبایل قبلاً استفاده شده است."
            )

        return value

    def update(self, instance, validated_data):
        phone_changed = (
            "phone_number" in validated_data
            and validated_data["phone_number"] != instance.phone_number
        )

        for field, value in validated_data.items():
            setattr(instance, field, value)

        if phone_changed:
            instance.is_phone_verified = False

        instance.save()

        return instance


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_current_password(self, value):
        user = self.context["request"].user

        if not user.check_password(value):
            raise serializers.ValidationError(
                "رمز عبور فعلی نادرست است."
            )

        return value

    def validate_new_password(self, value):
        validate_password(
            value,
            self.context["request"].user,
        )
        return value

    def validate(self, attrs):
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {
                    "new_password": "رمز عبور جدید باید با رمز فعلی متفاوت باشد."
                }
            )

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user
