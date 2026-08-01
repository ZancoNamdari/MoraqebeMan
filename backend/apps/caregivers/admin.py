from django import forms
from django.contrib import admin, messages

from apps.accounts.forms import JSONCheckboxMultipleChoiceField
from apps.accounts.persian_digits import to_persian_digits

from .choices import (
    AcceptedAgeRange,
    AcceptedPhysicalCondition,
    CaregivingSkill,
    ChronicDiseaseType,
    CollaborationType,
    CommunicationSkill,
    CommuteMethod,
    Ethnicity,
    ForeignLanguage,
    HouseholdSkill,
    LocalLanguage,
    MedicationType,
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
from .models import (
    CaregiverApprovalLog,
    CaregiverExperience,
    CaregiverProfile,
    CaregiverReference,
    CaregiverServiceArea,
    CaregiverSkills,
    CaregiverWorkPreferences,
    IdentityProfile,
)


# ============================================================
# Form 1 — Identity
# ============================================================

class IdentityProfileAdminForm(forms.ModelForm):
    """JSONField's default admin widget is a hand-typed JSON textbox —
    unusable for a real multi-select question like "قومیت/زبان مادری".
    JSONCheckboxMultipleChoiceField renders real checkboxes instead;
    MultipleChoiceField's cleaned value is already a plain list of
    strings, exactly what the JSONField column needs."""
    ethnicities = JSONCheckboxMultipleChoiceField(choices=Ethnicity.choices, label="قومیت / زبان مادری")
    chronic_disease_types = JSONCheckboxMultipleChoiceField(choices=ChronicDiseaseType.choices, label="انواع بیماری‌های مزمن")
    medication_types = JSONCheckboxMultipleChoiceField(choices=MedicationType.choices, label="انواع داروها")

    class Meta:
        model = IdentityProfile
        fields = "__all__"


@admin.register(IdentityProfile)
class IdentityProfileAdmin(admin.ModelAdmin):
    form = IdentityProfileAdminForm
    list_display = ["full_name_display", "user", "gender", "marital_status", "province", "city", "birth_date_display"]
    search_fields = ["user__username", "user__national_id", "first_name", "last_name", "father_name"]
    list_filter = ["gender", "marital_status", "province"]
    autocomplete_fields = ["user"]

    @admin.display(description="نام کامل")
    def full_name_display(self, obj):
        return obj.full_name

    @admin.display(description="تاریخ تولد")
    def birth_date_display(self, obj):
        return to_persian_digits(obj.birth_date) if obj.birth_date else "—"


# ============================================================
# Caregiver Profile — hub, with approve/reject bulk actions
# ============================================================

class CaregiverApprovalLogInline(admin.TabularInline):
    model = CaregiverApprovalLog
    extra = 0
    readonly_fields = ["old_status", "new_status", "performed_by", "note", "created_at"]
    can_delete = False
    ordering = ["-created_at"]

    def has_add_permission(self, request, obj=None):
        # Log entries are only ever written by CaregiverProfile.approve()/
        # reject() — never created by hand in the admin.
        return False


@admin.register(CaregiverProfile)
class CaregiverProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "status", "approved_by", "approved_at_display", "form_completion"]
    list_filter = ["status"]
    search_fields = ["user__username", "user__phone_number", "user__caregiver_identity_profile__first_name", "user__caregiver_identity_profile__last_name"]
    autocomplete_fields = ["user", "approved_by"]
    readonly_fields = ["approved_by", "approved_at", "created_at", "updated_at"]
    inlines = [CaregiverApprovalLogInline]
    actions = ["approve_selected", "reject_selected"]

    @admin.display(description="زمان تأیید")
    def approved_at_display(self, obj):
        return to_persian_digits(obj.approved_at) if obj.approved_at else "—"

    @admin.display(description="تکمیل فرم‌ها")
    def form_completion(self, obj):
        parts = [
            hasattr(obj, "work_preferences"),
            hasattr(obj, "experience"),
            hasattr(obj, "skills"),
            obj.references.count() >= 2,
        ]
        done = sum(parts)
        return to_persian_digits(f"{done}/4")

    @admin.action(description="تأیید مراقبان انتخاب‌شده (فقط پروفایل‌های کامل)")
    def approve_selected(self, request, queryset):
        approved, skipped = 0, 0
        for profile in queryset:
            complete = (
                hasattr(profile, "work_preferences")
                and hasattr(profile, "experience")
                and hasattr(profile, "skills")
                and profile.references.count() >= 2
                and IdentityProfile.objects.filter(user_id=profile.user_id).exists()
            )
            if complete:
                profile.approve(request.user)
                approved += 1
            else:
                skipped += 1
        if approved:
            self.message_user(request, f"{to_persian_digits(approved)} مراقب تأیید شد.", level=messages.SUCCESS)
        if skipped:
            self.message_user(request, f"{to_persian_digits(skipped)} پروفایل ناقص بود و رد شد (تأیید نشد).", level=messages.WARNING)

    @admin.action(description="رد کردن مراقبان انتخاب‌شده")
    def reject_selected(self, request, queryset):
        count = 0
        for profile in queryset:
            profile.reject(request.user, reason="رد شده از طریق پنل مدیریت (بدون دلیل مشخص)")
            count += 1
        self.message_user(request, f"{to_persian_digits(count)} مراقب رد شد.", level=messages.WARNING)


@admin.register(CaregiverApprovalLog)
class CaregiverApprovalLogAdmin(admin.ModelAdmin):
    list_display = ["caregiver", "old_status", "new_status", "performed_by", "created_at_display"]
    list_filter = ["new_status"]
    readonly_fields = ["caregiver", "old_status", "new_status", "performed_by", "note", "created_at"]

    @admin.display(description="تاریخ")
    def created_at_display(self, obj):
        return to_persian_digits(obj.created_at)

    def has_add_permission(self, request):
        return False


# ============================================================
# Form 2 — Work preferences (the most checkbox-heavy form by far)
# ============================================================

class CaregiverWorkPreferencesAdminForm(forms.ModelForm):
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

    def clean(self):
        # Same nested rule the API serializer enforces — the admin
        # shouldn't be a backdoor around it.
        cleaned = super().clean()
        shifts = cleaned.get("available_shifts") or []
        if "24h" in shifts and len(shifts) > 1:
            raise forms.ValidationError(
                'شیفت «شبانه‌روزی» با سایر شیفت‌ها هم‌زمان قابل انتخاب نیست.'
            )
        return cleaned


@admin.register(CaregiverWorkPreferences)
class CaregiverWorkPreferencesAdmin(admin.ModelAdmin):
    form = CaregiverWorkPreferencesAdminForm
    list_display = ["profile", "work_status", "lifting_capacity", "terms_accepted"]
    list_filter = ["work_status", "lifting_capacity", "smoking_status", "terms_accepted"]
    search_fields = ["profile__user__username"]
    autocomplete_fields = ["profile"]


@admin.register(CaregiverServiceArea)
class CaregiverServiceAreaAdmin(admin.ModelAdmin):
    list_display = ["profile", "province", "city", "district"]
    list_filter = ["province"]
    search_fields = ["profile__user__username", "province", "city", "district"]
    autocomplete_fields = ["profile"]


# ============================================================
# Form 3 — Experience & skills
# ============================================================

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
    search_fields = ["profile__user__username"]
    autocomplete_fields = ["profile"]


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
    search_fields = ["profile__user__username"]
    autocomplete_fields = ["profile"]


# ============================================================
# Form 4 — References, with a verify action
# ============================================================

@admin.register(CaregiverReference)
class CaregiverReferenceAdmin(admin.ModelAdmin):
    list_display = ["full_name", "profile", "relation_type", "phone_number_display", "callable_for_inquiry", "is_verified"]
    list_filter = ["relation_type", "callable_for_inquiry", "is_verified"]
    search_fields = ["full_name", "phone_number", "profile__user__username"]
    autocomplete_fields = ["profile", "verified_by"]
    readonly_fields = ["verified_by", "verified_at"]
    actions = ["verify_selected"]

    @admin.display(description="شماره تلفن")
    def phone_number_display(self, obj):
        return to_persian_digits(obj.phone_number)

    @admin.action(description="تأیید معرف‌های انتخاب‌شده")
    def verify_selected(self, request, queryset):
        count = 0
        for reference in queryset.filter(is_verified=False):
            reference.verify(request.user, note="تأیید گروهی از پنل مدیریت")
            count += 1
        self.message_user(request, f"{to_persian_digits(count)} معرف تأیید شد.", level=messages.SUCCESS)
