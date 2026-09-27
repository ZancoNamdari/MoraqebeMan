"""
Rate-resolution and invoice-amount logic — kept out of views.py/models.py
for the same reason apps.agencies.tenancy exists as its own module: "what
rate actually applies to this assignment, for this billing cycle" is a
single question with real business logic, and every call site (the
invoice-create endpoint today, any future bulk-invoice-generation job)
should ask it here rather than re-deriving it inline.
"""
from decimal import Decimal


class RateNotConfigured(Exception):
    """Raised when neither the assignment's own override nor its
    agency's ServiceTariff has a rate for the requested billing cycle —
    turned into a 400 by the view, never a 500: this is a data-entry
    gap (agency hasn't priced this service type yet), not a bug."""


def resolve_effective_rate(assignment, agency):
    """
    Returns a dict {"hourly": Decimal|None, "daily": Decimal|None,
    "monthly": Decimal|None} — the rate this ONE assignment actually
    bills at, per the confirmed "هر دو" requirement: the assignment's
    own custom_*_rate fields win when set; any left blank fall back to
    the agency's ServiceTariff row for assignment.service_type.
    """
    from .models import ServiceTariff

    tariff = None
    if assignment.service_type:
        tariff = ServiceTariff.objects.filter(
            agency=agency, service_type=assignment.service_type, is_active=True,
        ).first()

    return {
        "hourly": assignment.custom_hourly_rate if assignment.custom_hourly_rate is not None else (tariff.hourly_rate if tariff else None),
        "daily": assignment.custom_daily_rate if assignment.custom_daily_rate is not None else (tariff.daily_rate if tariff else None),
        "monthly": assignment.custom_monthly_rate if assignment.custom_monthly_rate is not None else (tariff.monthly_rate if tariff else None),
    }


def compute_invoice_amount(assignment, agency, period_type, period_start, period_end):
    """
    The calculated half of the confirmed "چقدر واقعی باشه" requirement
    — an invoice's amount is always derived from the effective rate,
    never free-typed. Falls back one tier when the exact-cycle rate is
    missing (e.g. billing weekly but the agency only priced this
    service type by the day) before giving up with RateNotConfigured.
    """
    rate = resolve_effective_rate(assignment, agency)
    days = (period_end - period_start).days + 1

    if period_type == "monthly":
        if rate["monthly"] is not None:
            return rate["monthly"]
        if rate["daily"] is not None:
            return rate["daily"] * days
        if rate["hourly"] is not None:
            return rate["hourly"] * Decimal(24) * days
    elif period_type == "weekly":
        if rate["daily"] is not None:
            return rate["daily"] * days
        if rate["monthly"] is not None:
            return (rate["monthly"] / Decimal(30)) * days
        if rate["hourly"] is not None:
            return rate["hourly"] * Decimal(24) * days
    elif period_type == "daily":
        if rate["daily"] is not None:
            return rate["daily"] * days
        if rate["hourly"] is not None:
            return rate["hourly"] * Decimal(24) * days
        if rate["monthly"] is not None:
            return (rate["monthly"] / Decimal(30)) * days

    raise RateNotConfigured(
        "برای این نوع خدمت هیچ نرخی (نه روی خود تخصیص، نه در تعرفه آژانس) تعریف نشده است.",
    )
