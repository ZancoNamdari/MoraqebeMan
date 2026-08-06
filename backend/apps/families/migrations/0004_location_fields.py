"""
Adds structured province/city(/district) FK fields, matching the
pattern apps.caregivers already has. PatientProfile never had these
before — plain AddField, no complication. FamilyProfile.city already
existed as a free-text CharField, which needs care: Django's own
autodetector (checked via --dry-run before writing this by hand)
proposed a direct AlterField from CharField straight to ForeignKey on
the SAME column — an in-place type change that risks failing outright
or corrupting data on Postgres, not something to let happen
automatically. Same temp-name technique used for the caregivers ->
locations conversion earlier: add the new FK under a temporary name
(no column collision), preserve the old free-text value in a
permanent legacy field (can't auto-convert arbitrary free text like
"tehran" or "تهرون" into a specific location id, so it's kept as
reference rather than silently discarded), drop the old column, then
rename into place.
"""
from django.db import migrations, models
import django.db.models.deletion


def copy_legacy_city_forward(apps, schema_editor):
    FamilyProfile = apps.get_model("families", "FamilyProfile")
    for profile in FamilyProfile.objects.exclude(city_old=""):
        profile.legacy_city_text = profile.city_old
        profile.save(update_fields=["legacy_city_text"])


class Migration(migrations.Migration):
    dependencies = [
        ("families", "0003_alter_familyprofile_user_notnull"),
        ("locations", "0009_alter_province_ordering_number"),
    ]

    operations = [
        migrations.RenameField(model_name="familyprofile", old_name="city", new_name="city_old"),
        migrations.AddField(
            model_name="familyprofile", name="legacy_city_text",
            field=models.CharField(
                blank=True, max_length=100, verbose_name="شهر (متن قدیمی)",
                help_text="مقدار قبلی فیلد شهر پیش از تبدیل به فیلد ساختاریافته — برای مراجعه در صورت نیاز نگه داشته شده.",
            ),
        ),
        migrations.RunPython(copy_legacy_city_forward, migrations.RunPython.noop),
        migrations.RemoveField(model_name="familyprofile", name="city_old"),

        migrations.AddField(
            model_name="familyprofile", name="province",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                to="locations.province", verbose_name="استان",
            ),
        ),
        migrations.AddField(
            model_name="familyprofile", name="city",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                to="locations.city", verbose_name="شهر",
            ),
        ),

        migrations.AddField(
            model_name="patientprofile", name="province",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                to="locations.province", verbose_name="استان",
            ),
        ),
        migrations.AddField(
            model_name="patientprofile", name="city",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                to="locations.city", verbose_name="شهر",
            ),
        ),
        migrations.AddField(
            model_name="patientprofile", name="district",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                to="locations.district", verbose_name="منطقه",
            ),
        ),
    ]
