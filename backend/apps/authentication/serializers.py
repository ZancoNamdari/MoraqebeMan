from rest_framework import serializers

from apps.accounts.models import UserRole


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    # Optional override — most people won't send this at all, and
    # User.generate_username() builds one from first_name/last_name
    # automatically. Kept available for anyone who wants to pick their
    # own (e.g. an agency onboarding staff members in bulk).
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    # Optional now that OTP login exists — a family/patient account
    # never needs to know or type a password at all if they always
    # sign in by phone + SMS code. Still accepted for anyone who wants
    # a traditional password (e.g. an agency staff account); left
    # blank, a random one is generated server-side, same as how a
    # supervisor-created caregiver account already works.
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$",
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    # Public self-registration is limited to non-privileged roles.
    # AGENCY is a paying B2B account (contracts, billing, and the
    # ability to approve/reject other people's join requests) — it
    # must be created deliberately (Django admin, or a future
    # supervisor-facing flow), never through this open endpoint.
    # SUPERUSER/ADMIN accounts are created via the admin panel or
    # createsuperuser, never through this open endpoint either.
    role = serializers.ChoiceField(
        choices=[
            (UserRole.FAMILY, UserRole.FAMILY.label),
            (UserRole.PATIENT, UserRole.PATIENT.label),
            (UserRole.CAREGIVER, UserRole.CAREGIVER.label),
        ],
        default=UserRole.FAMILY,
    )


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class OTPLoginRequestSerializer(serializers.Serializer):
    """Passwordless login, step 1 — phone number only, no username or
    password needed at all. Deliberately doesn't reveal whether the
    phone number is actually registered (same enumeration-protection
    reasoning as password reset) — the view always responds success."""
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$",
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )


class OTPLoginVerifySerializer(serializers.Serializer):
    """Passwordless login, step 2 — the 6-digit code from the SMS."""
    phone_number = serializers.RegexField(regex=r"^09\d{9}$")
    code = serializers.RegexField(regex=r"^\d{6}$", error_messages={"invalid": "کد تأیید باید ۶ رقم باشد."})


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
