"""برچسب ویژه «سریع‌السیر (فورس‌ماژور)».

خدمت‌دهنده‌ای که هیچ شرط همکاری‌ای ندارد و هر شرایطی را می‌پذیرد، فقط باید سریعاً در محل خدمت
حاضر شود. این برچسب را فقط آژانس/ادمین می‌زند (از مرحله‌ی «نوع خدمت» ویزارد). برای چنین
خدمت‌دهنده‌ای مراحل شرایط همکاری، سوابق و مهارت و پرسشنامه‌ی سازگاری لازم نیست؛ فقط نوع خدمت،
هویت، محل خدمت (مناطق) و پذیرش قوانین.
"""

RAPID_RESPONSE_TAG = "سریع‌السیر (فورس‌ماژور)"


def is_rapid_response(profile) -> bool:
    return RAPID_RESPONSE_TAG in (getattr(profile, "tags", None) or [])


def set_rapid_response(profile, enabled: bool) -> None:
    tags = list(profile.tags or [])
    if enabled and RAPID_RESPONSE_TAG not in tags:
        tags.append(RAPID_RESPONSE_TAG)
    elif not enabled and RAPID_RESPONSE_TAG in tags:
        tags = [t for t in tags if t != RAPID_RESPONSE_TAG]
    else:
        return
    profile.tags = tags
    profile.save(update_fields=["tags"])
