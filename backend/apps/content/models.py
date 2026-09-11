from django.db import models
from django.utils.text import slugify
from django_jalali.db import models as jmodels


class Article(models.Model):
    """
    Editorial content for the public landing page's "افکار ما به کجا
    می‌رسد" section — written and published only by MoraqebeMan's own
    internal team (admin/superuser roles), never by agencies or any
    other role. This is deliberately a separate, simple app rather
    than folded into an existing one: articles have nothing to do
    with care delivery, agencies, or accounts — they're the one piece
    of the platform that's pure marketing/editorial content, with its
    own lifecycle (draft -> published) that no other app needs.
    """
    title = models.CharField(max_length=200, verbose_name="عنوان")
    slug = models.SlugField(max_length=220, unique=True, blank=True, verbose_name="نامک")
    summary = models.CharField(
        max_length=300, verbose_name="خلاصه",
        help_text="متن کوتاهی که در کارت پیش‌نمایش صفحه اصلی نشان داده می‌شود.",
    )
    body = models.TextField(verbose_name="متن کامل مقاله")
    cover_image = models.ImageField(
        upload_to="articles/covers/", null=True, blank=True, verbose_name="تصویر شاخص",
    )

    is_published = models.BooleanField(default=False, db_index=True, verbose_name="منتشر شده")
    author = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="articles_written", verbose_name="نویسنده",
    )

    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = jmodels.jDateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")
    published_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="تاریخ انتشار")

    class Meta:
        verbose_name = "مقاله"
        verbose_name_plural = "مقالات"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        # Auto-generate the slug from the title on first save only —
        # once a URL exists and might be shared/indexed, silently
        # changing it on a later title edit would break that link.
        if not self.slug:
            base_slug = slugify(self.title, allow_unicode=True)
            slug = base_slug
            counter = 1
            while Article.objects.filter(slug=slug).exists():
                counter += 1
                slug = f"{base_slug}-{counter}"
            self.slug = slug
        super().save(*args, **kwargs)

    def publish(self):
        from django.utils import timezone
        self.is_published = True
        self.published_at = timezone.now()
        self.save(update_fields=["is_published", "published_at", "updated_at"])

    def unpublish(self):
        self.is_published = False
        self.save(update_fields=["is_published", "updated_at"])
