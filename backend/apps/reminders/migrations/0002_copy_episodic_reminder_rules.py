from django.db import migrations


def copy_forward(apps, schema_editor):
    """
    apps.episodic had its own bespoke EpisodicReminderRule model
    (one row per agency, seeded by episodic's own 0002 migration) —
    now superseded by this app's generic ReminderRule, which any
    pipeline can use. Carry those existing rows across (tagged
    pipeline_key="episodic_services") so agencies that already
    configured/seeded an episodic reminder rule don't lose it.
    apps.episodic's own 0003 migration removes the old model AFTER
    this one has run — see that migration's dependency on this one.
    """
    EpisodicReminderRule = apps.get_model("episodic", "EpisodicReminderRule")
    ReminderRule = apps.get_model("reminders", "ReminderRule")

    for old in EpisodicReminderRule.objects.all():
        ReminderRule.objects.create(
            agency_id=old.agency_id,
            pipeline_key="episodic_services",
            anchor_stage=old.anchor_stage,
            display_stage=old.display_stage,
            days_threshold=old.days_threshold,
            label=old.label,
            color=old.color,
            is_active=old.is_active,
        )


def copy_backward(apps, schema_editor):
    # Deliberately a no-op: apps.episodic.0003 (which runs after this,
    # forward) deletes the old model outright, so there is nothing to
    # reverse-copy INTO on a rollback — the generic rows just stay in
    # apps.reminders.ReminderRule, which is harmless.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("reminders", "0001_initial"),
        ("episodic", "0002_seed_default_reminder_rule"),
    ]

    operations = [
        migrations.RunPython(copy_forward, copy_backward),
    ]
