from datetime import datetime
from django.utils import timezone


def validate_appointment_slot(doctor, req_date, req_time, exclude_appointment_id=None):
    """بررسی می‌کند آیا یک تاریخ/ساعت مشخص برای رزرو نزد این پزشک معتبر است یا نه.
    سه شرط باید برقرار باشد: ۱) در گذشته نباشد ۲) داخل بازه‌ی در دسترس‌بودن پزشک باشد
    ۳) با نوبت دیگری تداخل (Double Booking) نداشته باشد.
    خروجی: (is_valid: bool, error_message: str یا None)"""
    from .models import DoctorAppointment

    naive_dt = datetime.combine(req_date, req_time)
    aware_dt = timezone.make_aware(naive_dt) if timezone.is_naive(naive_dt) else naive_dt
    if aware_dt < timezone.now():
        return False, 'امکان رزرو نوبت در گذشته وجود ندارد'

    # تبدیل weekday پایتون (دوشنبه=۰) به مدل ما (شنبه=۰)
    weekday = (req_date.weekday() + 2) % 7
    slot_ok = doctor.availabilities.filter(
        weekday=weekday, is_active=True, start_time__lte=req_time, end_time__gt=req_time
    ).exists()
    if not slot_ok:
        return False, 'این زمان در بازه‌ی در دسترس‌بودن پزشک نیست'

    conflict_qs = DoctorAppointment.objects.filter(
        doctor=doctor, requested_date=req_date, requested_time=req_time,
    ).exclude(status__in=['cancelled', 'rejected'])
    if exclude_appointment_id:
        conflict_qs = conflict_qs.exclude(id=exclude_appointment_id)
    if conflict_qs.exists():
        return False, 'این زمان قبلاً توسط بیمار دیگری رزرو شده است، لطفاً زمان دیگری انتخاب کنید'

    return True, None
