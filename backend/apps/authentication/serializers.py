from rest_framework import serializers

from apps.accounts.models import UserRole


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$",
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )
    email = serializers.EmailField()
    # Public self-registration is limited to non-privileged roles.
    # SUPERUSER/ADMIN accounts are created via the admin panel or
    # createsuperuser, never through this open endpoint.
    role = serializers.ChoiceField(
        choices=[
            (UserRole.FAMILY, UserRole.FAMILY.label),
            (UserRole.PATIENT, UserRole.PATIENT.label),
            (UserRole.CAREGIVER, UserRole.CAREGIVER.label),
            (UserRole.AGENCY, UserRole.AGENCY.label),
        ],
        default=UserRole.FAMILY,
    )


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class VerifyOTPSerializer(serializers.Serializer):
    code = serializers.RegexField(regex=r"^\d{6}$", error_messages={"invalid": "کد تأیید باید ۶ رقم باشد."})


class PasswordResetRequestSerializer(serializers.Serializer):
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$",
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )


class PasswordResetConfirmSerializer(serializers.Serializer):
    phone_number = serializers.RegexField(regex=r"^09\d{9}$")
    token = serializers.CharField(max_length=64)
    new_password = serializers.CharField(write_only=True, min_length=8)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
