from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("episodic", "0002_seed_default_reminder_rule"),
        # Ensures every existing EpisodicReminderRule row has already
        # been copied into the generic apps.reminders.ReminderRule
        # table before the model (and its data) disappears here.
        ("reminders", "0002_copy_episodic_reminder_rules"),
    ]

    operations = [
        migrations.DeleteModel(name="EpisodicReminderRule"),
    ]
