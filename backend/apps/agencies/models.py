from django.db import models
from django.utils.crypto import get_random_string
from django_jalali.db import models as jmodels

# Same alphabet/format as apps.families's FAM-/ELD- codes (excludes
# visually-ambiguous characters) — an agency's code is read aloud or
# typed by hand by a family/caregiver joining it, same use case.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def _generate_unique_code(model, prefix: str) -> str:
    while True:
        candidate = f"{prefix}-{get_random_string(6, _CODE_ALPHABET)}"
        if not model.objects.filter(access_code=candidate).exists():
            return candidate


class IsolationMode(models.TextChoices):
    """
    Tenancy tier for this agency — introduced now specifically so the
    schema already has this seam before it's actually needed, per the
    reviewed hybrid-tenancy plan: shared infrastructure for normal
    customers, dedicated database/infrastructure as a premium/
    enterprise option later, without a schema migration or business-
    logic rewrite when that day comes. Every agency is SHARED today —
    nothing reads or branches on this field yet; it exists purely as
    a forward-compatible marker, not a feature.
    """
    SHARED = "shared", "زیرساخت مشترک"
    DEDICATED = "dedicated", "زیرساخت اختصاصی"


class AgencyProfile(models.Model):
    """
    One row per AGENCY-role user — a B2B account, per the platform's
    architecture doc: either a staffing company supplying its own
    caregivers, a corporate client whose employees (families) get the
    service as a benefit, or both at once. This phase only builds the
    foundation (profile + roster links); reporting/HR-dashboard depth
    and billing land in later phases on top of these same two link
    tables (AgencyFamilyLink, AgencyCaregiverLink below).
    """
    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="agency_profile", verbose_name="کاربر"
    )
    company_name = models.CharField(max_length=200, verbose_name="نام شرکت/آژانس")
    license_number = models.CharField(max_length=100, blank=True, verbose_name="شماره مجوز فعالیت")
    access_code = models.CharField(
        max_length=20, unique=True, editable=False, verbose_name="کد عضویت آژانس",
        help_text="کد یکتا برای درخواست پیوستن خانواده یا مراقب به این آژانس — مثلاً AGN-92K7XQ",
    )
    isolation_mode = models.CharField(
        max_length=20, choices=IsolationMode.choices, default=IsolationMode.SHARED, verbose_name="سطح ایزوله‌سازی",
        help_text="امروز فقط 'مشترک' دارای پیاده‌سازی واقعی است — این فیلد صرفاً برای آماده‌بودن معماری برای آینده اضافه شده.",
    )
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ و زمان ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ و زمان بروزرسانی")

    class Meta:
        verbose_name = "پروفایل آژانس"
        verbose_name_plural = "پروفایل‌های آژانس"

    def save(self, *args, **kwargs):
        if not self.access_code:
            self.access_code = _generate_unique_code(AgencyProfile, "AGN")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.company_name or self.user.username


class AgencyLinkStatus(models.TextChoices):
    PENDING = "pending", "در انتظار تأیید"
    APPROVED = "approved", "تأییدشده"
    REJECTED = "rejected", "رد شده"


class AgencyFamilyLink(models.Model):
    """
    A family under this agency's roster — e.g. an employee of a
    corporate client whose elderly relative's care is covered through
    that company's account. Request/approve flow mirrors
    apps.families.FamilyPatientLink exactly: the family requests using
    the agency's access_code (PENDING), the agency approves from its
    dashboard.
    """
    agency = models.ForeignKey(AgencyProfile, on_delete=models.CASCADE, related_name="family_links", verbose_name="آژانس")
    family = models.ForeignKey("families.FamilyProfile", on_delete=models.CASCADE, related_name="agency_links", verbose_name="خانواده")
    status = models.CharField(max_length=20, choices=AgencyLinkStatus.choices, default=AgencyLinkStatus.PENDING, db_index=True, verbose_name="وضعیت")
    decided_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="decided_agency_family_links", verbose_name="تصمیم‌گیرنده",
    )
    decided_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان تصمیم")
    requested_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="زمان درخواست")

    class Meta:
        unique_together = ("agency", "family")
        verbose_name = "ارتباط آژانس و خانواده"
        verbose_name_plural = "ارتباط‌های آژانس و خانواده"

    def __str__(self):
        return f"{self.agency} ↔ {self.family} ({self.status})"


class AgencyCaregiverLink(models.Model):
    """
    A caregiver in this agency's own supply pool — the staffing-company
    side of the B2B account. A caregiver still only ever gets their
    core CaregiverProfile created/approved the platform's normal way
    (supervisor-vetted, per apps.caregivers); this link is a separate
    affiliation on top of that, not a replacement for it.
    """
    agency = models.ForeignKey(AgencyProfile, on_delete=models.CASCADE, related_name="caregiver_links", verbose_name="آژانس")
    caregiver = models.ForeignKey("caregivers.CaregiverProfile", on_delete=models.CASCADE, related_name="agency_links", verbose_name="مراقب")
    status = models.CharField(max_length=20, choices=AgencyLinkStatus.choices, default=AgencyLinkStatus.PENDING, db_index=True, verbose_name="وضعیت")
    decided_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="decided_agency_caregiver_links", verbose_name="تصمیم‌گیرنده",
    )
    decided_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان تصمیم")
    requested_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="زمان درخواست")

    class Meta:
        unique_together = ("agency", "caregiver")
        verbose_name = "ارتباط آژانس و مراقب"
        verbose_name_plural = "ارتباط‌های آژانس و مراقب"

    def __str__(self):
        return f"{self.agency} ↔ {self.caregiver} ({self.status})"


class AgencySupervisor(models.Model):
    """
    Agency staff — receptionist-like accounts who enter caregiver and
    patient information on behalf of a specific agency. Deliberately
    NOT the same thing as the platform-wide "Supervisor" Django group
    used elsewhere in this codebase (apps.caregivers's
    supervisor_views, IsAdminOrSuperuser) — that one is platform staff
    with no agency scoping at all; this one is scoped to exactly one
    agency and can never see or touch another agency's data. Kept as
    two clearly different names in code specifically so they don't
    get confused with each other later.

    One user account = one agency, always (unlike caregivers, who can
    belong to 0..N agencies) — a supervisor works for one specific
    agency, not several at once.
    """
    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="agency_supervisor_profile", verbose_name="کاربر",
    )
    agency = models.ForeignKey(
        AgencyProfile, on_delete=models.CASCADE, related_name="supervisors", verbose_name="آژانس",
    )
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_agency_supervisors", verbose_name="ایجادکننده",
        help_text="خود آژانس این حساب را ساخته، یا یک سوپریوزر — هر دو مجازند.",
    )
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "سوپروایزر آژانس"
        verbose_name_plural = "سوپروایزرهای آژانس"

    def __str__(self):
        return f"{self.user.username} — سوپروایزر {self.agency}"


class AgencyAdmin(models.Model):
    """
    The lowest tier of agency staff, reporting to exactly one specific
    AgencySupervisor (assigned at creation time by the agency owner/
    manager — never self-selected, and never reassignable by the
    admin or supervisor themselves). Deliberately its own model
    rather than a boolean flag on AgencySupervisor, since an admin
    and a supervisor are genuinely different roles with different
    scoping rules for the patient Kanban board: an admin sees only
    their own created records, their supervisor sees their own PLUS
    every admin reporting to them, and the agency owner sees all of
    it across every supervisor.
    """
    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="agency_admin_profile", verbose_name="کاربر",
    )
    agency = models.ForeignKey(
        AgencyProfile, on_delete=models.CASCADE, related_name="admins", verbose_name="آژانس",
    )
    supervisor = models.ForeignKey(
        AgencySupervisor, on_delete=models.CASCADE, related_name="admins", verbose_name="سوپروایزر مسئول",
        help_text="سوپروایزری که این ادمین مستقیماً زیر نظر او کار می‌کند.",
    )
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_agency_admins", verbose_name="ایجادکننده",
    )
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "ادمین آژانس"
        verbose_name_plural = "ادمین‌های آژانس"

    def __str__(self):
        return f"{self.user.username} — ادمین {self.agency} (زیر نظر {self.supervisor.user.username})"


class AgencyPatientLink(models.Model):
    """
    Direct agency↔patient relationship — exists specifically so an
    agency's own patient list (and later, agency-scoped matching's
    "which patients can this agency even request matching for")
    doesn't depend on whether that patient happens to have a linked
    family yet.

    A patient created through the "standalone" mode of
    apps.agencies's patient-creation endpoint has NO FamilyProfile at
    all (nullable PatientProfile.user, same as every other
    family-less patient on this platform) — so there'd be no way to
    reach it from AgencyFamilyLink's agency->family->patient chain.
    This link is created directly, in BOTH creation modes, so agency-
    scoped queries always have one single, simple source of truth
    regardless of how the patient was entered.

    Unlike AgencyCaregiverLink/AgencyFamilyLink, there's no patient-
    initiated join flow to support (a PatientProfile frequently has no
    User account behind it at all, so it can't "request" anything) —
    every row here is created directly as APPROVED, by the agency or
    its supervisor. status/decided_by are still included for
    consistency with the other two link tables and in case a future
    flow needs them (e.g. a family later choosing to formally attach
    an independently-registered patient to an agency).
    """
    agency = models.ForeignKey(
        AgencyProfile, on_delete=models.CASCADE, related_name="patient_links", verbose_name="آژانس",
    )
    patient = models.ForeignKey(
        "families.PatientProfile", on_delete=models.CASCADE, related_name="agency_links", verbose_name="سالمند",
    )
    status = models.CharField(max_length=20, choices=AgencyLinkStatus.choices, default=AgencyLinkStatus.APPROVED, db_index=True, verbose_name="وضعیت")
    decided_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="decided_agency_patient_links", verbose_name="ثبت‌کننده",
    )
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        unique_together = ("agency", "patient")
        verbose_name = "ارتباط آژانس و سالمند"
        verbose_name_plural = "ارتباط‌های آژانس و سالمند"

    def __str__(self):
        return f"{self.agency} ↔ {self.patient} ({self.status})"
