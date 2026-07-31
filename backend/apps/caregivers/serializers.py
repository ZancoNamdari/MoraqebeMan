from rest_framework import serializers

from .models import (
    AcceptedAgeRange,
    AcceptedGender,
    AcceptedPhysicalCondition,
    AcquaintanceDuration,
    CaregiverExperience,
    CaregiverProfile,
    CaregiverReference,
    CaregiverServiceArea,
    CaregiverSkills,
    CaregiverWorkPreferences,
    CaregivingSkill,
    CollaborationType,
    CommunicationSkill,
    CommuteMethod,
    ForeignLanguage,
    HouseholdSkill,
    LocalLanguage,
    MessagingApp,
    MobilityAssistanceAbility,
    OfferedService,
    PreviousWorkplace,
    ReferenceRelationType,
    ServiceLocation,
    Shift,
    SpecialConditionExperience,
    TrainingCourse,
    Weekday,
)


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
    collaboration_types = _choice_list_field(CollaborationType)
    accepted_age_ranges = _choice_list_field(AcceptedAgeRange)
    offered_services = _choice_list_field(OfferedService)
    accepted_physical_conditions = _choice_list_field(AcceptedPhysicalCondition)
    service_locations = _choice_list_field(ServiceLocation)
    available_days = _choice_list_field(Weekday)
    available_shifts = _choice_list_field(Shift)
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
                "تکمیل فرم منوط به تأیید هر چهار مورد بخش «تأییدیه مسئولیت» است."
            )
        return value

    def validate(self, attrs):
        from django.utils import timezone
        if attrs.get("terms_accepted"):
            attrs["terms_accepted_at"] = timezone.now()
        return attrs


class CaregiverServiceAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaregiverServiceArea
        fields = ["id", "province", "city", "district"]
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
    preferred_messaging_apps = _choice_list_field(MessagingApp, required=False)

    class Meta:
        model = CaregiverSkills
        fields = [
            "education_level", "field_of_study", "training_courses",
            "communication_skills", "caregiving_skills", "physical_ability",
            "mobility_assistance_ability", "household_skills",
            "foreign_languages", "local_languages",
            "has_driving_license", "has_personal_car", "can_use_smartphone",
            "preferred_messaging_apps", "additional_notes",
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
    Wraps a list of references for the submit-all-at-once endpoint,
    enforcing the form's "at least two referees required" rule — a
    constraint on the collection as a whole, which is why it can't live
    on CaregiverReferenceSerializer itself.
    """
    references = CaregiverReferenceSerializer(many=True)

    def validate_references(self, value):
        if len(value) < 2:
            raise serializers.ValidationError("حداقل دو معرف الزامی است.")
        return value


class CaregiverFullProfileSerializer(serializers.Serializer):
    """
    The nested, aggregate read view — GET /api/caregivers/me/full/
    returns everything about a caregiver's four-form profile in one
    nested response, as requested. Form 1 (identity) is included by
    the view pulling it from apps.accounts.IdentityProfile and passing
    it in as plain dict context, not by this serializer querying
    another app's model directly.
    """
    is_approved = serializers.BooleanField()
    identity = serializers.DictField(allow_null=True)
    work_preferences = CaregiverWorkPreferencesSerializer(allow_null=True)
    service_areas = CaregiverServiceAreaSerializer(many=True)
    experience = CaregiverExperienceSerializer(allow_null=True)
    skills = CaregiverSkillsSerializer(allow_null=True)
    references = CaregiverReferenceSerializer(many=True)
