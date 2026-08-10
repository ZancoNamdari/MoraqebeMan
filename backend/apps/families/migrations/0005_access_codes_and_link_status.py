"""
Adds:
- access_code to FamilyProfile and PatientProfile (unique, human-
  shareable codes like FAM-92K7XQ / ELD-7K4P9X)
- status/access_level/approved_by/approved_at to FamilyPatientLink,
  for the request-and-approve connection flow.

access_code is unique and required at the model level, but can't just
be added as such directly — Django (rightly) refuses to add a non-
nullable unique field without a strategy for whatever rows might
already exist. Learned this exact lesson already this project with
CaregiverProfile.created_by and the families user_id conversion: add
nullable first, populate for real via RunPython, then tighten the
constraint once every row actually has a value, not before.
"""
from django.db import migrations, models
import django.db.models.deletion
import django.utils.crypto
import django_jalali.db.models as jmodels


_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def _unique_code(model, prefix):
    while True:
        candidate = f"{prefix}-{django.utils.crypto.get_random_string(6, _CODE_ALPHABET)}"
        if not model.objects.filter(access_code=candidate).exists():
            return candidate


def populate_access_codes(apps, schema_editor):
    FamilyProfile = apps.get_model("families", "FamilyProfile")
    PatientProfile = apps.get_model("families", "PatientProfile")
    for profile in FamilyProfile.objects.filter(access_code__isnull=True):
        profile.access_code = _unique_code(FamilyProfile, "FAM")
        profile.save(update_fields=["access_code"])
    for profile in PatientProfile.objects.filter(access_code__isnull=True):
        profile.access_code = _unique_code(PatientProfile, "ELD")
        profile.save(update_fields=["access_code"])


class Migration(migrations.Migration):
    dependencies = [
        ("families", "0004_location_fields"),
        migrations.swappable_dependency("accounts.User"),
    ]

    operations = [
        migrations.AddField(
            model_name="familyprofile", name="access_code",
            field=models.CharField(max_length=20, null=True, unique=True, editable=False, verbose_name="کد عضو خانواده"),
        ),
        migrations.AddField(
            model_name="patientprofile", name="access_code",
            field=models.CharField(max_length=20, null=True, unique=True, editable=False, verbose_name="کد بیمار"),
        ),
        migrations.RunPython(populate_access_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="familyprofile", name="access_code",
            field=models.CharField(
                max_length=20, unique=True, editable=False, verbose_name="کد عضو خانواده",
                help_text="کد یکتا برای دعوت این عضو خانواده توسط یک بیمار — مثلاً FAM-92K7XQ",
            ),
        ),
        migrations.AlterField(
            model_name="patientprofile", name="access_code",
            field=models.CharField(
                max_length=20, unique=True, editable=False, verbose_name="کد بیمار",
                help_text="کد یکتا برای دعوت اعضای خانواده توسط این بیمار — مثلاً ELD-7K4P9X",
            ),
        ),

        migrations.AddField(
            model_name="familypatientlink", name="status",
            field=models.CharField(
                choices=[("pending", "در انتظار تأیید"), ("approved", "تأییدشده"), ("rejected", "رد شده")],
                default="approved", max_length=20, verbose_name="وضعیت",
            ),
        ),
        migrations.AddField(
            model_name="familypatientlink", name="access_level",
            field=models.CharField(
                choices=[("full_access", "دسترسی کامل"), ("view_only", "فقط مشاهده")],
                default="full_access", max_length=20, verbose_name="سطح دسترسی",
            ),
        ),
        migrations.AddField(
            model_name="familypatientlink", name="approved_by",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name="approved_family_links", to="accounts.user", verbose_name="تأییدشده توسط",
            ),
        ),
        migrations.AddField(
            model_name="familypatientlink", name="approved_at",
            field=jmodels.jDateTimeField(blank=True, null=True, verbose_name="زمان تأیید"),
        ),
    ]
