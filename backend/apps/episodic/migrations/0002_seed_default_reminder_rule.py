from django.db import migrations


def seed_default_rule(apps, schema_editor):
    AgencyProfile = apps.get_model("agencies", "AgencyProfile")
    EpisodicReminderRule = apps.get_model("episodic", "EpisodicReminderRule")
    # One default row per agency that exists as of this migration —
    # matches models.DEFAULT_REMINDER_RULE exactly. Any agency created
    # AFTER this migration runs gets the same default lazily the first
    # time the settings screen's GET endpoint is called for it (see
    # EpisodicReminderRuleListCreateView.get).
    rows = [
        EpisodicReminderRule(
            agency=agency,
            anchor_stage="dispatched",
            display_stage="followup",
            days_threshold=7,
            label="موعد تماس با خدمت‌گیرنده",
            color="red",
        )
        for agency in AgencyProfile.objects.all()
    ]
    EpisodicReminderRule.objects.bulk_create(rows)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("episodic", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_default_rule, noop_reverse),
    ]
