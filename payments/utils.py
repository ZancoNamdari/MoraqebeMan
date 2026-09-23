from .models import Wallet, Transaction
from decimal import Decimal


def get_platform_settings():
    """نرخ‌های کش‌بک/معرف/پیش‌فرض بازاریاب - از دیتابیس خوانده می‌شود تا ادمین بتواند
    بدون نیاز به تغییر کد، از پنل مدیریت این نرخ‌ها را عوض کند."""
    from .models import PlatformSettings
    return PlatformSettings.get_settings()


def get_or_create_wallet(user):
    wallet, _ = Wallet.objects.get_or_create(user=user)
    return wallet


def charge_wallet(user, amount, ref_id=''):
    """شارژ کیف پول"""
    wallet = get_or_create_wallet(user)
    wallet.balance += amount
    wallet.save()

    Transaction.objects.create(
        wallet           = wallet,
        transaction_type = 'charge',
        amount           = amount,
        status           = 'success',
        ref_id           = ref_id,
        description      = f'شارژ کیف پول به مبلغ {amount} تومان'
    )
    return wallet


def charge_wallet(user, amount, ref_id=''):
    """شارژ کیف پول نقدی"""
    wallet = get_or_create_wallet(user)
    wallet.balance += Decimal(amount)
    wallet.save()

    Transaction.objects.create(
        wallet           = wallet,
        transaction_type = 'charge',
        amount           = amount,
        status           = 'success',
        ref_id           = ref_id,
        description      = f'شارژ کیف پول {amount} تومان'
    )
    return wallet


def pay_from_wallet(user, booking):
    """پرداخت از کیف پول + محاسبه کشبک + پاداش معرف"""
    wallet = get_or_create_wallet(user)
    amount = Decimal(str(booking.service.price))

    if wallet.total_balance < amount:
        return False, 'موجودی کیف پول کافی نیست'

    # کسر از کیف پول (اول نقد، بعد کشبک)
    if wallet.balance >= amount:
        wallet.balance -= amount
    else:
        remaining = amount - wallet.balance
        wallet.balance = 0
        wallet.cashback -= remaining

    # ثبت تراکنش پرداخت
    Transaction.objects.create(
        wallet           = wallet,
        booking          = booking,
        transaction_type = 'payment',
        amount           = amount,
        status           = 'success',
        description      = f'پرداخت سرویس {booking.service.name}'
    )

    # محاسبه و اضافه کردن کش‌بک طبق نرخ فعلی تنظیمات پلتفرم
    platform_settings = get_platform_settings()
    cashback_amount = (amount * Decimal(str(platform_settings.cashback_percent)) / 100).quantize(Decimal('1'))
    wallet.cashback += cashback_amount
    wallet.save()

    Transaction.objects.create(
        wallet           = wallet,
        booking          = booking,
        transaction_type = 'cashback',
        amount           = cashback_amount,
        status           = 'success',
        description      = f'کش‌بک {platform_settings.cashback_percent}٪ سرویس {booking.service.name}'
    )

    # پاداش معرف ۵٪ - در هر تراکنش این کاربر (نه فقط بار اول)
    _pay_referral_reward(user, amount, booking)
    _pay_marketer_commission(user, amount, booking)


    return True, 'پرداخت موفق'


def _pay_referral_reward(user, amount, source):
    """پاداش به معرف - در هر تراکنشی که این کاربر انجام می‌دهد (نه فقط اولین بار)، طبق نرخ فعلی
    تنظیمات پلتفرم (قابل تغییر توسط ادمین). source می‌تواند یک BookingRequest یا یک Order باشد."""
    if not user.referred_by:
        return

    from stores.models import Order as StoreOrder

    referrer         = user.referred_by
    referrer_wallet  = get_or_create_wallet(referrer)
    platform_settings = get_platform_settings()
    reward_amount    = (amount * Decimal(str(platform_settings.referral_percent)) / 100).quantize(Decimal('1'))

    referrer_wallet.cashback += reward_amount
    referrer_wallet.save()

    txn_kwargs = {'order': source} if isinstance(source, StoreOrder) else {'booking': source}
    Transaction.objects.create(
        wallet           = referrer_wallet,
        transaction_type = 'referral_reward',
        amount           = reward_amount,
        status           = 'success',
        description      = f'پاداش معرفی {user.phone_number}',
        **txn_kwargs,
    )


def refund_to_wallet(user, booking):
    """بازگشت وجه"""
    wallet = get_or_create_wallet(user)
    amount = Decimal(str(booking.service.price))

    wallet.balance += amount
    wallet.save()

    Transaction.objects.create(
        wallet           = wallet,
        booking          = booking,
        transaction_type = 'refund',
        amount           = amount,
        status           = 'success',
        description      = f'بازگشت وجه {booking.service.name}'
    )
    return wallet

def _pay_marketer_commission(user, amount, booking):
    """کمیسیون مطب (طبق معرفی مطب توسط بازاریاب) خودکار و بلافاصله پرداخت می‌شود - این یک رابطه
    دائمی و کسب‌وکاری است (همان بازاریابی که مطب را آورده).
    کمیسیون مشتری اینجا محاسبه نمی‌شود؛ چون ممکن است مشتری ۱۰ سفارش بدهد ولی فقط سفارشی که
    مشتری صراحتاً کد بازاریاب را برایش وارد کرده و بازاریاب هم تأییدش کرده باید کمیسیون بدهد -
    این کار توسط MarketerConfirmBookingCommissionView و بعد از تأیید بازاریاب انجام می‌شود."""
    from payments.models import MarketerCommission

    clinic = booking.clinic
    if clinic.referred_by_marketer:
        marketer = clinic.referred_by_marketer
        settings = getattr(marketer, 'commission_settings', None)
        if settings and settings.is_active:
            commission = (amount * Decimal(str(settings.clinic_commission_percent)) / 100).quantize(Decimal('1'))
            _credit_marketer(marketer, commission, booking, f'کمیسیون مطب {clinic.name}')

def _credit_marketer(marketer, amount, booking, description):
    wallet = get_or_create_wallet(marketer)
    wallet.cashback += amount
    wallet.save()

    Transaction.objects.create(
        wallet=wallet,
        booking=booking,
        transaction_type='marketer_commission',
        amount=amount,
        status='success',
        description=description
    )