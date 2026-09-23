from rest_framework import serializers
from .models import StoreCategory, Store, Product, Order, OrderItem


class StoreCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = StoreCategory
        fields = ['id', 'name', 'slug', 'icon']


class ProductSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True, required=False)

    class Meta:
        model  = Product
        fields = ['id', 'store', 'name', 'description', 'price', 'stock', 'image', 'is_active']
        read_only_fields = ['store']


class StoreListSerializer(serializers.ModelSerializer):
    """برای لیست فروشگاه‌ها - در صفحه اصلی خرج اعتبار یا هر جای دیگر"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    logo_image_url  = serializers.SerializerMethodField()
    cover_image_url  = serializers.SerializerMethodField()

    class Meta:
        model  = Store
        fields = ['id', 'name', 'city', 'rating', 'category_name', 'logo_image_url', 'cover_image_url']

    def get_logo_image_url(self, obj):
        request = self.context.get('request')
        if obj.logo_image and request:
            return request.build_absolute_uri(obj.logo_image.url)
        return obj.logo_image.url if obj.logo_image else None

    def get_cover_image_url(self, obj):
        request = self.context.get('request')
        if obj.cover_image and request:
            return request.build_absolute_uri(obj.cover_image.url)
        return obj.cover_image.url if obj.cover_image else None


class StoreDetailSerializer(StoreListSerializer):
    """برای صفحه عمومی یک فروشگاه (شامل فهرست محصولات فعال) و همچنین برای ویرایش پروفایل
    توسط خودِ صاحب فروشگاه - در حالت مشاهده عمومی فقط GET صدا زده می‌شود، پس فیلدهای قابل‌نوشتن
    مشکلی برای بازدیدکننده‌های عادی ایجاد نمی‌کنند. status/status_display لازم است چون همین
    سریالایزر برای «مطب‌ها و فروشگاه‌های من» در پروفایل و برای داشبورد صاحب فروشگاه هم استفاده می‌شود."""
    products       = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(StoreListSerializer.Meta):
        fields = StoreListSerializer.Meta.fields + ['status', 'status_display', 'description', 'address', 'phone', 'products']

    def get_products(self, obj):
        active_products = obj.products.filter(is_active=True)
        return ProductSerializer(active_products, many=True, context=self.context).data


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OrderItem
        fields = ['id', 'product', 'product_name', 'unit_price', 'quantity']
        read_only_fields = ['product_name', 'unit_price']


class OrderSerializer(serializers.ModelSerializer):
    customer_name   = serializers.CharField(source='customer.full_name', read_only=True)
    customer_phone  = serializers.CharField(source='customer.phone_number', read_only=True)
    store_name      = serializers.CharField(source='store.name', read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)
    items           = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model  = Order
        fields = [
            'id', 'store', 'store_name', 'customer_name', 'customer_phone',
            'status', 'status_display', 'payment_method', 'is_paid',
            'total_amount', 'note', 'address', 'store_note', 'items',
            'created_at', 'resolved_at',
        ]
        read_only_fields = ['status', 'is_paid', 'total_amount', 'store_note', 'created_at', 'resolved_at']
