from decimal import Decimal
from django.db import models
from accounts.models import User
from bookings.models import BookingRequest


class Wallet(models.Model):
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance    = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    cashback   = models.DecimalField(max_digits=12, decimal_places=0, default=0)  # ← جدید
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_balance(self):
        return self.balance + self.cashback

    def __str__(self):
        return f"{self.user.phone_number} - نقد:{self.balance} کشبک:{self.cashback}"

    class Meta:
        verbose_name        = 'کیف پول'
        verbose_name_plural = 'کیف پول‌ها'

class Transaction(models.Model):
    TYPE_CHOICES = [
        ('charge',          'شارژ کیف پول'),
        ('payment',         'پرداخت سرویس'),
        ('refund',          'بازگشت وجه'),
        ('cashback',        'کشبک خرید'),        # ← جدید
        ('referral_reward', 'پاداش معرف'),
        ('marketer_commission', 'کمیسیون بازاریاب'),        # ← جدید
    ]

    STATUS_CHOICES = [
        ('pending', 'در انتظار'),
        ('success', 'موفق'),
        ('failed',  'ناموفق'),
    ]

    wallet           = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    booking          = models.ForeignKey(BookingRequest, on_delete=models.SET_NULL, null=True, blank=True)
    order            = models.ForeignKey('stores.Order', on_delete=models.SET_NULL, null=True, blank=True, help_text='در صورتی که این تراکنش مربوط به خرید از یک فروشگاه باشد')
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount           = models.DecimalField(max_digits=12, decimal_places=0)
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    ref_id           = models.CharField(max_length=100, blank=True)
    description      = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.wallet.user.phone_number} - {self.transaction_type} - {self.amount}"

    class Meta:
        verbose_name        = 'تراکنش'
        verbose_name_plural = 'تراکنش‌ها'
        ordering            = ['-created_at']

class MarketerCommission(models.Model):
    """نرخ کمیسیون هر بازاریاب - قابل تنظیم توسط ادمین"""
    marketer            = models.OneToOneField('accounts.User', on_delete=models.CASCADE, related_name='commission_settings')
    customer_commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('5.00'), help_text='درصد از تراکنش مشتریانی که معرفی کرده')
    clinic_commission_percent   = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('3.00'), help_text='درصد از تراکنش مطب‌هایی که آورده')
    is_active            = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.marketer.phone_number} - مشتری:{self.customer_commission_percent}% مطب:{self.clinic_commission_percent}%"

    class Meta:
        verbose_name        = 'تنظیمات کمیسیون بازاریاب'
        verbose_name_plural = 'تنظیمات کمیسیون بازاریابان'

class ClinicPayout(models.Model):
    """تسویه‌حساب با مطب - ادمین وقتی پول رو واقعا واریز می‌کند ثبت می‌کند"""
    STATUS_CHOICES = [
        ('pending', 'در انتظار تسویه'),
        ('paid',    'تسویه شده'),
    ]

    clinic       = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='payouts')
    amount       = models.DecimalField(max_digits=12, decimal_places=0)
    period_start = models.DateField()
    period_end   = models.DateField()
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_at      = models.DateTimeField(null=True, blank=True)
    admin_note   = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.clinic.name} - {self.amount} ({self.get_status_display()})"

    class Meta:
        verbose_name        = 'تسویه‌حساب مطب'
        verbose_name_plural = 'تسویه‌حساب‌های مطب'
        ordering            = ['-created_at']

class PlatformSettings(models.Model):
    """نرخ‌های کلی پلتفرم که ادمین می‌تواند تغییر دهد - به‌جای عدد ثابت در کد.
    یک رکورد singleton (همیشه فقط یک ردیف با id=1 وجود دارد)."""
    cashback_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('5.00'),
        help_text='درصد کش‌بکی که در هر تراکنش به کیف‌پول مشتری برمی‌گردد'
    )
    referral_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('5.00'),
        help_text='درصد پاداش معرف از هر تراکنش کاربری که معرفی کرده (در هر تراکنش، نه فقط بار اول)'
    )
    default_marketer_customer_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('5.00'),
        help_text='نرخ پیش‌فرض کمیسیون بازاریاب از مشتریانی که مشاوره داده - فقط برای بازاریابان جدید (بازاریابان فعلی از نرخ اختصاصی خودشان استفاده می‌کنند)'
    )
    default_marketer_clinic_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('3.00'),
        help_text='نرخ پیش‌فرض کمیسیون بازاریاب از مطب‌هایی که معرفی کرده - فقط برای بازاریابان جدید'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'تنظیمات نرخ‌های پلتفرم'
        verbose_name_plural = 'تنظیمات نرخ‌های پلتفرم'

    def save(self, *args, **kwargs):
        self.pk = 1  # الگوی singleton - همیشه همون یک ردیف آپدیت می‌شود
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # حذف این تنظیمات مجاز نیست

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return 'تنظیمات نرخ‌های پلتفرم'
