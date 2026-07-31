from django import forms
from django.contrib import admin

from apps.accounts.forms import JSONCheckboxMultipleChoiceField

from .models import (
    AcceptedAgeRange,
    AcceptedPhysicalCondition,
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
    ServiceLocation,
    Shift,
    SpecialConditionExperience,
    TrainingCourse,
    Weekday,
)


class CaregiverWorkPreferencesAdminForm(forms.ModelForm):
    """
    Same reasoning as apps/accounts/admin.py's IdentityProfileAdminForm —
    JSONField's default admin widget is a hand-typed JSON text box,
    unusable for real multi-select questions. This app has by far the
    most JSON multi-select fields of the three, since Form 2 alone has
    eight of them.
    """
    collaboration_types = JSONCheckboxMultipleChoiceField(choices=CollaborationType.choices, label="نوع همکاری")
    accepted_age_ranges = JSONCheckboxMultipleChoiceField(choices=AcceptedAgeRange.choices, label="بازه سنی پذیرفته")
    offered_services = JSONCheckboxMultipleChoiceField(choices=OfferedService.choices, label="خدمات قابل ارائه")
    accepted_physical_conditions = JSONCheckboxMultipleChoiceField(choices=AcceptedPhysicalCondition.choices, label="شرایط جسمانی پذیرفته")
    service_locations = JSONCheckboxMultipleChoiceField(choices=ServiceLocation.choices, label="محل ارائه خدمات")
    available_days = JSONCheckboxMultipleChoiceField(choices=Weekday.choices, label="روزهای قابل همکاری")
    available_shifts = JSONCheckboxMultipleChoiceField(choices=Shift.choices, label="شیفت‌های قابل همکاری")
    commute_methods = JSONCheckboxMultipleChoiceField(choices=CommuteMethod.choices, label="وسیله رفت‌وآمد", required=False)

    class Meta:
        model = CaregiverWorkPreferences
        fields = "__all__"


@admin.register(CaregiverWorkPreferences)
class CaregiverWorkPreferencesAdmin(admin.ModelAdmin):
    form = CaregiverWorkPreferencesAdminForm
    list_display = ["profile", "work_status", "lifting_capacity", "terms_accepted"]
    list_filter = ["work_status", "lifting_capacity", "smoking_status"]


class CaregiverExperienceAdminForm(forms.ModelForm):
    previous_workplaces = JSONCheckboxMultipleChoiceField(choices=PreviousWorkplace.choices, label="محل‌های سابق فعالیت", required=False)
    special_conditions_experience = JSONCheckboxMultipleChoiceField(choices=SpecialConditionExperience.choices, label="تجربه شرایط خاص", required=False)

    class Meta:
        model = CaregiverExperience
        fields = "__all__"


@admin.register(CaregiverExperience)
class CaregiverExperienceAdmin(admin.ModelAdmin):
    form = CaregiverExperienceAdminForm
    list_display = ["profile", "elderly_care_experience", "patients_cared_for_count"]
    list_filter = ["elderly_care_experience", "patients_cared_for_count"]


class CaregiverSkillsAdminForm(forms.ModelForm):
    training_courses = JSONCheckboxMultipleChoiceField(choices=TrainingCourse.choices, label="دوره‌های آموزشی", required=False)
    communication_skills = JSONCheckboxMultipleChoiceField(choices=CommunicationSkill.choices, label="مهارت‌های ارتباطی", required=False)
    caregiving_skills = JSONCheckboxMultipleChoiceField(choices=CaregivingSkill.choices, label="مهارت‌های مراقبتی", required=False)
    mobility_assistance_ability = JSONCheckboxMultipleChoiceField(choices=MobilityAssistanceAbility.choices, label="توانایی کمک به جابجایی", required=False)
    household_skills = JSONCheckboxMultipleChoiceField(choices=HouseholdSkill.choices, label="مهارت‌های خانگی", required=False)
    foreign_languages = JSONCheckboxMultipleChoiceField(choices=ForeignLanguage.choices, label="زبان‌های خارجی", required=False)
    local_languages = JSONCheckboxMultipleChoiceField(choices=LocalLanguage.choices, label="زبان‌های محلی", required=False)
    preferred_messaging_apps = JSONCheckboxMultipleChoiceField(choices=MessagingApp.choices, label="پیام‌رسان‌های مورد استفاده", required=False)

    class Meta:
        model = CaregiverSkills
        fields = "__all__"


@admin.register(CaregiverSkills)
class CaregiverSkillsAdmin(admin.ModelAdmin):
    form = CaregiverSkillsAdminForm
    list_display = ["profile", "education_level", "physical_ability"]
    list_filter = ["education_level", "physical_ability"]


@admin.register(CaregiverProfile)
class CaregiverProfileAdmin(admin.ModelAdmin):
    list_display = ["user_id", "is_approved", "approved_at"]
    list_filter = ["is_approved"]
    search_fields = ["user_id"]


@admin.register(CaregiverServiceArea)
class CaregiverServiceAreaAdmin(admin.ModelAdmin):
    list_display = ["profile", "province", "city", "district"]
    list_filter = ["province"]


@admin.register(CaregiverReference)
class CaregiverReferenceAdmin(admin.ModelAdmin):
    list_display = ["profile", "full_name", "relation_type", "callable_for_inquiry"]
    list_filter = ["relation_type", "callable_for_inquiry"]
