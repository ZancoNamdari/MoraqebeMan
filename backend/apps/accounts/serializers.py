from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
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
        ]
        read_only_fields = fields


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
