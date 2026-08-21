from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")

# Without this, Django can't tell an HTTPS request (terminated by
# nginx, then forwarded internally over plain HTTP to gunicorn) from a
# genuinely insecure one — SECURE_SSL_REDIRECT below would then
# redirect EVERY request to HTTPS again, including ones that already
# arrived as HTTPS, producing an infinite redirect loop in the browser.
# Only safe because nginx is the sole thing able to reach this
# container directly (no ports: exposed on the backend service in
# docker-compose.prod.yml) — a client could otherwise forge this
# header and trick Django into treating a plain HTTP request as secure.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

if SECRET_KEY == "dev-only-secret-change-in-prod":  # noqa: F405
    raise RuntimeError("DJANGO_SECRET_KEY must be set explicitly in production.")
if JWT_SIGNING_KEY == "change-me-super-secret":  # noqa: F405
    raise RuntimeError("JWT_SIGNING_KEY must be set explicitly in production.")

LOGGING["root"]["level"] = "WARNING"  # noqa: F405
