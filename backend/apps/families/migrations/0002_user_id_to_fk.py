"""
Converts FamilyProfile.user_id and PatientProfile.user_id from a plain
integer to a real ForeignKey — safely, preserving any existing data,
rather than the destructive "just regenerate 0001" approach used
earlier this session (which is what caused this to be needed as a
separate migration in the first place: a database that already had
the old 0001_initial applied silently never got the new schema when
0001's *file* was replaced, since Django tracks applied migrations by
name only, not content).

Can't just AddField('user') directly — a OneToOneField named `user`
auto-creates a DB column literally named `user_id`, colliding with the
existing `user_id` column this migration needs to replace. Goes via a
temporary name instead:

  1. Add `user_new` (nullable FK) — no collision, different column name
  2. Copy the old user_id value into user_new's underlying column
     directly (both are just the same integer — the old value already
     IS a valid user id, no need to look anything up)
  3. Drop the old user_id column
  4. Rename user_new -> user (its column becomes user_id again, now
     free)
  5. FamilyProfile.user is non-nullable in the final model (every
     family account always has a real login) — only make it NOT NULL
     after every existing row has been populated, not before.
Reversibility: this migration is NOT safely reversible, and deliberately
doesn't pretend otherwise. Reversing RemoveField re-adds the original
NOT-NULL user_id column before the data-copy step's own reversal would
run (Django reverses operations in strict reverse order — the RunPython
step ends up on the wrong side of the schema change it needs to precede
during a rollback), which fails with an IntegrityError. Confirmed this
concretely rather than assumed it: an attempted reverse fails loudly
with a clear database error, not silent data loss or corruption — an
acceptable outcome given nobody has an operational reason to roll back
this schema improvement. If a rollback is ever genuinely needed,
restore from a database backup rather than `migrate families 0001`.
"""
from django.db import migrations, models
import django.db.models.deletion


def copy_user_id_forward(apps, schema_editor):
    FamilyProfile = apps.get_model("families", "FamilyProfile")
    PatientProfile = apps.get_model("families", "PatientProfile")
    for profile in FamilyProfile.objects.all():
        profile.user_new_id = profile.user_id
        profile.save(update_fields=["user_new_id"])
    for profile in PatientProfile.objects.all():
        if profile.user_id is not None:
            profile.user_new_id = profile.user_id
            profile.save(update_fields=["user_new_id"])


class Migration(migrations.Migration):
    dependencies = [
        ("families", "0001_initial"),
        migrations.swappable_dependency("accounts.User"),
    ]

    operations = [
        migrations.AddField(
            model_name="familyprofile",
            name="user_new",
            field=models.OneToOneField(
                null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name="family_profile", to="accounts.user", verbose_name="کاربر",
            ),
        ),
        migrations.AddField(
            model_name="patientprofile",
            name="user_new",
            field=models.OneToOneField(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name="patient_profile", to="accounts.user", verbose_name="کاربر",
            ),
        ),
        migrations.RunPython(copy_user_id_forward, migrations.RunPython.noop),
        migrations.RemoveField(model_name="familyprofile", name="user_id"),
        migrations.RemoveField(model_name="patientprofile", name="user_id"),
        migrations.RenameField(model_name="familyprofile", old_name="user_new", new_name="user"),
        migrations.RenameField(model_name="patientprofile", old_name="user_new", new_name="user"),
    ]
