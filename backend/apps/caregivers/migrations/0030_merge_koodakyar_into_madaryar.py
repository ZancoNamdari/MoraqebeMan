from django.db import migrations

# کودک‌یار به‌طور کامل در مادریار ادغام شد:
#   service_types     : "koodakyar" حذف و "madaryar" اضافه می‌شود
#   service_subtypes  : زیرشاخه‌های کودک‌یار به زیرشاخه‌های جدید مادریار نگاشت می‌شوند
#   service_specific_answers (فرم ۲/۳/پرسشنامه): کلید "koodakyar" داخل "madaryar" ادغام می‌شود
# دوران بارداری / در شرف زایمان / پس از زایمان هم دیگر زیرشاخه نیستند؛
# به «نوزاد» + ترجیح مرحله (newborn_stage_preferences) تبدیل می‌شوند.

KOODAKYAR_SUBTYPE_MAP = {
    "general_childcare": "child",
    "homework_tutor": "homework_helper",
    "live_in_housework_childcare": "housework_child",
}
OLD_STAGE_SUBTYPES = ("pregnancy", "labor", "postpartum")


def _dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _merge_answers(ssa, rename=None, extra=None):
    """Fold ssa["koodakyar"] into ssa["madaryar"]; returns (new_ssa, changed)."""
    ssa = dict(ssa or {})
    kood = ssa.pop("koodakyar", None)
    changed = kood is not None
    mad = dict(ssa.get("madaryar") or {})
    if kood:
        kood = dict(kood)
        for old, new in (rename or {}).items():
            if old in kood:
                kood[new] = kood.pop(old)
        # پاسخ‌های قبلیِ خود مادریار اولویت دارند.
        mad = {**kood, **mad}
    if extra:
        for k, v in extra.items():
            if k not in mad:
                mad[k] = v
                changed = True
    if mad:
        ssa["madaryar"] = mad
    return ssa, changed


def forwards(apps, schema_editor):
    Profile = apps.get_model("caregivers", "CaregiverProfile")
    WorkPrefs = apps.get_model("caregivers", "CaregiverWorkPreferences")
    Experience = apps.get_model("caregivers", "CaregiverExperience")
    Questionnaire = apps.get_model("caregivers", "CaregiverCompatibilityQuestionnaire")

    for profile in Profile.objects.all().iterator():
        types = list(profile.service_types or [])
        subtypes = dict(profile.service_subtypes or {})
        old_mad = list(subtypes.get("madaryar") or [])
        had_kood = "koodakyar" in types or "koodakyar" in subtypes
        stage_prefs = [s for s in old_mad if s in OLD_STAGE_SUBTYPES]

        new_mad = []
        for s in old_mad:
            new_mad.append("newborn" if s in OLD_STAGE_SUBTYPES else s)
        for s in subtypes.pop("koodakyar", []) or []:
            if s in KOODAKYAR_SUBTYPE_MAP:
                new_mad.append(KOODAKYAR_SUBTYPE_MAP[s])
        new_mad = _dedupe(new_mad)

        if had_kood or stage_prefs:
            types = _dedupe(["madaryar" if t == "koodakyar" else t for t in types])
            if new_mad:
                subtypes["madaryar"] = new_mad
            else:
                subtypes.pop("madaryar", None)
            profile.service_types = types
            profile.service_subtypes = subtypes
            profile.save(update_fields=["service_types", "service_subtypes"])

        extra = {"newborn_stage_preferences": _dedupe(stage_prefs)} if stage_prefs else None

        wp = WorkPrefs.objects.filter(profile_id=profile.pk).first()
        if wp is not None:
            new, changed = _merge_answers(wp.service_specific_answers, extra=extra)
            if changed:
                wp.service_specific_answers = new
                wp.save(update_fields=["service_specific_answers"])

        exp = Experience.objects.filter(profile_id=profile.pk).first()
        if exp is not None:
            new, changed = _merge_answers(
                exp.service_specific_answers,
                # همین کلید در فرم ۳ مادریار (نوزاد) هم وجود دارد.
                rename={"weaning_support_experience": "child_weaning_support_experience"},
            )
            if changed:
                exp.service_specific_answers = new
                exp.save(update_fields=["service_specific_answers"])

        q = Questionnaire.objects.filter(caregiver_id=profile.pk).first()
        if q is not None:
            new, changed = _merge_answers(q.service_specific_answers)
            if changed:
                q.service_specific_answers = new
                q.save(update_fields=["service_specific_answers"])


class Migration(migrations.Migration):

    dependencies = [
        ("caregivers", "0029_service_type_merge_help_texts"),
    ]

    operations = [
        # برگشت‌پذیر نیست (ادغام اطلاعات را یکی می‌کند)؛ برگشت بی‌اثر است.
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
