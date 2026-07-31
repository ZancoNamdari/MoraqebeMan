from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .forms import JSONCheckboxMultipleChoiceField
from .models import ChronicDiseaseType, Ethnicity, IdentityProfile, MedicationType, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "email", "phone_number", "role", "is_phone_verified"]
    fieldsets = UserAdmin.fieldsets + (
        ("اطلاعات تکمیلی", {"fields": ("phone_number", "role", "is_phone_verified", "national_id")}),
    )


class IdentityProfileAdminForm(forms.ModelForm):
    """
    JSONField's default admin widget is a raw text box expecting valid
    JSON typed by hand — unusable for a real multi-select question like
    "قومیت/زبان مادری". JSONCheckboxMultipleChoiceField (apps/accounts/
    forms.py) renders real checkboxes instead; MultipleChoiceField's
    cleaned value is already a plain list of strings, which is exactly
    what the JSONField column needs, so no extra conversion is required.
    """
    ethnicities = JSONCheckboxMultipleChoiceField(choices=Ethnicity.choices, label="قومیت / زبان مادری")
    chronic_disease_types = JSONCheckboxMultipleChoiceField(choices=ChronicDiseaseType.choices, label="انواع بیماری‌های مزمن")
    medication_types = JSONCheckboxMultipleChoiceField(choices=MedicationType.choices, label="انواع داروها")

    class Meta:
        model = IdentityProfile
        fields = "__all__"


@admin.register(IdentityProfile)
class IdentityProfileAdmin(admin.ModelAdmin):
    form = IdentityProfileAdminForm
    list_display = ["user", "father_name", "gender", "marital_status", "province", "city"]
    search_fields = ["user__username", "father_name", "user__national_id"]
    list_filter = ["gender", "marital_status", "province"]
