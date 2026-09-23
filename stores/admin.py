from django.contrib import admin
from django.utils import timezone
from .models import StoreCategory, Store, Product, Order, OrderItem


@admin.register(StoreCategory)
class StoreCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'icon']


class ProductInline(admin.TabularInline):
    model = Product
    extra = 0


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display  = ['name', 'owner', 'city', 'status', 'commission_percent', 'created_at']
    list_filter   = ['status', 'category']
    search_fields = ['name', 'owner__phone_number', 'city']
    inlines       = [ProductInline]
    actions       = ['approve_stores', 'reject_stores']

    def approve_stores(self, request, queryset):
        approved, skipped = 0, 0
        for store in queryset:
            if not store.address or not store.city:
                skipped += 1
                continue
            store.status = 'active'
            store.save(update_fields=['status'])
            approved += 1
        msg = f'{approved} فروشگاه تأیید شد.'
        if skipped:
            msg += f' {skipped} فروشگاه به دلیل ناقص بودن اطلاعات رد شد.'
        self.message_user(request, msg)
    approve_stores.short_description = '✅ تأیید فروشگاه‌های انتخاب‌شده'

    def reject_stores(self, request, queryset):
        queryset.update(status='inactive')
    reject_stores.short_description = '❌ غیرفعال‌سازی فروشگاه‌های انتخاب‌شده'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display  = ['name', 'store', 'price', 'stock', 'is_active']
    list_filter   = ['is_active', 'store']
    search_fields = ['name', 'store__name']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'product_name', 'unit_price', 'quantity']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display    = ['id', 'customer', 'store', 'status', 'total_amount', 'is_paid', 'created_at']
    list_filter      = ['status', 'store']
    search_fields    = ['customer__phone_number', 'store__name']
    inlines          = [OrderItemInline]
    readonly_fields  = ['customer', 'store', 'total_amount', 'is_paid', 'created_at']
