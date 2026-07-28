from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")  # no wildcard default in prod — must be set explicitly

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Fail loudly and immediately if these were left at dev defaults —
# far better than silently running production on a throwaway key.
if SECRET_KEY == "dev-only-secret-change-in-prod":  # noqa: F405
    raise RuntimeError("DJANGO_SECRET_KEY must be set explicitly in production.")
if JWT_SIGNING_KEY == "change-me-super-secret":  # noqa: F405
    raise RuntimeError("JWT_SIGNING_KEY must be set explicitly in production — "
                        "every other microservice trusts tokens signed with this key.")

LOGGING["root"]["level"] = "WARNING"  # noqa: F405