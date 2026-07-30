"""
Now that apps.families shares the same DB and JWT auth as apps.accounts
(see config/settings/drf.py's merge notes), tests that need an
authenticated request must use REAL users and REAL tokens — the old
family_service test suite used tests.factories.jwt_factory.make_token()
to hand-craft tokens for made-up user_ids that never existed in a
database, which only worked because family_service's standalone
StatelessJWTAuthentication never looked the user up. With real
JWTAuthentication now in play, a token for a non-existent user_id
raises AuthenticationFailed instead of silently working.
"""
from apps.accounts.models import User, UserRole
from apps.authentication.services import SimpleJWTTokenIssuer


def make_authenticated_user(username, role=UserRole.FAMILY, phone_number=None, password="StrongPass123"):
    phone_number = phone_number or f"0912{User.objects.count():07d}"
    user = User(username=username, phone_number=phone_number, email=f"{username}@example.com", role=role)
    user.set_password(password)
    user.save()
    tokens = SimpleJWTTokenIssuer().issue(user)
    return user, tokens["access"]
