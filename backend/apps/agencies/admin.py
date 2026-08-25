from django.contrib import admin

from .models import AgencyCaregiverLink, AgencyFamilyLink, AgencyProfile


@admin.register(AgencyProfile)
class AgencyProfileAdmin(admin.ModelAdmin):
    list_display = ["company_name", "user", "access_code", "license_number", "created_at"]
    search_fields = ["company_name", "license_number", "access_code", "user__username", "user__phone_number"]
    autocomplete_fields = ["user"]


@admin.register(AgencyFamilyLink)
class AgencyFamilyLinkAdmin(admin.ModelAdmin):
    list_display = ["agency", "family", "status", "requested_at", "decided_at"]
    list_filter = ["status"]
    autocomplete_fields = ["agency", "family", "decided_by"]


@admin.register(AgencyCaregiverLink)
class AgencyCaregiverLinkAdmin(admin.ModelAdmin):
    list_display = ["agency", "caregiver", "status", "requested_at", "decided_at"]
    list_filter = ["status"]
    autocomplete_fields = ["agency", "caregiver", "decided_by"]
