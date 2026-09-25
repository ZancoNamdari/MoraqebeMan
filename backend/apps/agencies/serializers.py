from rest_framework import serializers

from apps.families.models import RelationType
from apps.caregivers.models import CaregiverProfile

from .models import AgencyAdmin, AgencyCaregiverLink, AgencyFamilyLink, AgencyProfile, AgencySupervisor


class AgencyProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    access_code = serializers.CharField(read_only=True)
    isolation_mode = serializers.CharField(read_only=True)  # no real switching mechanism yet — see model docstring

    class Meta:
        model = AgencyProfile
        fields = ["id", "user_id", "access_code", "company_name", "license_number", "isolation_mode", "created_at"]
        read_only_fields = ["id", "user_id", "access_code", "isolation_mode", "created_at"]


class AgencyFamilyLinkSerializer(serializers.ModelSerializer):
    """One row in an agency's family roster, or its pending-requests
    list — status distinguishes the two, same convention as
    apps.families.FamilyPatientLinkSerializer."""
    family_display_name = serializers.CharField(source="family.display_name", read_only=True)
    family_phone_number = serializers.SerializerMethodField()

    class Meta:
        model = AgencyFamilyLink
        fields = ["id", "family", "family_display_name", "family_phone_number", "status", "requested_at", "decided_at"]
        read_only_fields = fields

    def get_family_phone_number(self, obj):
        return obj.family.user.phone_number if obj.family.user else None


class AgencyCaregiverLinkSerializer(serializers.ModelSerializer):
    caregiver_display_name = serializers.SerializerMethodField()
    caregiver_phone_number = serializers.SerializerMethodField()
    caregiver_status = serializers.CharField(source="caregiver.status", read_only=True)

    class Meta:
        model = AgencyCaregiverLink
        fields = [
            "id", "caregiver", "caregiver_display_name", "caregiver_phone_number", "caregiver_status",
            "status", "requested_at", "decided_at",
        ]
        read_only_fields = fields

    def get_caregiver_display_name(self, obj):
        user = obj.caregiver.user
        return f"{user.first_name} {user.last_name}".strip() or user.username

    def get_caregiver_phone_number(self, obj):
        return obj.caregiver.user.phone_number


class AgencyCaregiverPipelineSerializer(serializers.ModelSerializer):
    """
    Caregiver data for the agency-panel خدمت‌دهنده Kanban board —
    operates directly on CaregiverProfile (unlike
    AgencyCaregiverLinkSerializer above, which wraps AgencyCaregiverLink),
    since every field this board needs — the pipeline stage, the
    urgent flag, and each of the seven document-checklist items — is
    agency-operational data that lives on CaregiverProfile itself.
    """
    full_name = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)

    class Meta:
        model = CaregiverProfile
        fields = [
            "id", "full_name", "phone_number", "agency_pipeline_status", "is_urgent", "tags", "process_milestones",
            "doc_no_criminal_record", "doc_no_addiction_test", "doc_identity_verified",
            "doc_personal_photo", "doc_mental_health_test", "doc_promissory_note", "doc_id_card_received",
        ]
        read_only_fields = ["id", "full_name", "phone_number"]

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username


class JoinAgencyByCodeSerializer(serializers.Serializer):
    """Used by both a family and a caregiver to request joining an
    agency's roster using the agency's own access_code — always starts
    PENDING, needs the agency to approve from its dashboard (unlike
    the family/patient code flows, there's no side here that already
    has standing to auto-approve; the agency is always the approver)."""
    agency_code = serializers.CharField(max_length=20)

    def validate_agency_code(self, value):
        if not AgencyProfile.objects.filter(access_code=value.strip().upper()).exists():
            raise serializers.ValidationError("کد آژانس معتبر نیست.")
        return value.strip().upper()


class AgencyDashboardSerializer(serializers.Serializer):
    """Phase-1 basic dashboard — counts only. Real reporting/HR-style
    analytics (per architecture doc: monthly usage, per-caregiver
    reports) is explicitly a later phase (apps.finance/apps.analytics
    in the roadmap), built on top of these same two link tables."""
    company_name = serializers.CharField()
    access_code = serializers.CharField()
    approved_family_count = serializers.IntegerField()
    pending_family_requests = serializers.IntegerField()
    approved_caregiver_count = serializers.IntegerField()
    pending_caregiver_requests = serializers.IntegerField()
    open_complaints_count = serializers.IntegerField()
    pending_appeals_count = serializers.IntegerField()
    candidates_needing_docs_count = serializers.IntegerField()


class CreateAgencySerializer(serializers.Serializer):
    """
    Used by PlatformAgencyListCreateView — SUPERUSER-only, creates a
    real User(role=AGENCY) + AgencyProfile together, in one step.
    Before this, the only way to get a new agency onto the platform
    was the awkward two-step path of promoting some existing account
    to AGENCY (via superuser-panel's role management) and then
    waiting for that account to touch /api/agencies/me/ once to
    auto-create its own profile — no actual "onboard a new B2B
    customer" action existed anywhere. Same "creator enters someone
    else's info, no password field" convention as every other
    creation flow in this codebase.
    """
    company_name = serializers.CharField(max_length=200)
    license_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$",
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )
    email = serializers.EmailField(required=False, allow_blank=True)


class CreateAgencySupervisorSerializer(serializers.Serializer):
    """
    Same shape and reasoning as apps.caregivers.serializers's
    CreateCaregiverSerializer — no password field, since whoever is
    creating this account (the agency itself, or a superuser) is
    entering someone ELSE's information and shouldn't be inventing
    that person's login credentials. Username auto-generated, random
    password, phone-based reset later.
    """
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$",
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )
    email = serializers.EmailField(required=False, allow_blank=True)
    position = serializers.CharField(max_length=100, required=False, allow_blank=True)


class AgencySupervisorSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = AgencySupervisor
        fields = ["id", "user_id", "username", "full_name", "phone_number", "position", "created_by_username", "created_at"]
        read_only_fields = fields

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username


class CreateAgencyAdminSerializer(serializers.Serializer):
    """
    Same shape and reasoning as CreateAgencySupervisorSerializer —
    no password field, random one generated server-side. The one
    addition, supervisor_id, is load-bearing for the data-scoping
    rule: every admin reports to exactly one specific supervisor,
    chosen by the owner/manager at creation time, never afterward.
    """
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$",
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )
    email = serializers.EmailField(required=False, allow_blank=True)
    position = serializers.CharField(max_length=100, required=False, allow_blank=True)
    supervisor_id = serializers.IntegerField()


class AgencyAdminSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    supervisor_id = serializers.IntegerField(source="supervisor.id", read_only=True)
    supervisor_name = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)

    class Meta:
        model = AgencyAdmin
        fields = [
            "id", "user_id", "username", "full_name", "phone_number", "position",
            "supervisor_id", "supervisor_name", "created_by_username", "created_at",
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def get_supervisor_name(self, obj):
        return f"{obj.supervisor.user.first_name} {obj.supervisor.user.last_name}".strip() or obj.supervisor.user.username


class CreateFamilyForPatientSerializer(serializers.Serializer):
    """
    Used only in "with_family" mode of AgencyPatientListCreateView —
    same reasoning as CreateAgencySupervisorSerializer above: no
    password field, since the agency/supervisor entering this is
    filling in someone ELSE's information, not their own.
    """
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$",
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )
    relation = serializers.ChoiceField(choices=RelationType.choices)
