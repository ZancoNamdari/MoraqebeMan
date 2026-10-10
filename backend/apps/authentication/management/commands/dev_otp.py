from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User
from apps.authentication.models import PhoneOTP


class Command(BaseCommand):
    help = (
        "فقط برای توسعه‌ی لوکال: یک کد ورود پیامکی (OTP) برای شماره‌ی داده‌شده می‌سازد و "
        "همان‌جا چاپ می‌کند، چون روی لوکال پیامک واقعی ارسال نمی‌شود. "
        "اگر پنل SMS (Kavenegar) تنظیم شده باشد یا DEBUG خاموش باشد، اجرا نمی‌شود."
    )

    def add_arguments(self, parser):
        parser.add_argument("phone_number", help="مثلاً 09130700000")

    def handle(self, *args, **opts):
        if not settings.DEBUG or getattr(settings, "KAVENEGAR_API_KEY", ""):
            raise CommandError("این دستور فقط روی محیط توسعه (DEBUG روشن و بدون پنل پیامک) کار می‌کند.")
        user = User.objects.filter(phone_number=opts["phone_number"]).first()
        if user is None:
            raise CommandError("کاربری با این شماره پیدا نشد.")
        _, code = PhoneOTP.issue_for(user)
        self.stdout.write(self.style.SUCCESS(f"کد ورود برای {user.phone_number}: {code}  (۵ دقیقه معتبر است)"))
