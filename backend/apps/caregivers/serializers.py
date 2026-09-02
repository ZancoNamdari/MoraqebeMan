from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.jalali_fields import JalaliDateField

from .choices import (AcceptedPhysicalCondition, AcceptedAgeRange, CollaborationType,
                      OfferedService, ServiceLocation, Shift, Weekday, CommuteMethod,
                      CommunicationSkill, CaregivingSkill, MobilityAssistanceAbility,
                      HouseholdSkill, ForeignLanguage, LocalLanguage,
                      PreviousWorkplace, SpecialConditionExperience, TrainingCourse, Gender)    
from .models import (CaregiverWorkPreferences, CaregiverServiceArea, CaregiverExperience,
                     CaregiverSkills, CaregiverReference, IdentityProfile, CaregiverCompatibilityQuestionnaire,
                     BlacklistAppeal)


class CreateBlacklistAppealSerializer(serializers.Serializer):
    appeal_reason = serializers.CharField(max_length=2000)


class BlacklistAppealSerializer(serializers.ModelSerializer):
    caregiver_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = BlacklistAppeal
        fields = [
            "id", "caregiver_name", "appeal_reason", "status",
            "reviewer_name", "review_note", "reviewed_at", "created_at",
        ]

    def get_caregiver_name(self, obj):
        return obj.caregiver.display_name

    def get_reviewer_name(self, obj):
        if obj.reviewed_by is None:
            return None
        identity = getattr(obj.reviewed_by, "caregiver_identity_profile", None)
        return (identity.full_name if identity else None) or obj.reviewed_by.username


class ReviewBlacklistAppealSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=2000, required=False, allow_blank=True)


class RecordInterviewSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=0, max_value=100, required=False, allow_null=True)
    interview_date = JalaliDateField(required=False, allow_null=True)
    note = serializers.CharField(max_length=1000, required=False, allow_blank=True)


class RequestMoreDocumentsSerializer(serializers.Serializer):
    note = serializers.CharField(max_length=1000)


class CandidateTrackingSerializer(serializers.Serializer):
    """
    One row of the agency's candidate-tracking table — mirrors a real
    spreadsheet an agency was already keeping manually outside the
    platform, now backed by actual platform data plus the new
    interview/notes fields.
    """
    user_id = serializers.IntegerField(source="user.id")
    full_name = serializers.CharField(source="display_name")
    national_id = serializers.CharField(source="user.national_id", default=None)
    phone_number = serializers.CharField(source="user.phone_number")
    city = serializers.SerializerMethodField()
    registered_at = serializers.DateTimeField(source="created_at")
    experience_level = serializers.SerializerMethodField()
    status = serializers.CharField()
    status_label = serializers.CharField(source="get_status_display")
    interview_score = serializers.IntegerField(allow_null=True)
    interview_date = JalaliDateField(allow_null=True)
    interviewer_name = serializers.SerializerMethodField()
    staff_notes = serializers.CharField()
    needs_more_docs_note = serializers.CharField()

    def get_city(self, obj):
        identity = getattr(obj.user, "caregiver_identity_profile", None)
        return identity.city.name if identity and identity.city else None

    def get_experience_level(self, obj):
        experience = getattr(obj, "experience", None)
        return experience.elderly_care_experience if experience else None

    def get_interviewer_name(self, obj):
        if obj.interviewed_by is None:
            return None
        identity = getattr(obj.interviewed_by, "caregiver_identity_profile", None)
        return (identity.full_name if identity else None) or obj.interviewed_by.username


class IdentityProfileSerializer(serializers.ModelSerializer):
    birth_date = JalaliDateField(required=False, allow_null=True)
    # first_name/last_name live on User now (needed there for username
    # generation at registration time, before Form 1 is ever filled
    # in) — IdentityProfile.full_name is a read-only property deriving
    # from the user, not a separately-editable pair of fields here.
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = IdentityProfile
        fields = [
            "full_name",
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
        # Conditional rules straight from the form itself, enforced
        # server-side (not just hidden client-side): military_status
        # only makes sense for gender=male; the "type" sub-fields are
        # only required if the parent yes/no answer was yes.
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


def _choice_list_field(choices_class, **kwargs):
    """
    Every multi-select question in these forms is stored as a JSONField
    (list of strings) rather than a real many-to-many table, matching
    the pattern already established for apps.accounts.IdentityProfile
    and apps.families.PatientCompatibilityQuestionnaire. DRF doesn't
    validate JSONField contents against a choices list on its own, so
    this helper builds a ListField of ChoiceField, giving the same
    "reject anything not in the enum" behavior a real ManyToMany/
    MultipleChoiceField would — just serialized as a plain JSON list.
    """
    return serializers.ListField(
        child=serializers.ChoiceField(choices=choices_class.choices), **kwargs
    )


class CaregiverWorkPreferencesSerializer(serializers.ModelSerializer):
    collaboration_types = _choice_list_field(CollaborationType, required=False)
    accepted_age_ranges = _choice_list_field(AcceptedAgeRange, required=False)
    offered_services = _choice_list_field(OfferedService, required=False)
    accepted_physical_conditions = _choice_list_field(AcceptedPhysicalCondition, required=False)
    service_locations = _choice_list_field(ServiceLocation, required=False)
    available_days = _choice_list_field(Weekday, required=False)
    available_shifts = _choice_list_field(Shift, required=False)
    commute_methods = _choice_list_field(CommuteMethod, required=False)

    class Meta:
        model = CaregiverWorkPreferences
        fields = [
            "collaboration_types", "work_status", "family_presence_preference",
            "accepted_gender", "accepted_age_ranges", "offered_services",
            "accepted_physical_conditions", "lifting_capacity", "service_locations",
            "max_commute_time", "available_days", "available_shifts", "commute_methods",
            "smoking_status", "pets_ok", "holiday_work_ok", "overnight_stay_ok",
            "terms_accepted", "terms_accepted_at", "created_at", "updated_at",
        ]
        read_only_fields = ["terms_accepted_at", "created_at", "updated_at"]

    def validate_available_shifts(self, value):
        # Nested rule #2 from the request: 24h and specific-hour shifts
        # are alternatives, not additive — picking "24h" alongside
        # "morning"/"afternoon"/"night" is a contradiction the form
        # itself can't catch client-side if the checkboxes are
        # independent, so it's enforced here.
        if Shift.ALL_DAY in value and len(value) > 1:
            raise serializers.ValidationError(
                "شیفت «شبانه‌روزی» با سایر شیفت‌ها هم‌زمان قابل انتخاب نیست — یا شبانه‌روزی، یا شیفت‌های مشخص."
            )
        return value

    def validate_terms_accepted(self, value):
        if value is not True:
            raise serializers.ValidationError(
                "تکمیل این فرم منوط به تأیید «شرایط و تعهدات عضویت و همکاری مراقبان» است."
            )
        return value

    def validate(self, attrs):
        from django.utils import timezone
        if attrs.get("terms_accepted"):
            attrs["terms_accepted_at"] = timezone.now()
        return attrs


class SupervisorCaregiverWorkPreferencesSerializer(CaregiverWorkPreferencesSerializer):
    """
    Used only by SupervisorWorkPreferencesView (a supervisor/agency/
    admin filling this form out ON BEHALF OF a caregiver) — never by
    the caregiver's own MyWorkPreferencesView.

    Deliberately excludes terms_accepted / terms_accepted_at
    entirely, per an explicit confirmed decision: accepting these
    terms is framed in the legal text itself as the caregiver's own
    personal electronic signature ("امضای الکترونیکی معتبر اینجانب"),
    carrying the same legal force as a handwritten one — a category
    of consent that isn't delegable the way recording someone's
    ordinary profile data is, even though a supervisor legitimately
    fills out everything else in this same form for literacy/
    accessibility reasons. A caregiver's own acceptance is enforced
    separately as an approval-blocking requirement — see
    _missing_forms() in apps.caregivers.views.
    """
    class Meta(CaregiverWorkPreferencesSerializer.Meta):
        fields = [f for f in CaregiverWorkPreferencesSerializer.Meta.fields if f not in ("terms_accepted", "terms_accepted_at")]
        read_only_fields = [f for f in CaregiverWorkPreferencesSerializer.Meta.read_only_fields if f != "terms_accepted_at"]

    def validate_terms_accepted(self, value):
        # Overridden to a no-op — the parent's version requires True
        # unconditionally, which would make it impossible for a
        # supervisor to ever save this form at all now that the field
        # is excluded from what they can submit in the first place.
        return value

    def validate(self, attrs):
        # Deliberately skips the parent's terms_accepted_at-setting
        # logic entirely — a supervisor submission can never set it,
        # regardless of what a malicious or malformed request body
        # might try to smuggle in, since the field isn't in `fields`
        # for this serializer at all and DRF silently drops unknown
        # input keys rather than erroring on them.
        return attrs


class CaregiverServiceAreaSerializer(serializers.ModelSerializer):
    # province/city/district are real FKs now (write: send the id).
    # These *_name fields are read-only conveniences so a list of
    # service areas can be displayed without the frontend having to
    # separately fetch and cross-reference the full province/city
    # lists just to show what was already selected.
    province_name = serializers.CharField(source="province.name", read_only=True, default=None)
    city_name = serializers.CharField(source="city.name", read_only=True, default=None)
    district_name = serializers.CharField(source="district.name", read_only=True, default=None)

    class Meta:
        model = CaregiverServiceArea
        fields = ["id", "province", "city", "district", "province_name", "city_name", "district_name"]
        read_only_fields = ["id"]


class CaregiverExperienceSerializer(serializers.ModelSerializer):
    previous_workplaces = _choice_list_field(PreviousWorkplace, required=False)
    special_conditions_experience = _choice_list_field(SpecialConditionExperience, required=False)

    class Meta:
        model = CaregiverExperience
        fields = [
            "elderly_care_experience", "other_services_experience", "previous_workplaces",
            "patients_cared_for_count", "special_conditions_experience",
            "live_in_experience", "couple_care_experience", "solo_elderly_care_experience",
            "driving_for_patient_experience", "last_workplace", "additional_notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class CaregiverSkillsSerializer(serializers.ModelSerializer):
    training_courses = _choice_list_field(TrainingCourse, required=False)
    communication_skills = _choice_list_field(CommunicationSkill, required=False)
    caregiving_skills = _choice_list_field(CaregivingSkill, required=False)
    mobility_assistance_ability = _choice_list_field(MobilityAssistanceAbility, required=False)
    household_skills = _choice_list_field(HouseholdSkill, required=False)
    foreign_languages = _choice_list_field(ForeignLanguage, required=False)
    local_languages = _choice_list_field(LocalLanguage, required=False)

    class Meta:
        model = CaregiverSkills
        fields = [
            "education_level", "field_of_study", "training_courses",
            "communication_skills", "caregiving_skills", "physical_ability",
            "mobility_assistance_ability", "household_skills",
            "foreign_languages", "local_languages",
            "has_driving_license", "can_use_smartphone",
            "additional_notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class CaregiverReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaregiverReference
        fields = ["id", "full_name", "occupation", "relation_type", "acquaintance_duration",
                  "phone_number", "callable_for_inquiry"]
        read_only_fields = ["id"]


class CaregiverReferenceListSerializer(serializers.Serializer):
    """
    Wraps a list of references for the submit-all-at-once endpoint.
    No longer enforces a minimum count — matching the rest of this
    platform's "optional unless genuinely necessary" approach for the
    supervisor's rushed bulk-entry flow. A caregiver's references can
    be filled in later; not having them yet shouldn't block saving
    everything else that's already been entered.
    """
    references = CaregiverReferenceSerializer(many=True, required=False)


class CaregiverFullProfileSerializer(serializers.Serializer):
    """
    The nested, aggregate read view — GET /api/caregivers/me/full/
    returns everything about a caregiver's four-form profile in one
    nested response, as requested. Form 1 (identity) is included by
    the view pulling it from apps.accounts.IdentityProfile and passing
    it in as plain dict context, not by this serializer querying
    another app's model directly.

    status/rejection_reason/blacklist_reason added here after finding
    a real, previously-hidden bug: the view's own data dict always
    included "status", but this serializer never declared it as a
    field — DRF silently drops undeclared dict keys rather than
    erroring, so every caregiver checking their OWN profile got
    is_approved=false for pending, rejected, AND suspended alike, with
    no way to tell which, and no reason text ever exposed at all.
    """
    is_approved = serializers.BooleanField()
    status = serializers.CharField()
    rejection_reason = serializers.CharField(allow_blank=True)
    blacklist_reason = serializers.CharField(allow_blank=True)
    needs_more_docs_note = serializers.CharField(allow_blank=True)
    identity = serializers.DictField(allow_null=True)
    work_preferences = CaregiverWorkPreferencesSerializer(allow_null=True)
    service_areas = CaregiverServiceAreaSerializer(many=True)
    experience = CaregiverExperienceSerializer(allow_null=True)
    skills = CaregiverSkillsSerializer(allow_null=True)
    references = CaregiverReferenceSerializer(many=True)


class SupervisorCaregiverFullProfileSerializer(CaregiverFullProfileSerializer):
    """
    Identical shape to the caregiver's own /me/full/ view now that
    status/rejection_reason/blacklist_reason live on the base class —
    kept as its own named subclass (rather than deleted and replaced
    with the base everywhere) so a reviewer-specific field can be
    added here later without touching the caregiver-facing serializer
    at all.
    """
    pass


# ============================================================
# Supervisor-facing — for the temp bulk-data-entry dashboard, where a
# supervisor enters data on behalf of 40-50 caregivers rather than each
# caregiver filling in their own. Everything above this point still
# needs the caregiver themselves logged in (the /me/ endpoints act on
# request.user); the two serializers below back a separate set of
# views keyed by an explicit user_id instead.
# ============================================================

class CreateCaregiverSerializer(serializers.Serializer):
    """
    Step 0 of the supervisor wizard: just enough to create the account.
    No password field on purpose — a supervisor entering someone else's
    data shouldn't be inventing that person's login credentials; a
    random one is generated server-side, and the caregiver resets it
    later via the existing phone-based password-reset flow whenever
    they first want to log in themselves.
    """
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$",
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )
    email = serializers.EmailField(required=False, allow_blank=True)


class CaregiverBasicInfoSerializer(serializers.Serializer):
    """
    Editing an existing caregiver's name/phone — e.g. fixing a typo
    caught after the fact. Same shape as CreateCaregiverSerializer
    minus the "this creates a new account" framing; phone uniqueness
    is checked excluding the caregiver's own current row, since
    otherwise saving without changing the phone at all would always
    fail (it would collide with... itself).
    """
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$",
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_phone_number(self, value):
        user_id = self.context.get("user_id")
        if User.objects.filter(phone_number=value).exclude(id=user_id).exists():
            raise serializers.ValidationError("این شماره تلفن قبلاً برای حساب دیگری ثبت شده است.")
        return value


class CaregiverListItemSerializer(serializers.Serializer):
    """One row in the supervisor's caregiver list — enough to show
    progress at a glance across 40-50 in-progress entries without
    opening each one."""
    user_id = serializers.IntegerField()
    full_name = serializers.CharField()
    phone_number = serializers.CharField()
    status = serializers.CharField()
    forms_completed = serializers.IntegerField()
    forms_total = serializers.IntegerField(default=4)
    created_by = serializers.CharField(allow_null=True)


class CaregiverCompatibilityQuestionnaireSerializer(serializers.ModelSerializer):
    section_scores = serializers.SerializerMethodField()
    overall_flexibility_score = serializers.SerializerMethodField()

    class Meta:
        model = CaregiverCompatibilityQuestionnaire
        fields = [
            "religious_belief_accommodation", "physical_contact_sensitivity_adaptation",
            "prayer_time_scheduling_flexibility", "traditional_belief_acceptance",
            "family_event_participation", "false_accusation_reaction",
            "confidentiality_commitment", "gender_based_task_flexibility",
            "home_environment_adaptability", "schedule_flexibility_for_family_events",
            "traditional_food_treatment_openness", "personal_conversation_patience",
            "home_organization_adaptability",
            "cultural_expression_tolerance", "unfamiliar_custom_acceptance", "dialect_communication_effort",
            "section_scores", "overall_flexibility_score", "updated_at",
        ]
        read_only_fields = ["section_scores", "overall_flexibility_score", "updated_at"]

    def get_section_scores(self, obj):
        return obj.section_scores()

    def get_overall_flexibility_score(self, obj):
        return obj.overall_flexibility_score()
