from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils import timezone
from django_jalali.db import models as jmodels
from django.utils.text import slugify
from django.utils.crypto import get_random_string

from .choices import (

    AcceptedGender,
    AcquaintanceDuration,
    CleaningWillingness,
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
    NightStayUntil,
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
    national_id = models.CharField(max_length=10, blank=True, verbose_name="شماره ملی")
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
    psychiatric_medication_detail = models.TextField(
        blank=True, max_length=500, verbose_name="داروهای مصرفی برای مشکلات روحی/روانی",
        help_text="فقط وقتی «مشکلات روحی و روانی» در نوع بیماری انتخاب شده باشد.",
    )
    emergency_contact_phone = models.CharField(max_length=15, blank=True, verbose_name="شماره تماس اضطراری")
    emergency_contact_relation = models.CharField(
        max_length=20, choices=EmergencyContactRelation.choices, blank=True, verbose_name="نسبت با تماس اضطراری")
    landline_phone = models.CharField(max_length=15, blank=True, verbose_name="تلفن ثابت")
    province = models.ForeignKey("locations.Province", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="استان")
    city = models.ForeignKey("locations.City", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="شهر")
    district = models.ForeignKey("locations.District", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="منطقه")
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
    NEEDS_MORE_DOCS = "needs_more_docs", "نیاز به مدارک بیشتر"
    APPROVED = "approved", "تأیید شده"
    REJECTED = "rejected", "رد شده"
    SUSPENDED = "suspended", "تعلیق شده"


class CaregiverAgencyPipelineStatus(models.TextChoices):
    """
    The agency-side service pipeline a caregiver moves through, shown
    as a Kanban board in agency-panel (خدمت‌دهنده) — deliberately a
    separate concept from CaregiverStatus above, which is this
    platform's own review/approval status, not any one agency's
    day-to-day operational tracking of that caregiver.
    """
    REGISTERED = "registered", "ثبت در سایت"
    DOCUMENTS_IN_PROGRESS = "documents_in_progress", "تکمیل مدارک"
    BEING_DISPATCHED = "being_dispatched", "در حال اعزام"
    ON_ASSIGNMENT = "on_assignment", "در حال مأموریت"
    FIRST_WEEK = "first_week", "هفته اول"
    CONFIRMED = "confirmed", "تأیید شده"
    EXPIRED = "expired", "منقضی‌ها"


class CaregiverProcessMilestone(models.TextChoices):
    """
    The 12-stage overall matching-process flow, per the confirmed
    requirement — deliberately NOT the Kanban's own column structure
    (that stays as CaregiverAgencyPipelineStatus above, unchanged).
    These are attachable milestone tags: any subset can be present on
    a given caregiver's ManyToMany-style list (stored as
    CaregiverProfile.process_milestones, a JSONField of these
    values), marking which points in the broader matching lifecycle
    apply right now — most notably CONTRACT_ENDING_SOON, which
    triggers a dashboard reminder to renew the contract.
    """
    AVAILABILITY = "availability", "در دسترس بودن"
    AFTER_MATCH = "after_match", "پس از تطبیق"
    CAREGIVER_COORDINATION = "caregiver_coordination", "هماهنگی با خدمت‌دهنده"
    PATIENT_COORDINATION = "patient_coordination", "هماهنگی با خدمت‌گیرنده"
    DISPATCH = "dispatch", "اعزام نیرو"
    FINAL_CONFIRMATION = "final_confirmation", "تایید نهایی"
    CAREGIVER_SUPPORT = "caregiver_support", "پشتیبانی خدمت‌دهنده"
    PATIENT_SUPPORT = "patient_support", "پشتیبانی خدمت‌گیرنده"
    MUTUAL_SURVEY = "mutual_survey", "نظرسنجی طرفین از تطبیق"
    CONTRACT_ENDING_SOON = "contract_ending_soon", "در شرف اتمام قرارداد"
    CONTRACT_RENEWAL = "contract_renewal", "تمدید قرارداد"
    CONTRACT_COMPLETED = "contract_completed", "اتمام قرارداد"


class CaregiverDocumentType(models.TextChoices):
    """
    One-to-one with the seven doc_* booleans on CaregiverProfile below
    — this is the upload+review record BEHIND each of those flags;
    the boolean itself stays the fast-read summary everywhere it's
    already used (Kanban badge count, reminder rules), and is kept in
    sync automatically whenever a CaregiverDocumentUpload's status
    changes (see CaregiverDocumentUpload.save()/sync_profile_flag()).
    """
    NO_CRIMINAL_RECORD = "no_criminal_record", "عدم سوءپیشینه"
    NO_ADDICTION_TEST = "no_addiction_test", "آزمایش عدم اعتیاد"
    IDENTITY_VERIFIED = "identity_verified", "تأیید مدارک هویتی"
    PERSONAL_PHOTO = "personal_photo", "عکس پرسنلی"
    MENTAL_HEALTH_TEST = "mental_health_test", "آزمون سلامت روان"
    PROMISSORY_NOTE = "promissory_note", "دریافت سفته/ضمانت"
    ID_CARD_RECEIVED = "id_card_received", "دریافت مدرک شناسایی"


class CaregiverDocumentReviewStatus(models.TextChoices):
    PENDING = "pending", "در انتظار بررسی"
    APPROVED = "approved", "تأیید شده"
    REJECTED = "rejected", "رد شده"


def caregiver_document_upload_path(instance, filename):
    return f"caregivers/{instance.caregiver_id}/documents/{instance.document_type}/{filename}"


class CaregiverDocumentUpload(models.Model):
    """
    The actual file behind one of the seven "تکمیل مدارک" checklist
    items — added because a plain checkbox that any agency staff can
    click has no way to prove the document was ever really provided.
    Agency staff (admin/supervisor/owner) uploads the file from
    agency-panel's checklist drawer; a "کارشناس" reviews and
    approves/rejects it — either platform admin/superuser (from
    admin-panel's caregiver detail page) or that SAME agency's own
    supervisor/owner (from agency-panel) — see
    apps.caregivers.document_views for the shared permission check
    both panels hit. Deliberately NOT the uploader themselves: an
    agency admin enters the file, but approval needs a second, more
    senior pair of eyes (the "supervisor" hierarchy already
    established elsewhere in this codebase), never a self-approval.

    One row per (caregiver, document_type) — re-uploading (e.g. after
    a rejection) replaces the file on the same row and resets it back
    to PENDING, rather than piling up a history of every past
    attempt; a rejected document is a redo, not an archived record.
    """
    caregiver = models.ForeignKey(
        "caregivers.CaregiverProfile", on_delete=models.CASCADE, related_name="document_uploads",
        verbose_name="مراقب",
    )
    document_type = models.CharField(max_length=30, choices=CaregiverDocumentType.choices, verbose_name="نوع مدرک")
    file = models.FileField(upload_to=caregiver_document_upload_path, verbose_name="فایل")
    status = models.CharField(
        max_length=20, choices=CaregiverDocumentReviewStatus.choices,
        default=CaregiverDocumentReviewStatus.PENDING, db_index=True, verbose_name="وضعیت بررسی",
    )
    uploaded_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="caregiver_documents_uploaded", verbose_name="بارگذاری‌کننده",
    )
    uploaded_at = jmodels.jDateTimeField(auto_now=True, verbose_name="زمان بارگذاری")
    reviewed_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="caregiver_documents_reviewed", verbose_name="بررسی‌کننده",
    )
    reviewed_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان بررسی")
    rejection_reason = models.TextField(blank=True, verbose_name="دلیل رد شدن")

    class Meta:
        unique_together = ("caregiver", "document_type")
        verbose_name = "مدرک بارگذاری‌شده مراقب"
        verbose_name_plural = "مدارک بارگذاری‌شده مراقبان"

    def __str__(self):
        return f"{self.caregiver_id} — {self.document_type} ({self.status})"

    def _sync_profile_flag(self):
        field_name = f"doc_{self.document_type}"
        setattr(self.caregiver, field_name, self.status == CaregiverDocumentReviewStatus.APPROVED)
        self.caregiver.save(update_fields=[field_name])

    def approve(self, reviewer):
        self.status = CaregiverDocumentReviewStatus.APPROVED
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.rejection_reason = ""
        self.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"])
        self._sync_profile_flag()

    def reject(self, reviewer, reason: str):
        self.status = CaregiverDocumentReviewStatus.REJECTED
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.rejection_reason = reason
        self.save(update_fields=["status", "reviewed_by", "reviewed_at", "rejection_reason"])
        self._sync_profile_flag()  # false — a rejected document is not a satisfied checklist item


class CaregiverProfile(models.Model):
    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="caregiver_profile", verbose_name="کاربر")
    slug = models.SlugField(max_length=220, blank=True,null=True,db_index=True, verbose_name="شناسه یکتا")
    status = models.CharField(
        max_length=20, choices=CaregiverStatus.choices, default=CaregiverStatus.DRAFT,
        db_index=True, verbose_name="وضعیت ثبت‌ نام")
    # No `choices=` here — same reasoning as PatientProfile.
    # pipeline_status in apps.families.models: an agency's real valid
    # stage values now live in AgencyPipelineStage, per agency, and
    # can grow past the original 7, so a fixed enum here would make
    # DRF reject a legitimately-added custom stage the moment any
    # serializer touches this field.
    agency_pipeline_status = models.CharField(
        max_length=30, default=CaregiverAgencyPipelineStatus.REGISTERED, db_index=True,
        verbose_name="مرحله کاریز خدمت (آژانس)",
    )
    process_milestones = models.JSONField(
        default=list, blank=True, verbose_name="نقاط عطف فرآیند تطبیق",
        help_text="زیرمجموعه‌ای از CaregiverProcessMilestone که هم‌اکنون روی این مراقب صدق می‌کند — جدا از agency_pipeline_status بالا.",
    )
    is_urgent = models.BooleanField(
        default=False, verbose_name="فوری",
        help_text="برچسب فوری روی کارت این مراقب در کاریز آژانس نمایش داده می‌شود.",
    )
    tags = models.JSONField(
        default=list, blank=True, verbose_name="برچسب‌ها",
        help_text="برچسب‌های آزاد آژانس روی این مراقب — مثلاً دسته خدمت (پرستار، بهیار، سالمندیار) یا هر برچسب دیگری، برای دسته‌بندی و فیلتر آینده کاریز.",
    )
    # The structured counterpart to the free-form `tags` above —
    # chosen right after step 0 (name/phone), before Form 1. A
    # caregiver can hold several service types at once (checkbox,
    # not radio): one CaregiverProfile, one unique id, appearing in
    # every selected type's pool/list — never duplicated per type.
    # Form 1 (identity) and Form 4 (references) stay identical across
    # every service type on purpose (per explicit decision), so no
    # schema fork is needed there; only this tag set drives which
    # pool(s) a caregiver shows up in.
    service_types = models.JSONField(
        default=list, blank=True, verbose_name="نوع خدمت",
        help_text="یک یا چند مورد از: سالمندیار، کودک‌یار، نظافت‌چی، مادریار، پرستار، بهیار.",
    )
    service_subtypes = models.JSONField(
        default=dict, blank=True, verbose_name="زیرشاخه نوع خدمت",
        help_text="دیکشنری {نوع خدمت: [زیرشاخه‌های انتخابی]} — مثلاً {\"nezafatchi\": [\"cooking\", \"inside_home\"]}.",
    )
    # The seven checklist items specific to the "تکمیل مدارک"
    # (DOCUMENTS_IN_PROGRESS) pipeline stage — kept as plain booleans
    # directly on the profile rather than a separate model, since
    # every caregiver has exactly one fixed set of these, never a
    # variable list. Each one is now backed by a CaregiverDocumentUpload
    # row (see above) holding the actual file + review status; these
    # booleans stay in sync with that row's approval state (kept here,
    # not derived on the fly, since they're already read everywhere —
    # the Kanban badge count, reminder rules — as plain fields).
    doc_no_criminal_record = models.BooleanField(default=False, verbose_name="عدم سوءپیشینه")
    doc_no_addiction_test = models.BooleanField(default=False, verbose_name="آزمایش عدم اعتیاد")
    doc_identity_verified = models.BooleanField(default=False, verbose_name="تأیید مدارک هویتی")
    doc_personal_photo = models.BooleanField(default=False, verbose_name="عکس پرسنلی")
    doc_mental_health_test = models.BooleanField(default=False, verbose_name="آزمون سلامت روان")
    doc_promissory_note = models.BooleanField(default=False, verbose_name="دریافت سفته/ضمانت")
    doc_id_card_received = models.BooleanField(default=False, verbose_name="دریافت مدرک شناسایی")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_caregivers", verbose_name="ثبت‌شده توسط",
        help_text="ناظری که این مراقب را وارد سیستم کرده — خالی یعنی خود مراقب یا مسیر دیگری بوده.",
    )
    approved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="approved_caregivers", verbose_name="تأییدشده توسط")
    approved_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان تأیید")
    rejection_reason = models.TextField(blank=True, verbose_name="دلیل رد شدن")
    blacklist_reason = models.TextField(
        blank=True, verbose_name="دلیل مسدودسازی",
        help_text="فقط وقتی status برابر suspended باشد معنا دارد — یک مراقب تأییدشده که بعداً مسدود شده، نه یک درخواست رد‌شده.",
    )
    serves_all_areas = models.BooleanField(default=False, verbose_name="پوشش تمام مناطق", help_text="اگر فعال باشد، این مراقب محدود به مناطق خدماتی ثبت‌شده نیست و برای تمام مناطق در نظر گرفته می‌شود.")

    # Candidate-tracking fields — added for agency-side interview
    # tracking, matching a real spreadsheet workflow an agency was
    # already running manually outside the platform. Kept directly on
    # CaregiverProfile rather than a separate model since a candidate
    # only ever has one active interview record at a time in this
    # workflow, not a history of many.
    interview_score = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name="امتیاز مصاحبه",
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    interview_date = jmodels.jDateField(null=True, blank=True, verbose_name="تاریخ مصاحبه")
    interviewed_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="interviewed_caregivers", verbose_name="مصاحبه‌کننده",
    )
    staff_notes = models.TextField(
        blank=True, max_length=1000, verbose_name="یادداشت‌های داخلی",
        help_text="یادداشت آزاد تیم بررسی یا آژانس درباره این مراقب — برای پیگیری داخلی، نه نمایش عمومی.",
    )
    needs_more_docs_note = models.TextField(
        blank=True, max_length=1000, verbose_name="توضیح مدارک مورد نیاز",
        help_text="وقتی وضعیت روی «نیاز به مدارک بیشتر» است، این متن مشخص می‌کند چه چیزی از مراقب خواسته شده — به خود مراقب نشان داده می‌شود.",
    )
    # Agency-entered, not derived from anywhere else — set once a
    # caregiver's mission/assignment actually starts (agency_pipeline_
    # status reaches ON_ASSIGNMENT) so the agency can see, from real
    # data rather than a manually-typed tag, which caregivers are
    # nearing the end of their current contract. See
    # apps.agencies.views.AgencyCaregiverPipelineUpdateView.patch for
    # how it's written, and the "در شرف اتمام قرارداد" badge on the
    # agency panel's caregiver Kanban card for how it's read.
    contract_start_date = jmodels.jDateField(
        null=True, blank=True, verbose_name="تاریخ شروع قرارداد فعلی",
        help_text="تاریخ شروع همان قرارداد فعلی — در همان مرحله «در حال مأموریت» ثبت می‌شود، کنار تاریخ پایان.",
    )
    contract_end_date = jmodels.jDateField(
        null=True, blank=True, verbose_name="تاریخ پایان قرارداد فعلی",
        help_text="از زمانی که این مراقب وارد مرحله «در حال مأموریت» می‌شود ثبت می‌شود — برای پیگیری نزدیک‌شدن به پایان قرارداد.",
    )

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

    def blacklist(self, admin_user, reason=""):
        """
        Sets status to SUSPENDED — an enum value that already existed
        in CaregiverStatus but had no code path reaching it anywhere
        in the platform until now. Deliberately reuses the exact same
        status the matching pipeline's own hard filter
        (apps.care.matching.waterfall) already excludes — a
        blacklisted caregiver is automatically unmatchable, on both
        the platform-wide and every agency-scoped matching endpoint,
        with no separate blacklist-awareness needed anywhere else in
        the codebase. Only meaningful for an already-APPROVED
        caregiver — blacklisting is "this person WAS vetted and
        allowed, now isn't", not a rejection of an application that
        was never approved to begin with.
        """
        old_status = self.status
        self.status = CaregiverStatus.SUSPENDED
        self.blacklist_reason = reason
        self.save(update_fields=["status", "blacklist_reason"])
        CaregiverApprovalLog.objects.create(
            caregiver=self, old_status=old_status, new_status=CaregiverStatus.SUSPENDED,
            performed_by=admin_user, note=reason,
        )

    def unblacklist(self, admin_user):
        """Reverses blacklist() — returns to APPROVED (not back
        through a fresh review; blacklisting didn't erase the
        original approval, it only suspended it)."""
        old_status = self.status
        self.status = CaregiverStatus.APPROVED
        self.blacklist_reason = ""
        self.save(update_fields=["status", "blacklist_reason"])
        CaregiverApprovalLog.objects.create(
            caregiver=self, old_status=old_status, new_status=CaregiverStatus.APPROVED,
            performed_by=admin_user, note="رفع مسدودیت",
        )

    def submit_blacklist_appeal(self, appeal_reason):
        """
        Only valid while actually suspended, and only one pending
        appeal at a time — a caregiver whose appeal was denied has to
        wait for that decision rather than immediately resubmit, and
        one already pending can't be duplicated by repeated taps.
        Raises ValueError on either violation; the view translates
        this into a proper 400 response.
        """
        if self.status != CaregiverStatus.SUSPENDED:
            raise ValueError("فقط حساب‌های مسدودشده می‌توانند درخواست بازبینی ثبت کنند.")
        if self.blacklist_appeals.filter(status=BlacklistAppealStatus.PENDING).exists():
            raise ValueError("شما در حال حاضر یک درخواست بازبینی در انتظار بررسی دارید.")
        return BlacklistAppeal.objects.create(caregiver=self, appeal_reason=appeal_reason)

    def record_interview(self, staff_user, score=None, interview_date=None, note=""):
        """
        Records an interview result without changing status — a
        candidate can be interviewed while still pending, and staff
        may want to log the score before making a final call.
        Overwrites any previous interview record on this profile:
        this workflow tracks one active interview, not a history of
        several.
        """
        self.interview_score = score
        self.interview_date = interview_date
        self.interviewed_by = staff_user
        if note:
            self.staff_notes = note
        self.save(update_fields=["interview_score", "interview_date", "interviewed_by", "staff_notes"])

    def request_more_documents(self, staff_user, note):
        """
        Only valid from PENDING — a candidate already approved,
        rejected, or suspended has a more specific, final status that
        this shouldn't override. note is shown directly to the
        caregiver (see needs_more_docs_note), so it should say what's
        actually missing, not just "incomplete."
        """
        if self.status != CaregiverStatus.PENDING:
            raise ValueError("فقط پروفایل در انتظار بررسی را می‌توان به این وضعیت برد.")
        old_status = self.status
        self.status = CaregiverStatus.NEEDS_MORE_DOCS
        self.needs_more_docs_note = note
        self.save(update_fields=["status", "needs_more_docs_note"])
        CaregiverApprovalLog.objects.create(
            caregiver=self, old_status=old_status, new_status=CaregiverStatus.NEEDS_MORE_DOCS,
            performed_by=staff_user, note=note,
        )

    def mark_ready_for_review(self, staff_user):
        """
        Reverses request_more_documents() once the caregiver has
        actually resubmitted something — deliberately a manual staff
        action rather than an automatic trigger tied to profile edits,
        since a caregiver saving an unrelated field shouldn't silently
        put them back in the review queue before they're ready.
        """
        if self.status != CaregiverStatus.NEEDS_MORE_DOCS:
            raise ValueError("فقط پروفایل در وضعیت «نیاز به مدارک بیشتر» را می‌توان به بررسی بازگرداند.")
        old_status = self.status
        self.status = CaregiverStatus.PENDING
        self.needs_more_docs_note = ""
        self.save(update_fields=["status", "needs_more_docs_note"])
        CaregiverApprovalLog.objects.create(
            caregiver=self, old_status=old_status, new_status=CaregiverStatus.PENDING,
            performed_by=staff_user, note="مدارک تکمیلی دریافت شد",
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

    def __str__(self):
        return self.display_name


class BlacklistAppealStatus(models.TextChoices):
    PENDING = "pending", "در انتظار بررسی"
    APPROVED = "approved", "پذیرفته‌شده (رفع مسدودیت)"
    DENIED = "denied", "رد شده"


class BlacklistAppeal(models.Model):
    """
    A caregiver's own request to be reconsidered after being
    blacklisted — per an explicit product decision, reviewable by
    EITHER platform staff (admin/superuser, platform-wide) OR the
    caregiver's own agency (owner/supervisor, only if that agency has
    an approved link to this specific caregiver). This is
    deliberately different from Complaint's review model, where only
    platform staff can resolve — here, the agency that actually
    manages this caregiver day-to-day is trusted to judge whether the
    original reason has been addressed, by explicit choice, not an
    oversight repeating the same reasoning used elsewhere.

    Only one PENDING appeal can exist per caregiver at a time — see
    CaregiverProfile.submit_blacklist_appeal() — so a rejected or
    ignored caregiver can't spam repeated requests while one is still
    open.
    """
    caregiver = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name="blacklist_appeals", verbose_name="مراقب")
    appeal_reason = models.TextField(max_length=2000, verbose_name="توضیح مراقب برای درخواست بازبینی")
    status = models.CharField(max_length=20, choices=BlacklistAppealStatus.choices, default=BlacklistAppealStatus.PENDING, db_index=True, verbose_name="وضعیت")
    reviewed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="blacklist_appeals_reviewed", verbose_name="بررسی‌شده توسط")
    review_note = models.TextField(max_length=2000, blank=True, verbose_name="یادداشت بررسی")
    reviewed_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان بررسی")
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت درخواست")

    class Meta:
        verbose_name = "درخواست بازبینی مسدودیت"
        verbose_name_plural = "درخواست‌های بازبینی مسدودیت"
        ordering = ["-created_at"]

    def approve(self, reviewer, note=""):
        from django.utils import timezone
        self.status = BlacklistAppealStatus.APPROVED
        self.reviewed_by = reviewer
        self.review_note = note
        self.reviewed_at = timezone.now()
        self.save(update_fields=["status", "reviewed_by", "review_note", "reviewed_at"])
        self.caregiver.unblacklist(reviewer)

    def deny(self, reviewer, note=""):
        from django.utils import timezone
        self.status = BlacklistAppealStatus.DENIED
        self.reviewed_by = reviewer
        self.review_note = note
        self.reviewed_at = timezone.now()
        self.save(update_fields=["status", "reviewed_by", "review_note", "reviewed_at"])


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
    daily_work_hours = models.CharField(
        max_length=100, blank=True, verbose_name="ساعات کاری مراقبت روزانه",
        help_text="فقط برای «مراقبت روزانه» — مثلاً «از ساعت ۸ تا ۱۶».",
    )
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
    night_stay_until = models.CharField(max_length=20, choices=NightStayUntil.choices, blank=True, verbose_name="حداکثر زمان ماندن در شب")
    has_night_time_limit = models.BooleanField(null=True, blank=True, default=None, verbose_name="محدودیت زمانی برای شب دارد")
    additional_notes = models.TextField(blank=True, max_length=500, verbose_name="توضیحات تکمیلی")
    requested_salary = models.CharField(max_length=100, blank=True, verbose_name="حقوق درخواستی")
    cleaning_willingness = models.CharField(
        max_length=10, choices=CleaningWillingness.choices, blank=True, verbose_name="میزان انجام نظافت",
    )
    day_off_request = models.CharField(
        max_length=200, blank=True, verbose_name="روز درخواستی برای تعطیلی",
        help_text="توضیح آزاد — مثلاً «جمعه‌ها» یا «هماهنگ می‌شود».",
    )
    service_specific_answers = models.JSONField(
        default=dict, blank=True, verbose_name="پاسخ‌های فرم ۲ مخصوص نوع خدمت",
        help_text=(
            'دیکشنری {نوع خدمت: {نام فیلد: مقدار}} — سوالات فرم ۲ که فقط برای '
            "یک نوع خدمت خاص (کودک‌یار، نظافت‌چی، مادریار، پرستار، بهیار) معنا "
            "دارند. سالمندیار سوال اضافه‌ای در این فرم ندارد چون همان فیلدهای "
            "بالا، از ابتدا، مخصوص آن بوده‌اند. وقتی چند نوع خدمت هم‌زمان "
            "انتخاب شده باشد، هر کدام کلید جدا خودش را در این دیکشنری دارد — "
            "یکی جای دیگری را پاک نمی‌کند."
        ),
    )

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "شرایط همکاری مراقب"
        verbose_name_plural = "شرایط همکاری مراقبان"

    def __str__(self):
        return f"شرایط همکاری — {self.profile.display_name}"


class CaregiverServiceArea(models.Model):
    profile = models.ForeignKey(CaregiverProfile, on_delete=models.CASCADE, related_name="service_areas", verbose_name="مراقب")
    province = models.ForeignKey("locations.Province", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="استان")
    city = models.ForeignKey("locations.City", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="شهر")
    district = models.ForeignKey("locations.District", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="منطقه")

    class Meta:
        unique_together = ("profile", "province", "city", "district")
        verbose_name = "منطقه خدماتی مراقب"
        verbose_name_plural = "مناطق خدماتی مراقبان"

    def __str__(self):
        parts = [str(p) for p in (self.province, self.city, self.district) if p]
        return "/".join(parts) if parts else f"منطقه خدماتی #{self.pk}"


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
    service_specific_answers = models.JSONField(
        default=dict, blank=True, verbose_name="پاسخ‌های فرم ۳ مخصوص نوع خدمت",
        help_text=(
            "همان ساختار service_specific_answers در CaregiverWorkPreferences، "
            "اما برای سوالات فرم ۳ (سوابق و مهارت‌ها) مخصوص هر نوع خدمت — "
            "تجربه و مهارت مخصوص کودک‌یار/نظافت‌چی/مادریار/پرستار/بهیار همگی "
            "همین‌جا نگه داشته می‌شوند تا دو جدول اضافه برای مهارت‌های تخصصی "
            "لازم نباشد."
        ),
    )

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


class FlexibilityAnswer(models.TextChoices):
    """Legacy a/b/c/d scale — kept only so old migrations referencing
    it still import cleanly. No field on CaregiverCompatibilityQuestionnaire
    uses this anymore; see ScoreAnswer below."""
    A = "a", "گزینه الف"
    B = "b", "گزینه ب"
    C = "c", "گزینه ج"
    D = "d", "گزینه د"


class ScoreAnswer(models.TextChoices):
    """The caregiver compatibility questionnaire's 4 questions all
    share this same 0/50/100 scale (none / somewhat / fully) —
    replaced the old 16-question a/b/c/d scale on an explicit,
    confirmed decision that scoped this change to the wizard/model/
    review pages only; the caregiver-side trait-matching engine
    (apps.care.trait_matching) still reads section_scores()/
    overall_flexibility_score() below, which is why those methods
    are kept working (against the new 4 fields) rather than removed
    — but the DB-seeded QuestionTraitMapping rows still reference the
    old 16 field names, so trait matching quietly gets no signal from
    caregivers until that's separately rewired."""
    NONE = "0", "هیچ‌وجه"
    SOME = "50", "تا حدی"
    FULL = "100", "کاملاً"


class CaregiverCompatibilityQuestionnaire(models.Model):
    """
    The caregiver-side counterpart to families.
    PatientCompatibilityQuestionnaire — until this existed, matching
    could only compare objective signals (gender/age/location
    preference), never anything about how a caregiver actually
    approaches the parts of care that vary most by belief, boundaries,
    and culture. One row per caregiver.

    Replaced the original 16-question/4-section version with 4 direct
    0/50/100 self-ratings, per an explicit request.
    """
    caregiver = models.OneToOneField(
        CaregiverProfile, on_delete=models.CASCADE, related_name="compatibility_questionnaire", verbose_name="مراقب",
    )

    religiosity_level = models.CharField(
        max_length=3, choices=ScoreAnswer.choices, default=ScoreAnswer.SOME,
        verbose_name="میزان مذهبی بودن",
    )
    family_compatibility_level = models.CharField(
        max_length=3, choices=ScoreAnswer.choices, default=ScoreAnswer.SOME,
        verbose_name="سازگاری با خانواده سالمند",
    )
    patience_level = models.CharField(
        max_length=3, choices=ScoreAnswer.choices, default=ScoreAnswer.SOME,
        verbose_name="میزان صبوری",
    )
    clinical_compatibility_level = models.CharField(
        max_length=3, choices=ScoreAnswer.choices, default=ScoreAnswer.SOME,
        verbose_name="سازگاری بالینی",
    )
    service_specific_answers = models.JSONField(
        default=dict, blank=True, verbose_name="پاسخ‌های سازگاری مخصوص نوع خدمت",
        help_text=(
            "همان ساختار service_specific_answers در CaregiverWorkPreferences، "
            "اما برای چند سوال سازگاری اضافه که فقط برای یک نوع خدمت خاص معنا "
            "دارند (مثلاً «میزان صبر با کودکان» فقط برای کودک‌یار) — هر مقدار "
            "همان مقیاس ۰/۵۰/۱۰۰ (ScoreAnswer) بالا را دنبال می‌کند. ۴ سوال "
            "عمومی بالا برای همه نوع‌های خدمت ثابت می‌ماند."
        ),
    )

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="زمان تکمیل")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="آخرین به‌روزرسانی")

    class Meta:
        verbose_name = "پرسشنامه سازگاری مراقب"
        verbose_name_plural = "پرسشنامه‌های سازگاری مراقبان"

    SECTION_FIELDS = {
        "سازگاری عمومی": [
            "religiosity_level", "family_compatibility_level",
            "patience_level", "clinical_compatibility_level",
        ],
    }

    def section_scores(self) -> dict:
        """Each section's average score, 0-100 — values are already
        0/50/100 so this is a plain average, no rescaling needed."""
        scores = {}
        for section, fields in self.SECTION_FIELDS.items():
            points = [int(getattr(self, f)) for f in fields]
            scores[section] = round(sum(points) / len(points))
        return scores

    def overall_flexibility_score(self) -> int:
        """A single 0-100 summary across all 4 answers."""
        all_fields = [f for fields in self.SECTION_FIELDS.values() for f in fields]
        points = [int(getattr(self, f)) for f in all_fields]
        return round(sum(points) / len(points))

    def __str__(self):
        return f"پرسشنامه سازگاری {self.caregiver}"
