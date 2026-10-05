from django.core.management.base import BaseCommand

from apps.caregivers.models import IdentityProfile


class Command(BaseCommand):
    help = (
        "سن ذخیره‌شده‌ی همه‌ی مراقب‌ها را از روی تاریخ تولد دوباره محاسبه می‌کند "
        "(سن فقط در save() به‌روز می‌شود؛ این دستور برای زمانی است که تولدها گذشته‌اند). "
        "پیشنهاد: روزانه با cron اجرا شود."
    )

    def handle(self, *args, **options):
        updated = 0
        for ident in IdentityProfile.objects.exclude(birth_date__isnull=True).iterator():
            age = ident.compute_age()
            if ident.age != age:
                IdentityProfile.objects.filter(pk=ident.pk).update(age=age)
                updated += 1
        self.stdout.write(self.style.SUCCESS(f"{updated} مراقب به‌روز شد."))
