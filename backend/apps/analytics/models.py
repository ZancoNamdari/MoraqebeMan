from django.db import models


class PageView(models.Model):
    """
    Deliberately minimal — just enough to answer "how many visits
    today", "which pages get seen most", and "how many unique
    visitors" without building a full analytics platform from
    scratch. No new service, no new container: this is one table in
    the database that's already running, written to via a single
    lightweight endpoint hit by the landing page (and, later, other
    public-facing pages if wanted) on each page load.

    "Unique visitor" here means unique IP address per calendar day —
    the simplest honest definition available without cookies/sessions
    on a page that has neither (the landing page has no login, no
    session state at all). This will over-count actual unique humans
    behind shared/NAT'd IPs (offices, some mobile carriers) and
    under-count returning visitors from home if their ISP rotates
    IPs — a real, disclosed limitation, not a hidden inaccuracy.
    """
    path = models.CharField(max_length=255, db_index=True, verbose_name="مسیر صفحه")
    ip_address = models.GenericIPAddressField(db_index=True, verbose_name="آدرس IP")
    user_agent = models.CharField(max_length=500, blank=True, verbose_name="مرورگر/دستگاه")
    referrer = models.CharField(max_length=500, blank=True, verbose_name="منبع ورود")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="زمان بازدید")

    class Meta:
        verbose_name = "بازدید صفحه"
        verbose_name_plural = "بازدیدهای صفحه"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["path", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
        ]

    def __str__(self):
        return f"{self.path} — {self.ip_address} ({self.created_at})"
