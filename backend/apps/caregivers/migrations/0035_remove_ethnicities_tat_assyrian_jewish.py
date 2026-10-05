from django.db import migrations

# قومیت‌های تات / آشوری / یهودی ایرانی و زیرگروه «گیلکی‌مجاور» (فارس) حذف شدند.
# پاسخ‌های قبلی به «سایر» نگاشت می‌شوند تا داده‌ی افراد از دست نرود.
REMOVED_MAINS = {"tat", "assyrian", "jewish"}


def forwards(apps, schema_editor):
    Identity = apps.get_model("caregivers", "IdentityProfile")
    for ident in Identity.objects.all().iterator():
        ethnicities = list(ident.ethnicities or [])
        details = dict(ident.ethnicity_details or {})
        changed = False

        if any(e in REMOVED_MAINS for e in ethnicities):
            new, seen = [], set()
            for e in ethnicities:
                e = "other" if e in REMOVED_MAINS else e
                if e not in seen:
                    seen.add(e)
                    new.append(e)
            ethnicities = new
            changed = True
        for main in REMOVED_MAINS:
            if main in details:
                details.pop(main)
                changed = True

        fars = details.get("fars")
        if fars and "gilaki_neighbor" in fars:
            fars = [("other" if x == "gilaki_neighbor" else x) for x in fars]
            details["fars"] = list(dict.fromkeys(fars))
            changed = True

        if changed:
            ident.ethnicities = ethnicities
            ident.ethnicity_details = details
            ident.save(update_fields=["ethnicities", "ethnicity_details"])


class Migration(migrations.Migration):

    dependencies = [
        ("caregivers", "0034_identity_child_accompany_at_work"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
