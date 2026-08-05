from rest_framework import serializers

from apps.accounts.jalali_fields import JalaliDateField

from .choices import (AcceptedPhysicalCondition, AcceptedAgeRange, CollaborationType,
                      OfferedService, ServiceLocation, Shift, Weekday, CommuteMethod,
                      CommunicationSkill, CaregivingSkill, MobilityAssistanceAbility,
                      HouseholdSkill, ForeignLanguage, LocalLanguage,
                      PreviousWorkplace, SpecialConditionExperience, TrainingCourse, Gender)    
from .models import (CaregiverWorkPreferences, CaregiverServiceArea, CaregiverExperience,
                     CaregiverSkills, CaregiverReference, IdentityProfile)


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
                "تکمیل فرم منوط به تأیید هر چهار مورد بخش «تأییدیه مسئولیت» است."
            )
        return value

    def validate(self, attrs):
        from django.utils import timezone
        if attrs.get("terms_accepted"):
            attrs["terms_accepted_at"] = timezone.now()
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
    """
    is_approved = serializers.BooleanField()
    identity = serializers.DictField(allow_null=True)
    work_preferences = CaregiverWorkPreferencesSerializer(allow_null=True)
    service_areas = CaregiverServiceAreaSerializer(many=True)
    experience = CaregiverExperienceSerializer(allow_null=True)
    skills = CaregiverSkillsSerializer(allow_null=True)
    references = CaregiverReferenceSerializer(many=True)


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
