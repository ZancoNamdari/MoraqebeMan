from django.db import migrations

OLD = "سریع‌السیر (فورس‌ماژور)"
NEW = "فورس‌ماژور"


def forwards(apps, schema_editor):
    Profile = apps.get_model("caregivers", "CaregiverProfile")
    for p in Profile.objects.exclude(tags=[]).only("id", "tags"):
        tags = list(p.tags or [])
        if OLD not in tags:
            continue
        out = []
        for t in tags:
            t = NEW if t == OLD else t
            if t not in out:
                out.append(t)
        p.tags = out
        p.save(update_fields=["tags"])


class Migration(migrations.Migration):
    dependencies = [("caregivers", "0042_questionnaire_trait_profiles")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
