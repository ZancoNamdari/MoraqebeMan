from rest_framework import serializers

from apps.accounts.jalali_fields import JalaliDateField
from apps.families.models import RelationType
from apps.caregivers.choices import EducationLevel, Gender
from apps.caregivers.models import CaregiverDocumentType, CaregiverProfile
from apps.caregivers.serializers import CaregiverDocumentUploadSerializer
from apps.reminders.services import compute_active_reminders

from .models import AgencyAdmin, AgencyCaregiverLink, AgencyFamilyLink, AgencyPipelineStage, AgencyProfile, AgencySupervisor


class AgencyPipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgencyPipelineStage
        fields = ["id", "pipeline_type", "value", "label", "order"]
        read_only_fields = ["id", "value", "order"]


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
    active_reminders = serializers.SerializerMethodField()
    # Distinct from "id" above (that's CaregiverProfile.pk) — the
    # supervisor-panel wizard's URLs and every /api/supervisor/caregivers/
    # sub-endpoint are keyed by the platform User's own id, not the
    # profile's, so the frontend needs this to build a working deep
    # link into that panel (e.g. /caregivers/new?id=<user_id>).
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    # Per-document upload/review detail behind each doc_* boolean
    # (file, status, who uploaded/reviewed it, rejection reason) — the
    # booleans above stay as the fast-read summary already used by the
    # Kanban badge/reminder rules, this adds what the checklist
    # drawer's upload UI needs to actually show and act on.
    documents = serializers.SerializerMethodField()
    # Every OTHER phone number on file for this caregiver besides
    # their own login number (already in `phone_number` above) — the
    # onboarding IdentityProfile's emergency/landline numbers (if that
    # profile exists yet) plus their reference contacts. Read-only:
    # these all come from the caregiver's own onboarding data, not
    # something the agency panel edits.
    extra_contacts = serializers.SerializerMethodField()
    contract_start_date = JalaliDateField(required=False, allow_null=True)
    contract_end_date = JalaliDateField(required=False, allow_null=True)
    # Drives whether agency-panel's checklist drawer shows the extra
    # "مدارک اقامت اتباع" row at all — Iranian caregivers keep the
    # original 7-item checklist.
    is_non_iranian_national = serializers.SerializerMethodField()

    class Meta:
        model = CaregiverProfile
        fields = [
            "id", "user_id", "full_name", "phone_number", "extra_contacts", "agency_pipeline_status", "is_urgent", "tags", "process_milestones",
            "service_types", "service_subtypes", "is_non_iranian_national",
            "doc_no_criminal_record", "doc_no_addiction_test", "doc_identity_verified",
            "doc_personal_photo", "doc_mental_health_test", "doc_promissory_note", "doc_id_card_received",
            "doc_residency_documents",
            "documents", "active_reminders", "staff_notes", "contract_start_date", "contract_end_date",
        ]
        read_only_fields = ["id", "user_id", "full_name", "phone_number", "extra_contacts", "documents", "active_reminders", "is_non_iranian_national"]

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def get_is_non_iranian_national(self, obj):
        identity = getattr(obj.user, "caregiver_identity_profile", None)
        return bool(identity and identity.is_non_iranian_national)

    def get_extra_contacts(self, obj):
        contacts = []
        identity = getattr(obj.user, "caregiver_identity_profile", None)
        if identity is not None:
            if identity.emergency_contact_phone:
                label = "تماس اضطراری"
                if identity.emergency_contact_relation:
                    label = f"تماس اضطراری ({identity.emergency_contact_relation})"
                contacts.append({"label": label, "phone": identity.emergency_contact_phone})
            if identity.landline_phone:
                contacts.append({"label": "تلفن ثابت", "phone": identity.landline_phone})
        for ref in obj.references.all():
            if ref.phone_number:
                contacts.append({"label": f"معرف: {ref.full_name}", "phone": ref.phone_number})
        return contacts

    def get_documents(self, obj):
        uploads_by_type = {upload.document_type: upload for upload in obj.document_uploads.all()}
        return {
            document_type: CaregiverDocumentUploadSerializer(uploads_by_type[document_type]).data
            if document_type in uploads_by_type else None
            for document_type in CaregiverDocumentType.values
        }

    def get_active_reminders(self, obj):
        # `rules` is passed once per request via the view (list or
        # detail) as this serializer's context — see
        # apps.agencies.views.AgencyCaregiverPipelineListView /
        # AgencyCaregiverPipelineUpdateView.
        rules = self.context.get("rules") or []
        return compute_active_reminders("caregiver_candidates", obj, rules)


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
    pending_registration_reviews = serializers.IntegerField(required=False, default=0)
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
    gender = serializers.ChoiceField(choices=Gender.choices, required=False, allow_null=True)
    birth_date = JalaliDateField(required=False, allow_null=True)
    city_id = serializers.IntegerField(required=False, allow_null=True)
    education_level = serializers.ChoiceField(choices=EducationLevel.choices, required=False, allow_null=True)


class UpdateAgencySupervisorSerializer(serializers.Serializer):
    """
    PATCH payload for editing an existing supervisor — every field is
    optional so the client only sends what actually changed.
    """
    first_name = serializers.CharField(max_length=50, required=False)
    last_name = serializers.CharField(max_length=50, required=False)
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$", required=False,
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )
    position = serializers.CharField(max_length=100, required=False, allow_blank=True)
    gender = serializers.ChoiceField(choices=Gender.choices, required=False, allow_null=True)
    birth_date = JalaliDateField(required=False, allow_null=True)
    city_id = serializers.IntegerField(required=False, allow_null=True)
    education_level = serializers.ChoiceField(choices=EducationLevel.choices, required=False, allow_null=True)


class AgencySupervisorSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)
    city_name = serializers.CharField(source="city.name", read_only=True, default=None)
    birth_date = JalaliDateField(read_only=True)

    class Meta:
        model = AgencySupervisor
        fields = [
            "id", "user_id", "username", "full_name", "phone_number", "position", "created_by_username", "created_at",
            "gender", "birth_date", "city_name", "education_level",
        ]
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
    gender = serializers.ChoiceField(choices=Gender.choices, required=False, allow_null=True)
    birth_date = JalaliDateField(required=False, allow_null=True)
    city_id = serializers.IntegerField(required=False, allow_null=True)
    education_level = serializers.ChoiceField(choices=EducationLevel.choices, required=False, allow_null=True)


class UpdateAgencyAdminSerializer(serializers.Serializer):
    """
    Same reasoning as UpdateAgencySupervisorSerializer above — every
    field optional. supervisor_id, when present, reassigns which
    supervisor this admin reports to (validated in the view against
    this same agency's own supervisor roster).
    """
    first_name = serializers.CharField(max_length=50, required=False)
    last_name = serializers.CharField(max_length=50, required=False)
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$", required=False,
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )
    position = serializers.CharField(max_length=100, required=False, allow_blank=True)
    supervisor_id = serializers.IntegerField(required=False)
    gender = serializers.ChoiceField(choices=Gender.choices, required=False, allow_null=True)
    birth_date = JalaliDateField(required=False, allow_null=True)
    city_id = serializers.IntegerField(required=False, allow_null=True)
    education_level = serializers.ChoiceField(choices=EducationLevel.choices, required=False, allow_null=True)


class AgencyAdminSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    supervisor_id = serializers.IntegerField(source="supervisor.id", read_only=True)
    supervisor_name = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)
    city_name = serializers.CharField(source="city.name", read_only=True, default=None)
    birth_date = JalaliDateField(read_only=True)

    class Meta:
        model = AgencyAdmin
        fields = [
            "id", "user_id", "username", "full_name", "phone_number", "position",
            "supervisor_id", "supervisor_name", "created_by_username", "created_at",
            "gender", "birth_date", "city_name", "education_level",
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
