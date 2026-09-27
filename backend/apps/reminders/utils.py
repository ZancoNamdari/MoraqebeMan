import jdatetime
from django.utils import timezone


def jalali_now():
    """
    django_jalali's jDateTimeField stores a real, timezone-aware
    Gregorian datetime under the hood. This project runs with
    USE_TZ=True (TIME_ZONE="Asia/Tehran"), so a bare
    jdatetime.datetime.now() is NAIVE and corrupts anything compared
    against a value read back from such a field (raises
    "can't subtract offset-naive and offset-aware datetimes", or
    silently drifts by the UTC offset if the subtraction happens to
    not error). fromgregorian(datetime=timezone.now()) is the
    verified-safe way to get a timezone-aware jdatetime "now".
    """
    return jdatetime.datetime.fromgregorian(datetime=timezone.now())
