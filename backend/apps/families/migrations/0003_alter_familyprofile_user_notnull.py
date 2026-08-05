from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("families", "0002_user_id_to_fk"),
    ]

    operations = [
        migrations.AlterField(
            model_name="familyprofile",
            name="user",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="family_profile", to="accounts.user", verbose_name="کاربر",
            ),
        ),
    ]
