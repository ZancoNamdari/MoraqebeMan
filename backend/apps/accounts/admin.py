from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User
from .persian_digits import to_persian_digits


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "email", "phone_number_display", "role", "is_phone_verified"]
    fieldsets = UserAdmin.fieldsets + (
        ("اطلاعات تکمیلی", {"fields": ("phone_number", "role", "is_phone_verified", "national_id")}),
    )

    @admin.display(description="شماره موبایل")
    def phone_number_display(self, obj):
        return to_persian_digits(obj.phone_number)
