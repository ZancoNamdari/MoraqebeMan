"""
Creates (or resets the password of) a SUPERUSER-role account, correctly
setting role=SUPERUSER so it cascades to is_staff/is_superuser via
User.save() — see apps/accounts/models.py. Exists specifically so
nobody has to hand-type/paste a fragile multi-line `manage.py shell -c
"..."` command, which behaves differently across bash/PowerShell/cmd
and is an easy way to lose an hour to quoting issues for something this
simple.

Usage (all arguments optional, sensible defaults shown):
    python manage.py create_admin
    python manage.py create_admin --username admin --password "Admin@12345"
"""
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User, UserRole


class Command(BaseCommand):
    help = "Create or reset a SUPERUSER-role account (admin panel + full API access)."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--password", default="Admin@12345")
        parser.add_argument("--email", default="admin@moraqebeman.local")
        parser.add_argument("--phone", default="09100000000")

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]
        email = options["email"]
        phone = options["phone"]

        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "phone_number": phone, "role": UserRole.SUPERUSER},
        )

        # If a different (non-superuser) account already owns this phone
        # number, get_or_create above would already have raised on the
        # unique constraint — but if THIS user just needs promoting,
        # phone_number might still need setting if it was blank before.
        if not created and not user.phone_number:
            user.phone_number = phone

        user.role = UserRole.SUPERUSER
        user.email = email or user.email
        user.is_active = True
        user.set_password(password)
        try:
            user.save()
        except Exception as exc:
            raise CommandError(
                f"Could not save user — this usually means phone_number "
                f"'{phone}' or email '{email}' is already used by a "
                f"different account. Try --phone/--email with different "
                f"values. Original error: {exc}"
            )

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(
            f"{action} superuser '{username}' (id={user.id}). "
            f"role={user.role} is_staff={user.is_staff} is_superuser={user.is_superuser}. "
            f"Log in at /admin/ with username='{username}'."
        ))
