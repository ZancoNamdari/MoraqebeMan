from django.db import migrations

# Renames the display label of the platform's original built-in
# stage rows (matched by their fixed `value`, per pipeline_type) for
# every agency that has already been seeded — apps.agencies.
# pipeline_stages._DEFAULT_STAGES only affects agencies seeded from
# here on, so existing rows need this one-off relabel to pick up the
# new titles. Only `label` changes; `value`/`order` are untouched, so
# nothing about how cards store or match their stage is affected.
# Any custom stage an agency appended on its own (a `value` not in
# this map) is left alone.
RELABELS = {
    "patient": {
        "registration": "ثبت در سایت",
        "expired": "نزدیک به اتمام قرارداد",
    },
    "caregiver": {
        "being_dispatched": "اعزام",
        "first_week": "هفته اول: پیگیری اولیه",
        "confirmed": "قرارداد بسته و تایید شده",
        "expired": "نزدیک به اتمام قرارداد",
    },
}


def relabel_forward(apps, schema_editor):
    AgencyPipelineStage = apps.get_model("agencies", "AgencyPipelineStage")
    for pipeline_type, value_to_label in RELABELS.items():
        for value, label in value_to_label.items():
            AgencyPipelineStage.objects.filter(pipeline_type=pipeline_type, value=value).update(label=label)


def relabel_backward(apps, schema_editor):
    AgencyPipelineStage = apps.get_model("agencies", "AgencyPipelineStage")
    old_labels = {
        "patient": {
            "registration": "ثبت‌نام ورود",
            "expired": "منقضی‌ها",
        },
        "caregiver": {
            "being_dispatched": "در حال اعزام",
            "first_week": "هفته اول",
            "confirmed": "تأیید شده",
            "expired": "منقضی‌ها",
        },
    }
    for pipeline_type, value_to_label in old_labels.items():
        for value, label in value_to_label.items():
            AgencyPipelineStage.objects.filter(pipeline_type=pipeline_type, value=value).update(label=label)


class Migration(migrations.Migration):
    dependencies = [
        ("agencies", "0014_alter_agencypipelinestage_pipeline_type"),
    ]

    operations = [
        migrations.RunPython(relabel_forward, relabel_backward),
    ]
