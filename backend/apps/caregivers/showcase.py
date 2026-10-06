"""
اطلاعات «ویترین» مراقب برای نمایش به خانواده/سالمند: عکس پروفایل، استعدادهای
ویژه، تعداد مراقبت‌های انجام‌شده و درصد رضایت. فقط خواندنی و محاسبه‌شده —
هیچ‌چیز جدیدی ذخیره نمی‌کند.
"""
from django.db.models import Avg

from .choices import SpecialTalent
from .models import CaregiverDocumentReviewStatus, CaregiverDocumentType, CaregiverDocumentUpload

_TALENT_LABELS = dict(SpecialTalent.choices)


def profile_photo_url(caregiver):
    """فقط عکس پرسنلیِ تأییدشده به خانواده نشان داده می‌شود؛ عکس در انتظار
    بررسی یا ردشده هرگز نمایش داده نمی‌شود."""
    upload = CaregiverDocumentUpload.objects.filter(
        caregiver=caregiver, document_type=CaregiverDocumentType.PERSONAL_PHOTO,
        status=CaregiverDocumentReviewStatus.APPROVED,
    ).first()
    return upload.file.url if upload and upload.file else None


def special_talent_labels(caregiver):
    identity = getattr(caregiver.user, "caregiver_identity_profile", None)
    if identity is None:
        return []
    labels = [_TALENT_LABELS[v] for v in (identity.special_talents or []) if v in _TALENT_LABELS and v != "other"]
    if "other" in (identity.special_talents or []):
        labels.append(identity.special_talents_other.strip() or _TALENT_LABELS["other"])
    return labels


def care_count(caregiver):
    """تعداد مراقبت‌هایی که این مراقب تاکنون برعهده گرفته (هر تخصیص = یک مراقبت،
    چه فعال چه پایان‌یافته)."""
    return caregiver.assignments.count()


def satisfaction_percent(caregiver):
    """میانگین امتیاز ۱ تا ۵ خانواده‌ها، به درصد (۵ = ۱۰۰٪)؛ بدون نظر → None."""
    avg = caregiver.reviews.aggregate(avg=Avg("rating"))["avg"]
    return None if avg is None else round(avg / 5 * 100)
