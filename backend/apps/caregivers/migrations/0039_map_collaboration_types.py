from django.db import migrations

# نوع همکاری دو سطحی شد: بلندمدت (شبانه‌روزی/روزانه/شبانه/ماهانه) و
# کوتاه‌مدت (ساعتی/بیمارستان/شیفتی). مقادیر قدیمی:
#   daily / night / live_in  ⇒ زیرگروه بلندمدت (+ کلید long_term)
#   hospital_companion       ⇒ زیرگروه کوتاه‌مدت (+ کلید short_term)
#   home_companion           ⇒ حذف شد
LONG = {"daily", "night", "live_in"}


def forwards(apps, schema_editor):
    Prefs = apps.get_model("caregivers", "CaregiverWorkPreferences")
    for wp in Prefs.objects.all().iterator():
        old = list(wp.collaboration_types or [])
        new = []
        for t in old:
            if t == "home_companion":
                continue
            new.append(t)
            if t in LONG:
                new.append("long_term")
            elif t == "hospital_companion":
                new.append("short_term")
        new = list(dict.fromkeys(new))
        if new != old:
            wp.collaboration_types = new
            wp.save(update_fields=["collaboration_types"])


class Migration(migrations.Migration):

    dependencies = [
        ("caregivers", "0038_workprefs_collaboration_schedule_salary_range"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
