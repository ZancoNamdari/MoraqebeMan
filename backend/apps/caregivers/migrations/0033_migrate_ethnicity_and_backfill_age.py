import jdatetime
from django.db import migrations

# قومیت‌های قدیمی ترک به‌تفکیک شهر بودند؛ حالا قومیت اصلی «turk» + زیرگروه (اهل کجا).
OLD_TURK_TO_SUB = {
    "turk_tabriz": "tabrizi",
    "turk_zanjan": "zanjani",
    "turk_ardabil": "ardabili",
    "turk_other": None,
}


def _age(birth_date):
    if not birth_date:
        return None
    today = jdatetime.date.today()
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    return age if age >= 0 else None


def forwards(apps, schema_editor):
    Identity = apps.get_model("caregivers", "IdentityProfile")
    for ident in Identity.objects.all().iterator():
        changed_fields = []

        old = list(ident.ethnicities or [])
        if any(v in OLD_TURK_TO_SUB for v in old):
            new, seen = [], set()
            details = dict(ident.ethnicity_details or {})
            turk_subs = list(details.get("turk", []))
            for v in old:
                if v in OLD_TURK_TO_SUB:
                    sub = OLD_TURK_TO_SUB[v]
                    if sub and sub not in turk_subs:
                        turk_subs.append(sub)
                    v = "turk"
                if v not in seen:
                    seen.add(v)
                    new.append(v)
            if turk_subs:
                details["turk"] = turk_subs
            ident.ethnicities = new
            ident.ethnicity_details = details
            changed_fields += ["ethnicities", "ethnicity_details"]

        age = _age(ident.birth_date)
        if ident.age != age:
            ident.age = age
            changed_fields.append("age")

        if changed_fields:
            ident.save(update_fields=changed_fields)


class Migration(migrations.Migration):

    dependencies = [
        ("caregivers", "0032_identity_ethnicity_details_and_age"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
