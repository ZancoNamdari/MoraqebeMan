"""
Grants the permissions the "temp dashboard" needs. is_staff=True (set
automatically for role=ADMIN via User.save()) only gets someone into
the admin site's login page — it does NOT grant permission to add/
change anything there. Without this, an ADMIN-role supervisor could
log into /admin/ and see nothing they can actually edit.

Creates a "ناظران مراقب" (Caregiver Supervisors) group with add/change/
view permissions on exactly the models this dashboard touches: User
(so they can create the caregiver's account), and every caregivers-app
model. Deliberately does NOT grant delete permission — a supervisor
entering data shouldn't be able to permanently remove a caregiver
record; that stays a superuser-only action.

A superuser adds ADMIN-role staff to this group the normal Django way
(Users → select user → Groups), the same one-time step as any other
Django permission setup — not automated further than this, since
auto-assigning group membership from inside User.save() would be one
more thing layered onto a method that has already been a repeated
source of bugs this session every time it grew a new responsibility.
"""
from django.apps import apps as global_apps
from django.contrib.auth.management import create_permissions
from django.contrib.contenttypes.management import create_contenttypes
from django.db import migrations


CAREGIVER_MODELS = [
    "identityprofile",
    "caregiverprofile",
    "caregiverworkpreferences",
    "caregiverservicearea",
    "caregiverexperience",
    "caregiverskills",
    "caregiverreference",
]


def create_supervisor_group(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    ContentType = apps.get_model("contenttypes", "ContentType")

    # Both ContentType and Permission rows are normally created by
    # separate post_migrate signal handlers (contenttypes' own, and
    # auth's create_permissions) that only fire once, after the ENTIRE
    # migrate run finishes. On a fresh database this data migration
    # runs before either has fired, so both have to be created
    # explicitly here — first found the ContentType half of this via a
    # live migrate run failing outright, then found Permission was
    # ALSO empty the same way (verified via a direct query after the
    # first fix, not assumed fixed just because the migration stopped
    # erroring).
    accounts_config = global_apps.get_app_config("accounts")
    caregivers_config = global_apps.get_app_config("caregivers")
    create_contenttypes(accounts_config, verbosity=0)
    create_contenttypes(caregivers_config, verbosity=0)
    create_permissions(accounts_config, verbosity=0)
    create_permissions(caregivers_config, verbosity=0)

    group, _ = Group.objects.get_or_create(name="ناظران مراقب")

    permissions = []

    # User: add/change/view only (never delete an account from here)
    user_ct = ContentType.objects.get(app_label="accounts", model="user")
    permissions += list(Permission.objects.filter(
        content_type=user_ct, codename__in=["add_user", "change_user", "view_user"]
    ))

    for model_name in CAREGIVER_MODELS:
        try:
            ct = ContentType.objects.get(app_label="caregivers", model=model_name)
        except ContentType.DoesNotExist:
            continue
        permissions += list(Permission.objects.filter(
            content_type=ct,
            codename__in=[f"add_{model_name}", f"change_{model_name}", f"view_{model_name}"],
        ))

    group.permissions.set(permissions)


def remove_supervisor_group(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name="ناظران مراقب").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("caregivers", "0001_initial"),
        ("accounts", "0002_alter_user_options_alter_user_first_name_and_more"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.RunPython(create_supervisor_group, remove_supervisor_group),
    ]
