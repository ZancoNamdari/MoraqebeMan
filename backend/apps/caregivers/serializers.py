from rest_framework import serializers

from apps.accounts.models import User
from .schedule import ScheduleError, clean_schedule, derive_availability
from apps.accounts.jalali_fields import JalaliDateField, JalaliDateTimeField

from .choices import (SpecialTalent, AcceptedPhysicalCondition, AcceptedAgeRange, CollaborationMode, CollaborationType,
                      OfferedService, ServiceLocation, Shift, Weekday, CommuteMethod,
                      CommunicationSkill, CaregivingSkill, MobilityAssistanceAbility,
                      HouseholdSkill, ForeignLanguage, LocalLanguage,
                      PreviousWorkplace, SpecialConditionExperience, TrainingCourse, Gender,
                      Ethnicity, ETHNICITY_SUBGROUPS,
                      ServiceType, NezafatchiSubtype, MadaryarSubtype,
                      ParastarSubtype, ParastarSpecialty, BehyarLevel)
from .models import (CaregiverWorkPreferences, CaregiverServiceArea, CaregiverExperience,
                     CaregiverSkills, CaregiverReference, IdentityProfile, CaregiverCompatibilityQuestionnaire,
                     BlacklistAppeal, CaregiverDocumentUpload)


# Which subtype values are valid for each ServiceType — PARASTAR is a flat
# tag set: its two branches (specialized_nurse / behyar) plus the inner
# choices of each (nursing_specialist + specialties under the nurse branch,
# BehyarLevel under the behyar branch).
_SUBTYPE_CHOICES_BY_SERVICE_TYPE = {
    ServiceType.SALMANDYAR: [],
    ServiceType.NEZAFATCHI: [c[0] for c in NezafatchiSubtype.choices],
    ServiceType.MADARYAR: [c[0] for c in MadaryarSubtype.choices],
    ServiceType.PARASTAR: (
        [c[0] for c in ParastarSubtype.choices]
        + [c[0] for c in ParastarSpecialty.choices]
        + [c[0] for c in BehyarLevel.choices]
    ),
}


class CaregiverServiceTypesSerializer(serializers.Serializer):
    """
    The structured type/subtype tag set chosen right after step 0
    (name/phone), before Form 1 — see CaregiverProfile.service_types'
    own docstring for why this is a tag set on one profile rather
    than a fork into per-type profiles.
    """
    service_types = serializers.ListField(
        child=serializers.ChoiceField(choices=ServiceType.choices), allow_empty=True, required=False,
    )
    service_subtypes = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField()), required=False,
    )

    def validate(self, attrs):
        service_types = attrs.get("service_types", [])
        service_subtypes = attrs.get("service_subtypes", {})
        for service_type, subtypes in service_subtypes.items():
            if service_type not in _SUBTYPE_CHOICES_BY_SERVICE_TYPE:
                raise serializers.ValidationError({"service_subtypes": f"نوع خدمت نامعتبر: {service_type}"})
            allowed = _SUBTYPE_CHOICES_BY_SERVICE_TYPE[service_type]
            invalid = [s for s in subtypes if s not in allowed]
            if invalid:
                raise serializers.ValidationError({"service_subtypes": f"زیرشاخه نامعتبر برای {service_type}: {invalid}"})
        # Drop subtypes for any service type the caller didn't (or no
        # longer) select, rather than leaving stale sub-selections
        # behind when someone unchecks a type and re-saves.
        attrs["service_subtypes"] = {k: v for k, v in service_subtypes.items() if k in service_types}
        return attrs


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


class EditCandidateFieldsSerializer(serializers.Serializer):
    """
    Every field here maps to apps.accounts.models.User, not
    CaregiverProfile or IdentityProfile — this deliberately lets an
    agency correct a caregiver's own personal identifying data. Every
    field is optional so a PATCH can touch just one field at a time;
    validated_data will only contain what was actually sent.
    """
    first_name = serializers.CharField(max_length=50, required=False)
    last_name = serializers.CharField(max_length=50, required=False)
    national_id = serializers.CharField(max_length=10, required=False, allow_blank=True)
    phone_number = serializers.RegexField(
        regex=r"^09\d{9}$", required=False,
        error_messages={"invalid": "شماره تلفن باید با فرمت 09xxxxxxxxx باشد."},
    )


class CandidateTrackingSerializer(serializers.Serializer):
    """
    One row of the agency's candidate-tracking table — mirrors a real
    spreadsheet an agency was already keeping manually outside the
    platform, now backed by actual platform data plus the new
    interview/notes fields.
    """
    user_id = serializers.IntegerField(source="user.id")
    full_name = serializers.CharField(source="display_name")
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    national_id = serializers.CharField(source="user.national_id", default=None)
    phone_number = serializers.CharField(source="user.phone_number")
    city = serializers.SerializerMethodField()
    registered_at = JalaliDateTimeField(source="created_at")
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
            "father_name", "national_id", "birth_certificate_number",
            "birth_date", "gender", "marital_status", "children_count", "military_status",
            "height_range", "weight_range", "ethnicities", "ethnicity_details", "age",
            "is_non_iranian_national", "nationality_country", "nationality_country_other", "nursing_license_number",
            "has_chronic_disease", "chronic_disease_types", "chronic_disease_detail",
            "takes_permanent_medication", "medication_types", "medication_detail", "psychiatric_medication_detail",
            "emergency_contact_phone", "emergency_contact_relation", "landline_phone", "extra_phone_numbers",
            "province", "city", "district", "postal_code", "full_address",
            "has_children", "currently_caring_for_own_child", "child_accompany_at_work",
            "special_talents", "special_talents_other",
            "created_at", "updated_at",
        ]
        read_only_fields = ["age", "created_at", "updated_at"]

    def validate_ethnicities(self, value):
        valid = {c[0] for c in Ethnicity.choices}
        invalid = [v for v in (value or []) if v not in valid]
        if invalid:
            raise serializers.ValidationError(f"قومیت نامعتبر: {invalid}")
        return value

    def validate_special_talents(self, value):
        valid = {c[0] for c in SpecialTalent.choices}
        invalid = [v for v in (value or []) if v not in valid]
        if invalid:
            raise serializers.ValidationError(f"استعداد نامعتبر: {invalid}")
        return list(dict.fromkeys(value or []))

    def validate_ethnicity_details(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("ساختار زیرگروه قومیت باید دیکشنری باشد.")
        cleaned = {}
        for main, subs in value.items():
            if main not in ETHNICITY_SUBGROUPS:
                raise serializers.ValidationError(f"قومیت نامعتبر: {main}")
            if not isinstance(subs, list):
                raise serializers.ValidationError(f"زیرگروه‌های {main} باید فهرست باشد.")
            allowed = {c[0] for c in ETHNICITY_SUBGROUPS[main]}
            invalid = [x for x in subs if x not in allowed]
            if invalid:
                raise serializers.ValidationError(f"زیرگروه نامعتبر برای {main}: {invalid}")
            if subs:
                cleaned[main] = subs
        return cleaned

    def validate(self, attrs):
        # زیرگروهِ قومیتی که در ethnicities انتخاب نشده نگه داشته نمی‌شود.
        if "ethnicity_details" in attrs:
            mains = attrs.get("ethnicities", getattr(self.instance, "ethnicities", None)) or []
            attrs["ethnicity_details"] = {k: v for k, v in attrs["ethnicity_details"].items() if k in mains}

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

        # «همراهی فرزند هنگام کار» فقط وقتی معنا دارد که الان از فرزند خودش
        # مراقبت می‌کند؛ در غیر این صورت پاسخِ قبلی پاک می‌شود.
        has_children = attrs.get("has_children", getattr(self.instance, "has_children", None))
        caring = attrs.get("currently_caring_for_own_child", getattr(self.instance, "currently_caring_for_own_child", None))
        if not (has_children and caring):
            attrs["child_accompany_at_work"] = ""

        # متن «سایر استعدادها» فقط وقتی «سایر» انتخاب شده نگه داشته می‌شود.
        talents = attrs.get("special_talents", getattr(self.instance, "special_talents", None)) or []
        if "other" not in talents:
            attrs["special_talents_other"] = ""

        # کشور تابعیت فقط برای اتباع؛ متن «سایر» فقط وقتی کشور = سایر.
        non_iranian = attrs.get("is_non_iranian_national", getattr(self.instance, "is_non_iranian_national", None))
        country = attrs.get("nationality_country", getattr(self.instance, "nationality_country", ""))
        if not non_iranian:
            attrs["nationality_country"] = ""
            attrs["nationality_country_other"] = ""
        elif country != "other":
            attrs["nationality_country_other"] = ""

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


_VALID_SERVICE_TYPES = {c[0] for c in ServiceType.choices}


def _validate_service_specific_answers(value):
    """
    Shared shape-check for the service_specific_answers JSONField on
    CaregiverWorkPreferences/CaregiverExperience/
    CaregiverCompatibilityQuestionnaire — {service_type: {field: value}}.
    Deliberately loose on the inner dict (doesn't re-validate every
    per-type question's own choice list server-side, the way
    _choice_list_field does for the fixed/common fields above) — the
    per-type question set is still evolving and lives in the
    frontend's wizard-constants; this only guards the one thing that
    actually corrupts data if wrong: a top-level key that isn't a
    real service type.
    """
    if not isinstance(value, dict):
        raise serializers.ValidationError("باید یک دیکشنری {نوع خدمت: پاسخ‌ها} باشد.")
    for service_type, answers in value.items():
        if service_type not in _VALID_SERVICE_TYPES:
            raise serializers.ValidationError(f"نوع خدمت نامعتبر: {service_type}")
        if not isinstance(answers, dict):
            raise serializers.ValidationError({service_type: "باید یک دیکشنری {نام فیلد: مقدار} باشد."})
    return value


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
    collaboration_types = _choice_list_field(CollaborationMode, required=False)
    accepted_age_ranges = _choice_list_field(AcceptedAgeRange, required=False)
    offered_services = _choice_list_field(OfferedService, required=False)
    accepted_physical_conditions = _choice_list_field(AcceptedPhysicalCondition, required=False)
    service_locations = _choice_list_field(ServiceLocation, required=False)
    commute_methods = _choice_list_field(CommuteMethod, required=False)

    class Meta:
        model = CaregiverWorkPreferences
        fields = [
            "collaboration_types", "collaboration_schedule", "family_presence_preference",
            "accepted_gender", "accepted_age_ranges", "offered_services",
            "accepted_physical_conditions", "lifting_capacity", "service_locations",
            "max_commute_time", "available_days", "available_shifts", "commute_methods",
            "smoking_status", "pets_ok", "holiday_work_ok", "overnight_stay_ok",
            "problem_with_single_father", "problem_with_single_mother", "problem_with_father_present_at_home",
            "problem_with_grandparent_or_relative_at_home", "problem_with_home_camera",
            "problem_with_dog", "problem_with_cat", "pets_other_notes",
            "problem_with_domestic_travel", "problem_with_international_travel",
            "problem_without_private_room",
            "terms_accepted", "terms_accepted_at", "night_stay_until", "has_night_time_limit",
            "additional_notes", "requested_salary", "requested_salary_range", "cleaning_willingness", "day_off_request",
            "service_specific_answers",
            "created_at", "updated_at",
        ]
        # available_days / available_shifts از collaboration_schedule مشتق می‌شوند؛
        # requested_salary فقط متن قدیمی است (نمایش، بدون ویرایش).
        read_only_fields = ["terms_accepted_at", "created_at", "updated_at",
                            "available_days", "available_shifts", "requested_salary"]

    def validate_service_specific_answers(self, value):
        return _validate_service_specific_answers(value)

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
        return self._apply_schedule(attrs)

    def _apply_schedule(self, attrs):
        """برنامه‌ی زمانی را پاک‌سازی و available_days/shifts را از آن مشتق می‌کند."""
        if "collaboration_types" not in attrs and "collaboration_schedule" not in attrs:
            return attrs
        types = attrs.get("collaboration_types", getattr(self.instance, "collaboration_types", None)) or []
        raw = attrs.get("collaboration_schedule", getattr(self.instance, "collaboration_schedule", None)) or {}
        try:
            schedule = clean_schedule(raw, types)
        except ScheduleError as exc:
            raise serializers.ValidationError({"collaboration_schedule": str(exc)})
        attrs["collaboration_schedule"] = schedule
        attrs["available_days"], attrs["available_shifts"] = derive_availability(types, schedule)
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
        return self._apply_schedule(attrs)


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
            "service_specific_answers",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_service_specific_answers(self, value):
        return _validate_service_specific_answers(value)


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
            "foreign_languages", "local_languages", "local_language_fluency", "english_level", "arabic_level", "other_languages_detail",
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
    service_types = serializers.ListField(child=serializers.CharField(), required=False)
    service_subtypes = serializers.DictField(required=False)
    identity = serializers.DictField(allow_null=True)
    work_preferences = CaregiverWorkPreferencesSerializer(allow_null=True)
    service_areas = CaregiverServiceAreaSerializer(many=True)
    experience = CaregiverExperienceSerializer(allow_null=True)
    skills = CaregiverSkillsSerializer(allow_null=True)
    references = CaregiverReferenceSerializer(many=True)
    # Same "تکمیل مدارک" checklist detail agency-panel's Kanban card
    # gets via AgencyCaregiverPipelineSerializer.get_documents — added
    # here too so a reviewer looking at this SAME full-profile view
    # (admin-panel's caregiver detail page, and supervisor-panel's own
    # review page for an agency_supervisor) can see and act on the
    # uploaded files, not just the plain doc_* booleans.
    documents = serializers.DictField(allow_null=True, required=False)
    # ویترین: تعداد مراقبت‌ها و درصد رضایت (فقط محاسبه‌شده، برای صفحه‌ی اول پروفایل)
    showcase = serializers.DictField(allow_null=True, required=False)


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
            "religiosity_level", "family_compatibility_level",
            "patience_level", "clinical_compatibility_level",
            "service_specific_answers", "trait_profiles",
            "section_scores", "overall_flexibility_score", "updated_at",
        ]
        read_only_fields = ["section_scores", "overall_flexibility_score", "updated_at"]

    def validate_service_specific_answers(self, value):
        return _validate_service_specific_answers(value)

    def validate_trait_profiles(self, value):
        """[{id, title, traits: [{key, label, percent 0-100, questions}]}] —
        only the known keys are kept, so the stored shape stays small and clean."""
        if not isinstance(value, list) or len(value) > 12:
            raise serializers.ValidationError("ساختار پروفایل نامعتبر است.")
        cleaned = []
        for prof in value:
            if not isinstance(prof, dict) or not isinstance(prof.get("traits"), list) or len(prof["traits"]) > 40:
                raise serializers.ValidationError("ساختار پروفایل نامعتبر است.")
            traits = []
            for tr in prof["traits"]:
                try:
                    percent, questions = int(tr["percent"]), int(tr.get("questions", 0))
                    key, label = str(tr["key"])[:60], str(tr["label"])[:120]
                except (KeyError, TypeError, ValueError):
                    raise serializers.ValidationError("ساختار پارامتر نامعتبر است.")
                if not 0 <= percent <= 100:
                    raise serializers.ValidationError("درصد باید بین ۰ تا ۱۰۰ باشد.")
                traits.append({"key": key, "label": label, "percent": percent, "questions": questions})
            cleaned.append({"id": str(prof.get("id", ""))[:40], "title": str(prof.get("title", ""))[:100], "traits": traits})
        return cleaned

    def get_section_scores(self, obj):
        return obj.section_scores()

    def get_overall_flexibility_score(self, obj):
        return obj.overall_flexibility_score()


class CaregiverDocumentUploadSerializer(serializers.ModelSerializer):
    """
    One of the seven "تکمیل مدارک" checklist items — the file plus
    where it stands in review. Shared between agency-panel's checklist
    drawer (upload, and approve/reject for a supervisor/owner) and
    admin-panel's caregiver detail page (approve/reject for platform
    staff) — see apps.caregivers.document_views for who's allowed to
    do which action.
    """
    uploaded_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CaregiverDocumentUpload
        fields = [
            "document_type", "file", "status",
            "uploaded_by_name", "uploaded_at",
            "reviewed_by_name", "reviewed_at", "rejection_reason",
        ]
        read_only_fields = fields

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username if obj.uploaded_by else None

    def get_reviewed_by_name(self, obj):
        return obj.reviewed_by.get_full_name() or obj.reviewed_by.username if obj.reviewed_by else None
