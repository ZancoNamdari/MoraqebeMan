import os

# DJANGO_SETTINGS_MODULE=config.settings resolves here (this package).
# DJANGO_ENV controls which concrete settings module gets loaded —
# set it in docker-compose per-service (development locally, production
# in the prod compose/k8s manifest). Defaults to development so a bare
# `python manage.py runserver` with no env vars set still works.
_env = os.environ.get("DJANGO_ENV", "development").lower()

if _env == "production":
    from .production import *  # noqa: F401,F403
elif _env == "staging":
    # Staging behaves like production (hardened) but reads its own
    # ALLOWED_HOSTS/CORS from env — same file, driven entirely by env vars.
    from .production import *  # noqa: F401,F403
else:
    from .development import *  # noqa: F401,F403