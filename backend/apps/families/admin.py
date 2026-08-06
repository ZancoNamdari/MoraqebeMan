from django.contrib import admin

from apps.accounts.persian_digits import to_persian_digits

from .models import FamilyPatientLink, FamilyProfile, PatientCompatibilityQuestionnaire, PatientProfile


@admin.register(FamilyProfile)
class FamilyProfileAdmin(admin.ModelAdmin):
    list_display = ["display_name", "user", "province", "city", "created_at_display"]
    search_fields = ["display_name", "legacy_city_text", "city__name", "user__username", "user__phone_number"]
    list_filter = ["province"]
    autocomplete_fields = ["user", "province", "city"]

    @admin.display(description="تاریخ ایجاد")
    def created_at_display(self, obj):
        return to_persian_digits(obj.created_at)


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ["full_name", "user", "province", "city", "national_id_display", "birth_date_display", "guardianship_status"]
    search_fields = ["full_name", "father_name", "national_id", "postal_code", "full_address", "city__name", "user__username"]
    list_filter = ["guardianship_status", "province"]
    autocomplete_fields = ["user", "province", "city", "district"]

    @admin.display(description="شماره ملی")
    def national_id_display(self, obj):
        return to_persian_digits(obj.national_id) if obj.national_id else "—"

    @admin.display(description="تاریخ تولد")
    def birth_date_display(self, obj):
        return to_persian_digits(obj.birth_date) if obj.birth_date else "—"


@admin.register(FamilyPatientLink)
class FamilyPatientLinkAdmin(admin.ModelAdmin):
    list_display = ["family", "patient", "relation", "is_primary_contact", "created_at_display"]
    search_fields = ["family__display_name", "patient__full_name", "relation"]
    list_filter = ["is_primary_contact", "relation"]

    @admin.display(description="تاریخ ایجاد")
    def created_at_display(self, obj):
        return to_persian_digits(obj.created_at)


@admin.register(PatientCompatibilityQuestionnaire)
class PatientCompatibilityQuestionnaireAdmin(admin.ModelAdmin):
    list_display = ["patient", "religious_beliefs_priority", "caregiver_as_family_member", "created_at_display"]
    search_fields = ["patient__full_name"]

    @admin.display(description="تاریخ ایجاد")
    def created_at_display(self, obj):
        return to_persian_digits(obj.created_at)
