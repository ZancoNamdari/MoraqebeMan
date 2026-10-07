from django.db import migrations

# بهیار به‌صورت یک شاخه زیر «پرستار» ادغام شد:
#   service_types    : "behyar" حذف و "parastar" اضافه می‌شود
#   service_subtypes : سطح‌های بهیار (کمک بهیار / کمک پرستار / بهیار) به زیرمجموعه‌ی
#                      "parastar" می‌روند و شاخه‌ی "behyar" هم اضافه می‌شود
#                      (سطح «behyar» به «behyar_level» تغییر نام می‌دهد تا با شاخه تداخل نکند)
#   service_specific_answers (فرم ۲/۳/پرسشنامه): کلید "behyar" داخل "parastar" ادغام می‌شود
#                      و پاسخ‌های قبلیِ خود پرستار اولویت دارند.

LEVEL_MAP = {"aide_helper": "aide_helper", "nurse_helper": "nurse_helper", "behyar": "behyar_level"}


def _dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _merge_answers(ssa):
    """Fold ssa["behyar"] into ssa["parastar"]; returns (new_ssa, changed)."""
    ssa = dict(ssa or {})
    beh = ssa.pop("behyar", None)
    if beh is None:
        return ssa, False
    par = dict(ssa.get("parastar") or {})
    ssa["parastar"] = {**dict(beh), **par}
    return ssa, True


def forwards(apps, schema_editor):
    Profile = apps.get_model("caregivers", "CaregiverProfile")
    WorkPrefs = apps.get_model("caregivers", "CaregiverWorkPreferences")
    Experience = apps.get_model("caregivers", "CaregiverExperience")
    Questionnaire = apps.get_model("caregivers", "CaregiverCompatibilityQuestionnaire")

    for profile in Profile.objects.all().iterator():
        types = list(profile.service_types or [])
        subtypes = dict(profile.service_subtypes or {})
        had_behyar = "behyar" in types or "behyar" in subtypes
        if not had_behyar:
            continue
        levels = [LEVEL_MAP[s] for s in (subtypes.pop("behyar", []) or []) if s in LEVEL_MAP]
        types = _dedupe(["parastar" if t == "behyar" else t for t in types])
        subtypes["parastar"] = _dedupe(list(subtypes.get("parastar") or []) + ["behyar"] + levels)
        profile.service_types = types
        profile.service_subtypes = subtypes
        profile.save(update_fields=["service_types", "service_subtypes"])

        for model, fk in ((WorkPrefs, "profile_id"), (Experience, "profile_id"), (Questionnaire, "caregiver_id")):
            obj = model.objects.filter(**{fk: profile.pk}).first()
            if obj is not None:
                new, changed = _merge_answers(obj.service_specific_answers)
                if changed:
                    obj.service_specific_answers = new
                    obj.save(update_fields=["service_specific_answers"])


class Migration(migrations.Migration):

    dependencies = [
        ("caregivers", "0040_identity_special_talents"),
    ]

    operations = [
        # برگشت‌پذیر نیست (ادغام اطلاعات را یکی می‌کند)؛ برگشت بی‌اثر است.
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
