from django.db import migrations, models
from django.utils.crypto import get_random_string

# Same alphabets as apps.agencies.models — deliberately copied here
# rather than imported. Migrations must keep working even after the
# real model changes or is removed; the historical model this
# migration operates on (via apps.get_model below) has no methods at
# all, only fields, so the generation logic has to live here too.
_PREFIX_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ"
_SUFFIX_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_PREFIX_LENGTH = 3


def assign_prefixes_and_regenerate_codes(apps, schema_editor):
    """
    Per the confirmed product decision: every agency gets its own
    distinct code prefix instead of the one shared "AGN-" every
    agency's access_code used before this migration — and ALL
    existing agencies' codes are regenerated under the new format
    too, not just new ones going forward (explicitly confirmed,
    despite this being a breaking change for anyone already holding
    an old AGN-xxxxxx code — see this feature's own delivery notes
    for the operational heads-up that needs to go out to agencies
    still using their old code to onboard new families/caregivers).
    """
    AgencyProfile = apps.get_model("agencies", "AgencyProfile")

    used_prefixes = set()
    used_codes = set(AgencyProfile.objects.values_list("access_code", flat=True))

    # Deterministic order (by id) purely so a re-run of this exact
    # migration (e.g. on a fresh environment restoring from a schema
    # dump) assigns prefixes in the same order — not load-bearing for
    # correctness, just makes the outcome reproducible.
    for agency in AgencyProfile.objects.order_by("id"):
        while True:
            prefix = get_random_string(_PREFIX_LENGTH, _PREFIX_ALPHABET)
            if prefix not in used_prefixes:
                used_prefixes.add(prefix)
                break

        while True:
            code = f"{prefix}-{get_random_string(6, _SUFFIX_ALPHABET)}"
            if code not in used_codes:
                used_codes.add(code)
                break

        agency.code_prefix = prefix
        agency.access_code = code
        agency.save(update_fields=["code_prefix", "access_code"])


def noop_reverse(apps, schema_editor):
    # Deliberately a no-op, not a real rollback — there is no old
    # value to restore to (the whole point of this migration is that
    # the old shared "AGN-" codes are gone), and leaving every
    # agency's already-distributed new code in place on a rollback is
    # far safer than inventing fake old codes that were never actually
    # given to anyone.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("agencies", "0009_agencyprofile_admin_finance_access"),
    ]

    operations = [
        # Step 1: add the column nullable, no uniqueness yet — can't
        # add a unique NOT NULL column to a table that already has
        # rows without a value to put in it first.
        migrations.AddField(
            model_name="agencyprofile",
            name="code_prefix",
            field=models.CharField(max_length=3, null=True, editable=False, verbose_name="پیشوند کد آژانس"),
        ),
        # Step 2: backfill every existing row with its own distinct
        # prefix, and regenerate its access_code to use it.
        migrations.RunPython(assign_prefixes_and_regenerate_codes, noop_reverse),
        # Step 3: now that every row has a distinct value, enforce the
        # real constraint going forward.
        migrations.AlterField(
            model_name="agencyprofile",
            name="code_prefix",
            field=models.CharField(
                max_length=3, unique=True, editable=False, verbose_name="پیشوند کد آژانس",
                help_text="پیشوند سه‌حرفی مخصوص همین آژانس — یک‌بار در زمان ایجاد آژانس ساخته می‌شود و "
                          "دیگر تغییر نمی‌کند، تا کد این آژانس هیچ‌وقت با کد آژانس دیگری شبیه به هم نباشد.",
            ),
        ),
    ]
