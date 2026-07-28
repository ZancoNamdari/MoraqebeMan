from .base import *  # noqa: F401,F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True

# Verbose SQL/query logging is genuinely useful in dev and genuinely
# dangerous in prod (query text can contain PII) — kept isolated here.
LOGGING["loggers"]["django.db.backends"] = {  # noqa: F405
    "handlers": ["console"],
    "level": env.bool("SQL_DEBUG", default=False) and "DEBUG" or "INFO",  # noqa: F405
    "propagate": False,
}

# django-debug-toolbar, if installed — safe to leave this guarded so the
# import doesn't blow up production or a slimmer dev install.
try:
    import debug_toolbar  # noqa: F401

    INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
    MIDDLEWARE = ["debug_toolbar.middleware.DebugToolbarMiddleware"] + MIDDLEWARE  # noqa: F405
    INTERNAL_IPS = ["127.0.0.1"]
except ImportError:
    pass