from django.db import models
from django.utils import timezone
from django_jalali.db import models as jmodels
from django.utils.text import slugify
from django.utils.crypto import get_random_string

from .choices import (

    AcceptedGender,
    AcquaintanceDuration,
    EducationLevel,
    EmergencyContactRelation,
    ExperienceRange,
    FamilyPresencePreference,
    Gender,
    HeightRange,
    LiftingCapacity,
    MaritalStatus,
    MaxCommuteTime,
    MilitaryStatus,
    PatientsCaredForCount,
    PhysicalAbility,
    ReferenceRelationType,
    SmokingStatus,
    WeightRange,
    WorkStatus,
    ChildrenCount,
)


# ============================================================
# Form 1 - Identity Information
#
# Relocated here from apps.accounts per an explicit reorganization
# (each role app owns its own identity/domain data end-to-end, rather
# than a shared accounts.IdentityProfile). Note for the future: if
# PATIENT or another role ever needs the same identity-verification
# shape, it will need its own copy rather than reusing this one - this
# model is now caregiver-scoped, not shared. That's a deliberate
# tradeoff, not an oversight; flagging it here so it isn't forgotten.
# ============================================================


class IdentityProfile(models.Model):
    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="caregiver_identity_profile",
        verbose_name="کاربر",
    )
    
    father_name = models.CharField(max_length=150, blank=True, verbose_name="نام پدر")
    birth_certificate_number = models.CharField(max_length=30, blank=True, verbose_name="شماره شناسنامه")
    birth_certificate_issue_place = models.CharField(max_length=150, blank=True, verbose_name="محل صدور شناسنامه")
    birth_date = jmodels.jDateField(null=True, blank=True, verbose_name="تاریخ تولد")
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True, verbose_name="جنسیت")
    marital_status = models.CharField(max_length=20, choices=MaritalStatus.choices, blank=True, verbose_name="وضعیت تأهل")
    children_count = models.CharField(max_length=20, choices=ChildrenCount.choices, blank=True, verbose_name="تعداد فرزندان")
    military_status = models.CharField(
        max_length=30, choices=MilitaryStatus.choices, null=True, blank=True,
        verbose_name="وضعیت نظام وظیفه", help_text="فقط برای جنسیت مرد",
    )
    height_range = models.CharField(max_length=20, choices=HeightRange.choices, blank=True, verbose_name="قد")
    weight_range = models.CharField(max_length=20, choices=WeightRange.choices, blank=True, verbose_name="وزن")
    ethnicities = models.JSONField(default=list, blank=True, verbose_name="قومیت / زبان مادری")
    has_chronic_disease = models.BooleanField(null=True, blank=True, default=False, verbose_name="آیا بیماری مزمن دارد؟")
    chronic_disease_types = models.JSONField(default=list, blank=True, verbose_name="نوع بیماری‌های مزمن؟")
    takes_permanent_medication = models.BooleanField(null=True, blank=True, default=False, verbose_name="آیا دارویی به صورت دائمی مصرف می‌کند؟")
    medication_types = models.JSONField(default=list, blank=True, verbose_name="نوع داروها؟")
    emergency_contact_phone = models.CharField(max_length=15, blank=True, verbose_name="شماره تماس اضطراری")
    emergency_contact_relation = models.CharField(
        max_length=20, choices=EmergencyContactRelation.choices, blank=True, verbose_name="نسبت با تماس اضطراری")
    landline_phone = models.CharField(max_length=15, blank=True, verbose_name="تلفن ثابت")
    province = models.CharField(max_length=100, blank=True, verbose_name="استان")
    city = models.CharField(max_length=100, blank=True, verbose_name="شهر")
    district = models.CharField(max_length=100, blank=True, verbose_name="منطقه")
    postal_code = models.CharField(max_length=10, blank=True, verbose_name="کد پستی")
    full_address = models.TextField(blank=True, verbose_name="آدرس کامل")
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "پروفایل هویتی"
        verbose_name_plural = "پروفایل‌های هویتی"

    @property
    def full_name(self):
        return (
        self.user.get_full_name().strip()
        or self.user.username )

    def __str__(self):
        return self.full_name

# ============================================================
# Caregiver Profile - hub model with a real approval workflow
# ============================================================


class CaregiverStatus(models.TextChoices):
    DRAFT = "draft", "پیش‌نویس"
    PENDING = "pending", "در انتظار بررسی"
    APPROVED = "approved", "تأیید شده"
    REJECTED = "rejected", "رد شده"
    SUSPENDED = "suspended", "تعلیق شده"


class CaregiverProfile(models.Model):
    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="caregiver_profile", verbose_name="کاربر")
    slug = models.SlugField(max_length=220, blank=True,null=True,db_index=True, verbose_name="شناسه یکتا")
    status = models.CharField(
        max_length=20, choices=CaregiverStatus.choices, default=CaregiverStatus.DRAFT, verbose_name="وضعیت ثبت‌ نام")
    approved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="approved_caregivers", verbose_name="تأییدشده توسط")
    approved_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان تأیید")
    rejection_reason = models.TextField(blank=True, verbose_name="دلیل رد شدن")

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "پروفایل مراقب"
        verbose_name_plural = "پروفایل‌های مراقب"

    def generate_slug(self):
        base = slugify(
            self.user.get_full_name(),
            allow_unicode=True,
        )

        if not base:
            base = "caregiver"

        slug = base

        while CaregiverProfile.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base}-{get_random_string(6).lower()}"

        return slug

    def save(self, *args, **kwargs):
        if self._state.adding and not self.slug:
            self.slug = self.generate_slug()

        super().save(*args, **kwargs)


    def approve(self, admin_user):
        old_status = self.status
        self.status = CaregiverStatus.APPROVED
        self.approved_by = admin_user
        self.approved_at = timezone.now()
        self.rejection_reason = ""
        self.save(update_fields=[
            "status",
            "approved_by",
            "approved_at",
            "rejection_reason",
        ])
        CaregiverApprovalLog.objects.create(
            caregiver=self, old_status=old_status, new_status=CaregiverStatus.APPROVED,
            performed_by=admin_user,
        )

    def reject(self, admin_user, reason=""):
        old_status = self.status
        self.status = CaregiverStatus.REJECTED
        self.approved_by = None
        self.approved_at = None
        self.rejection_reason = reason
        self.save(update_fields=[
            "status",
            "approved_by",
            "approved_at",
            "rejection_reason",
        ])
        CaregiverApprovalLog.objects.create(
            caregiver=self, old_status=old_status, new_status=CaregiverStatus.REJECTED,
            performed_by=admin_user, note=reason,
        )

    @property
    def display_name(self):
        identity = getattr(
            self.user,
            "caregiver_identity_profile",
            None,
        )

        if identity:
            return identity.full_name

        return self.user.get_full_name() or self.user.username


class CaregiverApprovalLog(models.Model):
    """Audit trail of every status change - who did it, when, and why.
    Written automatically by CaregiverProfile.approve()/reject(), not
    meant to be created directly."""
    caregiver = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name="approval_logs", verbose_name="مراقب")
    old_status = models.CharField(max_length=20, verbose_name="وضعیت قبلی")
    new_status = models.CharField(max_length=20, verbose_name="وضعیت جدید")
    performed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, verbose_name="انجام‌دهنده")
    note = models.TextField(blank=True, verbose_name="یادداشت")
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ")

    class Meta:
        verbose_name = "لاگ بررسی مراقب"
        verbose_name_plural = "لاگ‌های بررسی مراقبان"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.caregiver.display_name}: {self.old_status} -> {self.new_status}"


# ============================================================
# Form 2 - work preferences
# ============================================================


class CaregiverWorkPreferences(models.Model):
    profile = models.OneToOneField(CaregiverProfile, on_delete=models.CASCADE, related_name="work_preferences", verbose_name="پروفایل مراقب")
    collaboration_types = models.JSONField(default=list, verbose_name="نوع همکاری")
    work_status = models.CharField(max_length=20, choices=WorkStatus.choices, blank=True, verbose_name="وضعیت کاری")
    family_presence_preference = models.CharField(max_length=20, choices=FamilyPresencePreference.choices, blank=True, verbose_name="حضور خانواده سالمند")
    accepted_gender = models.CharField(max_length=20, choices=AcceptedGender.choices, blank=True, verbose_name="جنسیت قابل قبول")
    accepted_age_ranges = models.JSONField(default=list, verbose_name="محدوده سنی")
    offered_services = models.JSONField(default=list, verbose_name="خدمات قابل ارائه")
    accepted_physical_conditions = models.JSONField(default=list, verbose_name="شرایط جسمانی پذیرفته")
    lifting_capacity = models.CharField(max_length=20, choices=LiftingCapacity.choices, blank=True, verbose_name="توانایی جابجایی")
    service_locations = models.JSONField(default=list, verbose_name="محل ارائه خدمت")
    max_commute_time = models.CharField(max_length=20, choices=MaxCommuteTime.choices, blank=True, verbose_name="حداکثر زمان رفت‌وآمد")
    available_days = models.JSONField(default=list, verbose_name="روزهای کاری")
    available_shifts = models.JSONField(default=list, verbose_name="شیفت‌های کاری")
    commute_methods = models.JSONField(default=list, blank=True, verbose_name="روش رفت‌وآمد")
    smoking_status = models.CharField(max_length=20, choices=SmokingStatus.choices, blank=True, verbose_name="وضعیت استعمال دخانیات")
    pets_ok = models.BooleanField(null=True, blank=True,default=False, verbose_name="پذیرش حیوان خانگی")
    holiday_work_ok = models.BooleanField(null=True, blank=True,default=True, verbose_name="کار در تعطیلات")
    overnight_stay_ok = models.BooleanField(null=True, blank=True,default=False, verbose_name="اقامت شبانه")
    terms_accepted = models.BooleanField(default=False,verbose_name="پذیرش قوانین")
    terms_accepted_at = jmodels.jDateTimeField(null=True,blank=True,verbose_name="زمان پذیرش قوانین")

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "شرایط همکاری مراقب"
        verbose_name_plural = "شرایط همکاری مراقبان"

    def __str__(self):
        return f"شرایط همکاری — {self.profile.display_name}"


class CaregiverServiceArea(models.Model):
    profile = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name="service_areas", verbose_name="مراقب")
    province = models.CharField(max_length=100, blank=True, verbose_name="استان")
    city = models.CharField(max_length=100, blank=True, verbose_name="شهر")
    district = models.CharField(max_length=100, blank=True, verbose_name="منطقه")

    class Meta:
        unique_together = ("profile", "province", "city", "district")
        verbose_name = "منطقه خدماتی مراقب"
        verbose_name_plural = "مناطق خدماتی مراقبان"

    def __str__(self):
        return f"{self.province}/{self.city}/{self.district}"


# ============================================================
# Form 3, part 1 - experience
# ============================================================


class CaregiverExperience(models.Model):
    profile = models.OneToOneField(CaregiverProfile, on_delete=models.CASCADE, related_name="experience", verbose_name="پروفایل مراقب")

    elderly_care_experience = models.CharField(max_length=20, choices=ExperienceRange.choices, blank=True, verbose_name="تجربه مراقبت سالمند")
    other_services_experience = models.CharField(max_length=20, choices=ExperienceRange.choices, blank=True, verbose_name="تجربه خدمات دیگر")
    previous_workplaces = models.JSONField(default=list, blank=True, verbose_name="محل‌های سابق فعالیت")
    patients_cared_for_count = models.CharField(max_length=20, choices=PatientsCaredForCount.choices, blank=True, verbose_name="تعداد بیماران مراقبت‌شده")
    special_conditions_experience = models.JSONField(default=list, blank=True, verbose_name="تجربه شرایط خاص")
    live_in_experience = models.BooleanField(null=True, blank=True,default=False, verbose_name="تجربه مراقبت مقیم")
    couple_care_experience = models.BooleanField(null=True, blank=True,default=False, verbose_name="تجربه مراقبت از زوج")
    solo_elderly_care_experience = models.BooleanField(null=True, blank=True,default=False, verbose_name="مراقبت تنها از سالمند")
    driving_for_patient_experience = models.BooleanField(null=True, blank=True,default=False, verbose_name="رانندگی برای بیمار")
    last_workplace = models.CharField(max_length=200, blank=True, verbose_name="آخرین محل فعالیت")
    additional_notes = models.TextField(blank=True, max_length=500, verbose_name="توضیحات تکمیلی")

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "سوابق کاری مراقب"
        verbose_name_plural = "سوابق کاری مراقبان"

    def __str__(self):
        return f"سوابق کاری — {self.profile.display_name}"


# ============================================================
# Form 3, part 2 - skills
# ============================================================


class CaregiverSkills(models.Model):
    profile = models.OneToOneField(CaregiverProfile, on_delete=models.CASCADE, related_name="skills", verbose_name="پروفایل مراقب")

    education_level = models.CharField(max_length=20, choices=EducationLevel.choices, blank=True, verbose_name="سطح تحصیلات")
    field_of_study = models.CharField(max_length=150, blank=True, verbose_name="رشته تحصیلی")
    training_courses = models.JSONField(default=list, blank=True, verbose_name="دوره‌های آموزشی")
    communication_skills = models.JSONField(default=list, blank=True, verbose_name="مهارت‌های ارتباطی")
    caregiving_skills = models.JSONField(default=list, blank=True, verbose_name="مهارت‌های مراقبتی")
    physical_ability = models.CharField(max_length=20, choices=PhysicalAbility.choices, blank=True, verbose_name="توانایی فیزیکی")
    mobility_assistance_ability = models.JSONField(default=list, blank=True, verbose_name="توانایی کمک به جابجایی")
    household_skills = models.JSONField(default=list, blank=True, verbose_name="مهارت‌های خانگی")
    foreign_languages = models.JSONField(default=list, blank=True, verbose_name="زبان‌های خارجی")
    local_languages = models.JSONField(default=list, blank=True, verbose_name="زبان‌های محلی")
    has_driving_license = models.BooleanField(null=True, blank=True, default=False, verbose_name="گواهینامه رانندگی")
    can_use_smartphone = models.BooleanField(null=True, blank=True, default=False, verbose_name="توانایی استفاده از تلفن هوشمند")
    additional_notes = models.TextField(blank=True, max_length=500, verbose_name="توضیحات تکمیلی")

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "مهارت‌های مراقب"
        verbose_name_plural = "مهارت‌های مراقبان"

    def __str__(self):
        return f"مهارت‌ها — {self.profile.display_name}"


# ============================================================
# Form 4 - references
# ============================================================


class CaregiverReference(models.Model):
    """At least two required per caregiver - enforced in the
    serializer/service layer, not the DB (a DB constraint can't count
    sibling rows against a per-profile minimum)."""
    profile = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name="references", verbose_name="پروفایل مراقب")

    full_name = models.CharField(max_length=150, verbose_name="نام کامل معرف")
    occupation = models.CharField(max_length=150, blank=True, verbose_name="شغل معرف")
    relation_type = models.CharField(max_length=30, choices=ReferenceRelationType.choices, blank=True, verbose_name="نسبت با معرف")
    acquaintance_duration = models.CharField(max_length=20, choices=AcquaintanceDuration.choices, blank=True, verbose_name="مدت آشنایی")
    phone_number = models.CharField(max_length=15, verbose_name="شماره تلفن")
    callable_for_inquiry = models.BooleanField(default=True, verbose_name="امکان تماس جهت استعلام")

    is_verified = models.BooleanField(default=False, verbose_name="تأیید شده")
    verification_note = models.TextField(blank=True, verbose_name="یادداشت بررسی")
    verified_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="verified_caregiver_references", verbose_name="بررسی‌شده توسط",
    )
    verified_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان بررسی")

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "معرف مراقب"
        verbose_name_plural = "معرف‌های مراقبان"
        indexes = [
            models.Index(fields=["phone_number"]),
            models.Index(fields=["is_verified"]),
        ]

    def verify(self, admin_user, note=""):
        self.is_verified = True
        self.verified_by = admin_user
        self.verified_at = timezone.now()
        self.verification_note = note
        self.save()

    def __str__(self):
        return self.full_name
