from decimal import Decimal


def charge_order(order, customer):
    """کسر مبلغ سفارش از کیف‌پول مشتری (فقط برای payment_method=online) +
    کش‌بک طبق نرخ فعلی پلتفرم + پاداش معرف (در صورت وجود) + کمیسیون بازاریابی که این
    فروشگاه را معرفی کرده (در صورت وجود). همه نرخ‌ها از همان تنظیمات سراسری پلتفرم خوانده می‌شوند
    که برای کلینیک‌ها هم استفاده می‌شود - برای یکسان بودن اقتصاد پلتفرم."""
    from payments.utils import get_or_create_wallet, get_platform_settings, _pay_referral_reward
    from payments.models import Transaction

    wallet = get_or_create_wallet(customer)
    amount = Decimal(str(order.total_amount))

    if wallet.total_balance < amount:
        return False, 'موجودی کیف پول کافی نیست'

    if wallet.balance >= amount:
        wallet.balance -= amount
    else:
        remaining = amount - wallet.balance
        wallet.balance = 0
        wallet.cashback -= remaining

    Transaction.objects.create(
        wallet=wallet, order=order, transaction_type='payment',
        amount=amount, status='success', description=f'خرید از فروشگاه {order.store.name}',
    )

    platform_settings = get_platform_settings()
    cashback_amount = (amount * Decimal(str(platform_settings.cashback_percent)) / 100).quantize(Decimal('1'))
    wallet.cashback += cashback_amount
    wallet.save()
    Transaction.objects.create(
        wallet=wallet, order=order, transaction_type='cashback',
        amount=cashback_amount, status='success',
        description=f'کش‌بک {platform_settings.cashback_percent}٪ خرید از {order.store.name}',
    )

    _pay_referral_reward(customer, amount, order)
    _pay_store_marketer_commission(amount, order)

    order.is_paid = True
    order.save(update_fields=['is_paid'])
    return True, 'پرداخت موفق'


def _pay_store_marketer_commission(amount, order):
    """کمیسیون بازاریابی که این فروشگاه را به پلتفرم معرفی کرده - خودکار و بلافاصله،
    مشابه کمیسیون مطبِ معرفی‌شده در سیستم رزرو خدمات."""
    from payments.utils import get_or_create_wallet
    from payments.models import Transaction, MarketerCommission

    store = order.store
    if not store.referred_by_marketer_id:
        return

    marketer = store.referred_by_marketer
    settings = MarketerCommission.objects.filter(marketer=marketer, is_active=True).first()
    if not settings:
        return

    commission = (amount * Decimal(str(settings.clinic_commission_percent)) / 100).quantize(Decimal('1'))
    if commission <= 0:
        return

    wallet = get_or_create_wallet(marketer)
    wallet.cashback += commission
    wallet.save()
    Transaction.objects.create(
        wallet=wallet, order=order, transaction_type='marketer_commission',
        amount=commission, status='success', description=f'کمیسیون فروشگاه {store.name}',
    )


def refund_order(order):
    """بازگشت کامل وجه یک سفارش لغوشده: اصل مبلغ + کش‌بک + پاداش معرف + کمیسیون بازاریاب،
    دقیقاً مطابق همان منطق بازگشت وجه رزرو خدمات."""
    if not order.is_paid:
        return

    from payments.utils import get_or_create_wallet
    from payments.models import Transaction

    wallet = get_or_create_wallet(order.customer)
    amount = Decimal(str(order.total_amount))

    wallet.balance += amount
    Transaction.objects.create(
        wallet=wallet, order=order, transaction_type='refund',
        amount=amount, status='success', description=f'بازگشت وجه سفارش لغوشده - {order.store.name}',
    )

    cashback_txn = Transaction.objects.filter(
        order=order, wallet=wallet, transaction_type='cashback', status='success', amount__gt=0
    ).first()
    if cashback_txn:
        wallet.cashback -= cashback_txn.amount
        Transaction.objects.create(
            wallet=wallet, order=order, transaction_type='cashback',
            amount=-cashback_txn.amount, status='success', description='برگشت کش‌بک سفارش لغوشده',
        )
    wallet.save()

    referral_txn = Transaction.objects.filter(
        order=order, transaction_type='referral_reward', status='success', amount__gt=0
    ).first()
    if referral_txn:
        ref_wallet = referral_txn.wallet
        ref_wallet.cashback -= referral_txn.amount
        ref_wallet.save()
        Transaction.objects.create(
            wallet=ref_wallet, order=order, transaction_type='referral_reward',
            amount=-referral_txn.amount, status='success', description='برگشت پاداش معرف - سفارش لغوشده',
        )

    for commission_txn in Transaction.objects.filter(
        order=order, transaction_type='marketer_commission', status='success', amount__gt=0
    ):
        mk_wallet = commission_txn.wallet
        mk_wallet.cashback -= commission_txn.amount
        mk_wallet.save()
        Transaction.objects.create(
            wallet=mk_wallet, order=order, transaction_type='marketer_commission',
            amount=-commission_txn.amount, status='success', description='برگشت کمیسیون - سفارش لغوشده',
        )

    order.is_paid = False
    order.save(update_fields=['is_paid'])
