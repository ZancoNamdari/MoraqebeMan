from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from accounts.models import User
from clinics.models import Clinic


class Doctor(models.Model):
    """صفحه‌ی مستقل پزشک - می‌تواند کاملاً مستقل باشد یا به یک مطب موجود هم متصل باشد (هر دو حالت هم‌زمان ممکن است)"""
    STATUS_CHOICES = [
        ('pending',  'در انتظار تأیید'),
        ('active',   'فعال'),
        ('inactive', 'غیرفعال'),
    ]

    owner       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    clinic      = models.ForeignKey(Clinic, on_delete=models.SET_NULL, null=True, blank=True, related_name='independent_doctors',
                                     help_text='اختیاری - اگر این پزشک به یک مطب هم وصل است')

    full_name           = models.CharField(max_length=150)
    medical_license_no  = models.CharField(max_length=50, help_text='شماره نظام پزشکی')
    specialty           = models.CharField(max_length=150, blank=True)
    bio                 = models.TextField(blank=True, help_text='شرح خدمات')
    photo               = models.ImageField(upload_to='doctors/photo/', null=True, blank=True)

    address       = models.TextField(blank=True)
    city          = models.CharField(max_length=100, blank=True)
    phone         = models.CharField(max_length=15)
    instagram     = models.CharField(max_length=100, blank=True, help_text='آیدی پیج اینستاگرام، بدون @')
    rubika        = models.CharField(max_length=100, blank=True, help_text='آیدی روبیکا')
    bale          = models.CharField(max_length=100, blank=True, help_text='آیدی بله')

    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rating      = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name

    class Meta:
        verbose_name        = 'پزشک (صفحه مستقل)'
        verbose_name_plural = 'پزشکان (صفحه مستقل)'


class DoctorTariff(models.Model):
    """یک ردیف از لیست تعرفه‌های پزشک"""
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='tariffs')
    title  = models.CharField(max_length=150)
    price  = models.DecimalField(max_digits=10, decimal_places=0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.title} - {self.doctor.full_name}"

    class Meta:
        verbose_name        = 'ردیف تعرفه'
        verbose_name_plural = 'لیست تعرفه‌ها'


class DoctorPost(models.Model):
    """پست پزشک در صفحه‌اش - عکس یا ویدیو به‌همراه کپشن"""
    MEDIA_TYPE_CHOICES = [('image', 'عکس'), ('video', 'ویدیو')]

    doctor     = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='posts')
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    image      = models.ImageField(upload_to='doctors/posts/', null=True, blank=True)
    video      = models.FileField(upload_to='doctors/posts/', null=True, blank=True)
    caption    = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"پست {self.doctor.full_name} - {self.created_at:%Y-%m-%d}"

    class Meta:
        verbose_name        = 'پست پزشک'
        verbose_name_plural = 'پست‌های پزشک'
        ordering             = ['-created_at']


class DoctorAvailability(models.Model):
    """بازه‌ی زمانی هفتگی که پزشک برای رزرو نوبت باز است (تکرارشونده هر هفته)"""
    WEEKDAY_CHOICES = [
        (0, 'شنبه'), (1, 'یکشنبه'), (2, 'دوشنبه'), (3, 'سه‌شنبه'),
        (4, 'چهارشنبه'), (5, 'پنجشنبه'), (6, 'جمعه'),
    ]
    doctor     = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='availabilities')
    weekday    = models.IntegerField(choices=WEEKDAY_CHOICES)
    start_time = models.TimeField()
    end_time   = models.TimeField()
    is_active  = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.doctor.full_name} - {self.get_weekday_display()} {self.start_time}-{self.end_time}"

    class Meta:
        verbose_name        = 'بازه در دسترس بودن'
        verbose_name_plural = 'بازه‌های در دسترس بودن'
        ordering             = ['weekday', 'start_time']


class DoctorAppointment(models.Model):
    """درخواست نوبت بیمار از یک پزشک"""
    STATUS_CHOICES = [
        ('pending',             'در انتظار تأیید'),
        ('confirmed',           'تأیید شده'),
        ('completed',           'انجام شده'),
        ('rejected',            'رد شده'),
        ('cancelled',           'لغو شده توسط بیمار'),
        ('reschedule_requested', 'درخواست جابه‌جایی'),
    ]

    doctor          = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='appointments')
    patient         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctor_appointments')
    tracking_code   = models.CharField(max_length=12, unique=True, editable=False)

    full_name       = models.CharField(max_length=150)
    national_id     = models.CharField(max_length=10, help_text='کد ملی')
    phone           = models.CharField(max_length=15)
    disease_type    = models.CharField(max_length=200, help_text='نوع بیماری / علت مراجعه')

    requested_date  = models.DateField()
    requested_time  = models.TimeField()

    id_card_image    = models.ImageField(upload_to='doctors/appointments/id_card/', null=True, blank=True)
    prescription_image = models.ImageField(upload_to='doctors/appointments/prescription/', null=True, blank=True)

    status          = models.CharField(max_length=25, choices=STATUS_CHOICES, default='pending')
    doctor_note     = models.TextField(blank=True)

    reschedule_requested_date = models.DateField(null=True, blank=True)
    reschedule_requested_time = models.TimeField(null=True, blank=True)
    reschedule_note            = models.TextField(blank=True)

    created_at  = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.tracking_code:
            import random, string
            self.tracking_code = ''.join(random.choices(string.digits, k=10))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"نوبت {self.full_name} نزد {self.doctor.full_name} ({self.tracking_code})"

    class Meta:
        verbose_name        = 'نوبت پزشک'
        verbose_name_plural = 'نوبت‌های پزشک'
        ordering             = ['-created_at']


class DoctorConversation(models.Model):
    """یک گفتگوی مستقیم بین یک بیمار و یک پزشک"""
    doctor     = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='conversations')
    patient    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctor_conversations')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient.phone_number} <-> {self.doctor.full_name}"

    class Meta:
        verbose_name        = 'گفتگو با پزشک'
        verbose_name_plural = 'گفتگوها با پزشک'
        unique_together      = ['doctor', 'patient']


class DoctorChatMessage(models.Model):
    SENDER_CHOICES = [('patient', 'بیمار'), ('doctor', 'پزشک')]

    conversation = models.ForeignKey(DoctorConversation, on_delete=models.CASCADE, related_name='messages')
    sender       = models.CharField(max_length=10, choices=SENDER_CHOICES)
    content      = models.TextField()
    is_read      = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'پیام'
        verbose_name_plural = 'پیام‌ها'
        ordering             = ['created_at']


class DoctorReview(models.Model):
    """امتیاز و نظر بیمار برای صفحه‌ی پزشک"""
    doctor      = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='reviews')
    patient     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctor_reviews')
    appointment = models.OneToOneField(DoctorAppointment, on_delete=models.CASCADE, null=True, blank=True)
    rating      = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment     = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient.phone_number} - {self.doctor.full_name} ({self.rating}⭐)"

    class Meta:
        verbose_name        = 'نظر برای پزشک'
        verbose_name_plural = 'نظرات برای پزشک'
        ordering             = ['-created_at']
        unique_together      = ['doctor', 'patient', 'appointment']
