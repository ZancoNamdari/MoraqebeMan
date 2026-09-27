from django.core.validators import MinValueValidator
from django.db import models
from django_jalali.db import models as jmodels

from apps.caregivers.choices import CollaborationType


class BillingCycle(models.TextChoices):
    """Shared by ServiceTariff (which rate applies), the per-assignment
    billing cadence on care.CaregiverAssignment, and every financial
    report's day/week/month granularity filter — one definition, reused
    everywhere the platform means "how often does money move here"."""
    DAILY = "daily", "روزانه"
    WEEKLY = "weekly", "هفتگی"
    MONTHLY = "monthly", "ماهانه"
    # Added for apps.episodic's یک‌باره settlement invoices — a
    # one-off service has no recurring "period", so period_start ==
    # period_end == the settlement date rather than a real range.
    ONE_OFF = "one_off", "مقطعی"


class ServiceTariff(models.Model):
    """
    An agency's own default rate card, one row per service type (the
    same CollaborationType enum already used across matching/caregiver
    preferences — "مراقبت روزانه", "مقیم", "همراه بیمارستان", ...), per
    the confirmed requirement: tariffs are defined both per service
    type (this table) AND per assignment (the override fields added to
    care.CaregiverAssignment below) — an assignment with no override
    simply falls back to its agency's row here for that service type.

    Deliberately its own app rather than living in apps.agencies —
    agencies/models.py's own AgencyProfile docstring already flagged
    "billing lands in later phases on top of these link tables"; this
    is that later phase, and it touches agencies/caregivers/families/
    care all at once, so a dedicated app avoids forcing a direction on
    that cross-app dependency the way bolting it onto any one of them
    would.
    """
    agency = models.ForeignKey(
        "agencies.AgencyProfile", on_delete=models.CASCADE, related_name="tariffs", verbose_name="آژانس",
    )
    service_type = models.CharField(
        max_length=30, choices=CollaborationType.choices, verbose_name="نوع خدمت",
    )
    hourly_rate = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True,
        validators=[MinValueValidator(0)], verbose_name="نرخ ساعتی (تومان)",
    )
    daily_rate = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True,
        validators=[MinValueValidator(0)], verbose_name="نرخ روزانه (تومان)",
    )
    monthly_rate = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True,
        validators=[MinValueValidator(0)], verbose_name="نرخ ماهانه (تومان)",
    )
    is_active = models.BooleanField(default=True, verbose_name="فعال")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_tariffs", verbose_name="ایجادکننده",
    )
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        unique_together = ("agency", "service_type")
        ordering = ["service_type"]
        verbose_name = "تعرفه خدمت"
        verbose_name_plural = "تعرفه‌های خدمت"

    def __str__(self):
        return f"{self.agency} — {self.get_service_type_display()}"


class InvoiceStatus(models.TextChoices):
    DRAFT = "draft", "پیش‌نویس"
    ISSUED = "issued", "صادرشده"
    PARTIALLY_PAID = "partially_paid", "بخشی پرداخت‌شده"
    PAID = "paid", "پرداخت‌شده"
    OVERDUE = "overdue", "معوق"
    CANCELLED = "cancelled", "لغوشده"


class Invoice(models.Model):
    """
    One bill, for one CaregiverAssignment, covering one billing period
    (day/week/month — per confirmed requirement, this is the "چقدر
    واقعی باشه" answer's calculated half: `amount` is always computed
    from the assignment's effective rate — see
    apps.finance.services.compute_invoice_amount — never free-typed).
    `agency` is denormalized from assignment.caregiver's/patient's
    agency link specifically so every finance query can filter by
    agency directly, without a join chain through care/caregivers/
    families every time — the same reasoning apps.care.CareLogEntry
    already applies to store caregiver/patient directly.
    """
    agency = models.ForeignKey(
        "agencies.AgencyProfile", on_delete=models.CASCADE, related_name="invoices", verbose_name="آژانس",
    )
    # Nullable — an invoice now covers two unrelated kinds of billing:
    # a recurring CaregiverAssignment (the original case, assignment
    # set) or a one-off apps.episodic.EpisodicService settlement
    # (assignment left null, reached instead through the reverse
    # invoice.episodic_service accessor). Exactly one of the two exists
    # for any given invoice in practice — enforced in the views that
    # create each kind, not with a DB constraint, matching this
    # codebase's existing preference for explicit view-level checks
    # over CheckConstraints (see Invoice.recompute_status's docstring).
    assignment = models.ForeignKey(
        "care.CaregiverAssignment", on_delete=models.CASCADE, related_name="invoices", verbose_name="تخصیص",
        null=True, blank=True,
    )
    period_type = models.CharField(max_length=10, choices=BillingCycle.choices, verbose_name="دوره صورت‌حساب")
    period_start = jmodels.jDateField(verbose_name="شروع دوره")
    period_end = jmodels.jDateField(verbose_name="پایان دوره")
    amount = models.DecimalField(
        max_digits=12, decimal_places=0, validators=[MinValueValidator(0)], verbose_name="مبلغ (تومان)",
    )
    status = models.CharField(
        max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT, db_index=True, verbose_name="وضعیت",
    )
    due_date = jmodels.jDateField(null=True, blank=True, verbose_name="سررسید")
    notes = models.TextField(blank=True, verbose_name="یادداشت")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_invoices", verbose_name="ایجادکننده",
    )
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        ordering = ["-period_start", "-created_at"]
        verbose_name = "صورت‌حساب"
        verbose_name_plural = "صورت‌حساب‌ها"

    def __str__(self):
        subject = self.assignment or getattr(self, "episodic_service", None) or "بدون طرف حساب"
        return f"{subject} — {self.get_period_type_display()} — {self.amount}"

    @property
    def paid_amount(self):
        total = self.payments.aggregate(total=models.Sum("amount"))["total"]
        return total or 0

    @property
    def remaining_amount(self):
        return self.amount - self.paid_amount

    def recompute_status(self):
        """Called after every Payment save/delete — derives status from
        amounts rather than trusting a manually-set flag, so paid/
        partially_paid/paid can never drift from the actual payment
        rows (unlike CANCELLED/DRAFT, which stay manual — those are
        agency decisions, not derivable from money received)."""
        if self.status in (InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT):
            return
        paid = self.paid_amount
        if paid <= 0:
            self.status = InvoiceStatus.ISSUED
        elif paid < self.amount:
            self.status = InvoiceStatus.PARTIALLY_PAID
        else:
            self.status = InvoiceStatus.PAID
        self.save(update_fields=["status", "updated_at"])


class PaymentMethod(models.TextChoices):
    CASH = "cash", "نقدی"
    CARD_TRANSFER = "card_transfer", "کارت‌به‌کارت"
    BANK_TRANSFER = "bank_transfer", "حواله بانکی"
    ONLINE = "online", "پرداخت آنلاین"
    CHEQUE = "cheque", "چک"
    OTHER = "other", "سایر"


class Payment(models.Model):
    """
    An actual, real payment recorded against an Invoice — per the
    confirmed requirement's "هر ۲" answer, this half is real bookkeeping
    (an agency staff member records money that was actually received),
    not a calculated projection. invoice.recompute_status() is called
    from the view right after this is created, not from a signal —
    same "explicit over implicit" preference already followed by
    CaregiverAssignment.end() elsewhere in this codebase.
    """
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments", verbose_name="صورت‌حساب")
    amount = models.DecimalField(max_digits=12, decimal_places=0, validators=[MinValueValidator(0)], verbose_name="مبلغ (تومان)")
    method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH, verbose_name="روش پرداخت")
    paid_at = jmodels.jDateField(verbose_name="تاریخ پرداخت")
    notes = models.TextField(blank=True, verbose_name="یادداشت")
    recorded_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="recorded_payments", verbose_name="ثبت‌کننده",
    )
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت")

    class Meta:
        ordering = ["-paid_at", "-created_at"]
        verbose_name = "پرداخت"
        verbose_name_plural = "پرداخت‌ها"

    def __str__(self):
        return f"{self.invoice} — {self.amount}"
