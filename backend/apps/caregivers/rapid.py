"""برچسب ویژه «فورس‌ماژور».

خدمت‌دهنده‌ای که هیچ شرط همکاری‌ای ندارد و هر شرایطی را می‌پذیرد، فقط باید سریعاً در محل خدمت
حاضر شود. این برچسب را فقط آژانس/ادمین می‌زند (از مرحله‌ی «نوع خدمت» ویزارد). برای چنین
خدمت‌دهنده‌ای مراحل شرایط همکاری، سوابق و مهارت و پرسشنامه‌ی سازگاری لازم نیست؛ فقط نوع خدمت،
هویت، محل خدمت (مناطق) و پذیرش قوانین. با برداشتن برچسب، مراحل حذف‌شده دوباره باز می‌شوند.
"""

RAPID_RESPONSE_TAG = "فورس‌ماژور"
# نام قدیمی برچسب؛ داده‌ی ذخیره‌شده با آن هم فورس‌ماژور حساب می‌شود و هنگام تغییر پاک می‌شود.
_LEGACY_TAGS = ("سریع‌السیر (فورس‌ماژور)",)
_ALL = (RAPID_RESPONSE_TAG, *_LEGACY_TAGS)


def is_rapid_response(profile) -> bool:
    return any(t in _ALL for t in (getattr(profile, "tags", None) or []))


def set_rapid_response(profile, enabled: bool) -> None:
    old = list(profile.tags or [])
    tags = [t for t in old if t not in _ALL]
    if enabled:
        tags.append(RAPID_RESPONSE_TAG)
    if tags == old:
        return
    profile.tags = tags
    profile.save(update_fields=["tags"])
