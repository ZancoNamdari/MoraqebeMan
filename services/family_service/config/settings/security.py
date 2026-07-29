import environ

env = environ.Env()

SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-only-secret-change-in-prod")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

# Must match identity_service's JWT_SIGNING_KEY exactly — this service
# has no User table of its own; it verifies tokens issued by
# identity_service locally (see apps/families/authentication.py).
JWT_SIGNING_KEY = env("JWT_SIGNING_KEY", default="change-me-super-secret")

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
CORS_ALLOW_CREDENTIALS = True

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=False)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=False)
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False)
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
