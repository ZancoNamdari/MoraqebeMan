from django.contrib import admin
from .models import (
    Doctor, DoctorTariff, DoctorPost, DoctorAvailability,
    DoctorAppointment, DoctorConversation, DoctorChatMessage, DoctorReview,
)


class TariffInline(admin.TabularInline):
    model = DoctorTariff
    extra = 0


class AvailabilityInline(admin.TabularInline):
    model = DoctorAvailability
    extra = 0


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display  = ['full_name', 'owner', 'clinic', 'city', 'status', 'rating', 'created_at']
    list_filter   = ['status']
    search_fields = ['full_name', 'medical_license_no', 'owner__phone_number']
    inlines       = [TariffInline, AvailabilityInline]
    actions       = ['approve_doctors', 'deactivate_doctors']

    def approve_doctors(self, request, queryset):
        queryset.update(status='active')
    approve_doctors.short_description = '✅ تأیید پزشکان انتخاب‌شده'

    def deactivate_doctors(self, request, queryset):
        queryset.update(status='inactive')
    deactivate_doctors.short_description = '❌ غیرفعال‌سازی پزشکان انتخاب‌شده'


@admin.register(DoctorAppointment)
class DoctorAppointmentAdmin(admin.ModelAdmin):
    list_display    = ['tracking_code', 'full_name', 'doctor', 'requested_date', 'requested_time', 'status']
    list_filter      = ['status']
    search_fields    = ['tracking_code', 'full_name', 'national_id', 'phone']
    readonly_fields  = ['tracking_code']


@admin.register(DoctorPost)
class DoctorPostAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'media_type', 'created_at']


@admin.register(DoctorConversation)
class DoctorConversationAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'patient', 'created_at']


admin.site.register(DoctorChatMessage)
admin.site.register(DoctorReview)
