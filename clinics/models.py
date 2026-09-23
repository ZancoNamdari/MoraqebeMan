from decimal import Decimal
from django.db import models
from accounts.models import User


class Category(models.Model):
    """دسته‌بندی: آرایشگاه، کلینیک پوست، اسپا، دندانپزشکی"""
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name        = 'دسته‌بندی'
        verbose_name_plural = 'دسته‌بندی‌ها'


class Clinic(models.Model):
    STATUS_CHOICES = [
        ('pending',  'در انتظار تأیید'),
        ('active',   'فعال'),
        ('inactive', 'غیرفعال'),
    ]

    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clinics')
    category    = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    address     = models.TextField()
    city        = models.CharField(max_length=100)
    lat         = models.FloatField(null=True, blank=True)
    lng         = models.FloatField(null=True, blank=True)
    phone       = models.CharField(max_length=15)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rating      = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    created_at  = models.DateTimeField(auto_now_add=True)
    referred_by_marketer = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='referred_clinics',
        limit_choices_to={'role': 'marketer'}
    )
    commission_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('20.00'),
        help_text='درصد سهم پلتفرم از هر تراکنش این مطب'
    )


    def __str__(self):
        return self.name

    class Meta:
        verbose_name        = 'مطب'
        verbose_name_plural = 'مطب‌ها'


class ClinicImage(models.Model):
    clinic   = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='images')
    image    = models.ImageField(upload_to='clinics/')
    is_cover = models.BooleanField(default=False)

    def __str__(self):
        return f"تصویر {self.clinic.name}"
    
    def save(self, *args, **kwargs):
        if self.is_cover:
            ClinicImage.objects.filter(clinic=self.clinic).update(is_cover=False)
        super().save(*args, **kwargs)


class Service(models.Model):
    """سرویس‌های هر مطب: کوتاهی، رنگ، بوتاکس، ماساژ..."""
    clinic      = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='services')
    category    = models.ForeignKey(
        'ServiceCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clinic_services',
        help_text='در صورتی که این سرویس از فهرست استاندارد انتخاب شده باشد'
    )
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price       = models.DecimalField(max_digits=10, decimal_places=0)
    duration    = models.IntegerField(help_text='مدت زمان به دقیقه')
    is_active   = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.clinic.name} - {self.name}"

    class Meta:
        verbose_name        = 'سرویس'
        verbose_name_plural = 'سرویس‌ها'

class ServiceCategory(models.Model):
    """سرویس استاندارد و از پیش تعریف‌شده برای هر نوع کسب‌وکار (Category).
    وقتی صاحب مطب هنگام ثبت مطب یک Category (نوع کسب‌وکار، مثلاً «سالن بیوتی») را
    انتخاب می‌کند، می‌تواند از میان این فهرست استاندارد، سرویس‌هایی را که ارائه
    می‌دهد انتخاب کند و برای مشتری نمایش داده می‌شود."""

    business_category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='service_options',
        help_text='نوع کسب‌وکاری که این سرویس برای آن تعریف شده (مثلاً سالن بیوتی)'
    )
    name       = models.CharField(max_length=150)
    parent     = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children'
    )
    is_active  = models.BooleanField(default=True)
    order      = models.PositiveIntegerField(default=0, help_text='ترتیب نمایش در فهرست انتخاب')

    def __str__(self):
        return f"{self.business_category.name} - {self.name}"

    class Meta:
        verbose_name        = 'سرویس استاندارد'
        verbose_name_plural = 'سرویس‌های استاندارد'
        ordering            = ['business_category', 'order', 'name']
        unique_together      = ['business_category', 'name']


class WorkSchedule(models.Model):
    """ساعات کاری هر روز هفته"""
    DAYS = [
        (0, 'شنبه'),
        (1, 'یکشنبه'),
        (2, 'دوشنبه'),
        (3, 'سه‌شنبه'),
        (4, 'چهارشنبه'),
        (5, 'پنجشنبه'),
        (6, 'جمعه'),
    ]

    clinic     = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='schedule')
    day        = models.IntegerField(choices=DAYS)
    open_time  = models.TimeField()
    close_time = models.TimeField()
    is_closed  = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.clinic.name} - {self.get_day_display()}"

    class Meta:
        unique_together     = ['clinic', 'day']
        verbose_name        = 'ساعت کاری'
        verbose_name_plural = 'ساعات کاری'

class Doctor(models.Model):
    """اطلاعات پزشک - برای کلینیک‌هایی که چند پزشک دارن"""
    clinic              = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='doctors')
    full_name           = models.CharField(max_length=150)
    specialty           = models.CharField(max_length=150, blank=True)
    medical_license_no  = models.CharField(max_length=50, blank=True, help_text='شماره نظام پزشکی')
    bio                 = models.TextField(blank=True)
    photo               = models.ImageField(upload_to='doctors/', null=True, blank=True)
    years_experience    = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.full_name

    class Meta:
        verbose_name        = 'پزشک'
        verbose_name_plural = 'پزشکان'


class Portfolio(models.Model):
    """نمونه‌کار - عکس یا ویدیو قبل/بعد"""
    MEDIA_TYPE_CHOICES = [
        ('image',       'عکس'),
        ('video_short', 'ویدیو کوتاه (ریلز)'),
        ('video_long',  'ویدیو بلند'),
    ]

    clinic       = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='portfolio_items')
    service      = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True, related_name='portfolio_items')
    media_type   = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES)

    before_image = models.ImageField(upload_to='portfolio/before/', null=True, blank=True)
    after_image  = models.ImageField(upload_to='portfolio/after/',  null=True, blank=True)
    video        = models.FileField(upload_to='portfolio/videos/', null=True, blank=True)
    thumbnail    = models.ImageField(upload_to='portfolio/thumbs/', null=True, blank=True)

    caption      = models.CharField(max_length=300, blank=True)
    is_approved  = models.BooleanField(default=False)  # ادمین باید تایید کنه
    is_featured  = models.BooleanField(default=False)  # نمایش در Explore
    views_count  = models.IntegerField(default=0)
    likes_count  = models.IntegerField(default=0)

    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.clinic.name} - {self.get_media_type_display()}"

    class Meta:
        verbose_name        = 'نمونه‌کار'
        verbose_name_plural = 'نمونه‌کارها'
        ordering            = ['-created_at']


class EducationalVideo(models.Model):
    """ویدیوی آموزشی برای کاربران مطب (مثلاً مراقبت بعد از عمل)"""
    clinic      = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='educational_videos')
    service     = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    title       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    video       = models.FileField(upload_to='education/')
    tag         = models.CharField(max_length=100, blank=True, help_text='مثلاً: مراقبت بعد از عمل')
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name        = 'ویدیوی آموزشی'
        verbose_name_plural = 'ویدیوهای آموزشی'