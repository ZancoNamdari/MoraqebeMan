from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import IdentityProfile, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "email", "phone_number", "role", "is_phone_verified"]
    fieldsets = UserAdmin.fieldsets + (
        ("اطلاعات تکمیلی", {"fields": ("phone_number", "role", "is_phone_verified", "national_id")}),
    )


@admin.register(IdentityProfile)
class IdentityProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "father_name", "gender", "marital_status", "province", "city"]
    search_fields = ["user__username", "father_name", "user__national_id"]
    list_filter = ["gender", "marital_status", "province"]
