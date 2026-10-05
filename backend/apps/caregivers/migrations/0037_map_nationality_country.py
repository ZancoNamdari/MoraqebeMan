from django.db import migrations

# متن آزاد قبلیِ «اهل کدام کشور» → کلید انتخابی؛ هرچه نگاشت نشد → «سایر» + همان متن.
KEYWORDS = [
    ("افغان", "afghanistan"), ("پاکستان", "pakistan"), ("عراق", "iraq"), ("سوریه", "syria"),
    ("سوری", "syria"), ("لبنان", "lebanon"), ("ترکمنستان", "turkmenistan"),
    ("آذربایجان", "azerbaijan"), ("اذربایجان", "azerbaijan"), ("تاجیک", "tajikistan"),
    ("ترکیه", "turkey"),
]
VALID = {"afghanistan", "pakistan", "iraq", "syria", "lebanon", "turkmenistan",
         "azerbaijan", "tajikistan", "turkey", "other"}


def forwards(apps, schema_editor):
    Identity = apps.get_model("caregivers", "IdentityProfile")
    for ident in Identity.objects.exclude(nationality_country="").iterator():
        raw = (ident.nationality_country or "").strip()
        if raw in VALID:
            continue
        key = next((k for kw, k in KEYWORDS if kw in raw), None)
        if key:
            ident.nationality_country = key
            ident.nationality_country_other = ""
        else:
            ident.nationality_country = "other"
            ident.nationality_country_other = raw[:100]
        ident.save(update_fields=["nationality_country", "nationality_country_other"])


class Migration(migrations.Migration):

    dependencies = [
        ("caregivers", "0036_identity_nationality_country_choices"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
