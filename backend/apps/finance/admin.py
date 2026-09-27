from django.contrib import admin

from .models import Invoice, Payment, ServiceTariff


@admin.register(ServiceTariff)
class ServiceTariffAdmin(admin.ModelAdmin):
    list_display = ("agency", "service_type", "hourly_rate", "daily_rate", "monthly_rate", "is_active")
    list_filter = ("agency", "service_type", "is_active")


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("agency", "assignment", "period_type", "period_start", "period_end", "amount", "status")
    list_filter = ("agency", "period_type", "status")
    inlines = [PaymentInline]
