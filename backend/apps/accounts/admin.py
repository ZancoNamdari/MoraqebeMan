from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "email", "phone_number", "role", "is_phone_verified"]
    fieldsets = UserAdmin.fieldsets + (
        ("اطلاعات تکمیلی", {"fields": ("phone_number", "role", "is_phone_verified", "national_id")}),
    )
