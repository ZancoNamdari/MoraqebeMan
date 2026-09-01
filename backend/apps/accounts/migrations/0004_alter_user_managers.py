# Generated manually — a real omission from an earlier delivery: the
# UserManager class was added to apps.accounts.models (to fix
# `createsuperuser` not setting role=SUPERUSER) but its migration was
# never generated at the time. This is that missing migration,
# written now specifically because `makemigrations --check` correctly
# caught the drift.

import apps.accounts.models
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_agency_supervisor_role'),
    ]

    operations = [
        migrations.AlterModelManagers(
            name='user',
            managers=[
                ('objects', apps.accounts.models.UserManager()),
            ],
        ),
    ]
