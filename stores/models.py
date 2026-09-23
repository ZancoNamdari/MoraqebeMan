from decimal import Decimal
from django.db import models
from accounts.models import User


class StoreCategory(models.Model):
    """نوع فروشگاه: داروخانه، فروشگاه لوازم آرایشی، عطرفروشی و ..."""
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=10, blank=True, help_text='emoji یا کلاس آیکون')

    def __str__(self):
        return self.name

    class Meta:
        verbose_name        = 'نوع فروشگاه'
        verbose_name_plural = 'انواع فروشگاه'


class Store(models.Model):
    """فروشگاه - مثلاً یک داروخانه یا فروشگاه لوازم آرایشی، موازی با مطب برای خدمات"""
    STATUS_CHOICES = [
        ('pending',  'در انتظار تأیید'),
        ('active',   'فعال'),
        ('inactive', 'غیرفعال'),
    ]

    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stores')
    category    = models.ForeignKey(StoreCategory, on_delete=models.SET_NULL, null=True, blank=True)
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    address     = models.TextField()
    city        = models.CharField(max_length=100)
    phone       = models.CharField(max_length=15)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rating      = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    logo_image  = models.ImageField(upload_to='stores/logo/', null=True, blank=True)
    cover_image = models.ImageField(upload_to='stores/cover/', null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    referred_by_marketer = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='referred_stores',
        help_text='بازاریابی که این فروشگاه را به پلتفرم معرفی کرده (کمیسیون دائمی از فروش این فروشگاه می‌گیرد)'
    )
    commission_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('20.00'),
        help_text='درصد سهم پلتفرم از هر خرید از این فروشگاه'
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name        = 'فروشگاه'
        verbose_name_plural = 'فروشگاه‌ها'


class Product(models.Model):
    """محصول یک فروشگاه - مثلاً یک داروی بدون‌نسخه یا یک لوازم آرایشی"""
    store       = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products')
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price       = models.DecimalField(max_digits=10, decimal_places=0)
    stock       = models.PositiveIntegerField(default=0, help_text='موجودی انبار')
    image       = models.ImageField(upload_to='products/', null=True, blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.store.name}"

    class Meta:
        verbose_name        = 'محصول'
        verbose_name_plural = 'محصولات'
        ordering             = ['-created_at']


class Order(models.Model):
    """سفارش خرید یک یا چند محصول از یک فروشگاه توسط مشتری"""
    STATUS_CHOICES = [
        ('pending',   'در انتظار تأیید فروشگاه'),
        ('confirmed', 'تأیید و در حال آماده‌سازی'),
        ('completed', 'تحویل داده شد'),
        ('rejected',  'رد شده'),
        ('cancelled', 'لغو شده'),
    ]
    PAYMENT_CHOICES = [
        ('online',  'آنلاین (از کیف پول)'),
        ('on_site', 'حضوری (پرداخت در محل)'),
    ]

    customer       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    store          = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='orders')
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='online')
    is_paid        = models.BooleanField(default=False)
    total_amount   = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    note           = models.TextField(blank=True)
    address        = models.TextField(blank=True, help_text='آدرس تحویل - در صورت خالی، تحویل حضوری در فروشگاه')
    store_note     = models.TextField(blank=True, help_text='یادداشت فروشگاه برای مشتری')
    created_at     = models.DateTimeField(auto_now_add=True)
    resolved_at    = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"سفارش #{self.id} - {self.customer.phone_number} از {self.store.name}"

    class Meta:
        verbose_name        = 'سفارش'
        verbose_name_plural = 'سفارش‌ها'
        ordering             = ['-created_at']


class OrderItem(models.Model):
    """یک قلم از یک سفارش - قیمت لحظه خرید ثبت می‌شود تا تغییر بعدی قیمت محصول روی سفارش‌های قبلی اثر نگذارد"""
    order      = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product    = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, related_name='order_items')
    product_name = models.CharField(max_length=200, help_text='نام محصول در لحظه خرید')
    unit_price = models.DecimalField(max_digits=10, decimal_places=0)
    quantity   = models.PositiveIntegerField(default=1)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.product_name} × {self.quantity}"

    class Meta:
        verbose_name        = 'قلم سفارش'
        verbose_name_plural = 'اقلام سفارش'
