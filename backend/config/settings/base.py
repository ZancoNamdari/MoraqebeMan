from pathlib import Path

import environ

from .database import DATABASES  # noqa: F401
from .drf import REST_FRAMEWORK, SIMPLE_JWT, SPECTACULAR_SETTINGS  # noqa: F401
from .logging import LOGGING  # noqa: F401
from .security import (  # noqa: F401
    ALLOWED_HOSTS,
    AUTH_PASSWORD_VALIDATORS,
    CORS_ALLOW_ALL_ORIGINS,
    CORS_ALLOW_CREDENTIALS,
    CORS_ALLOWED_ORIGINS,
    JWT_SIGNING_KEY,
    SECRET_KEY,
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = environ.Env()

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "corsheaders",
    "django_jalali",
    # local — five apps merged from the two previously-independent
    # services (identity_service -> accounts/authentication/
    # authorization/audit, family_service -> families). Each keeps its
    # own models/serializers/views/urls exactly as it had them; only the
    # settings and URL root are merged.
    "apps.accounts",
    "apps.authentication",
    "apps.authorization",
    "apps.audit",
    "apps.families",
    "apps.caregivers",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.audit.middleware.AuditLogMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

AUTH_USER_MODEL = "accounts.User"

LANGUAGE_CODE = "fa"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------- Celery ----------
# Phase 1 stack deliberately drops RabbitMQ (per the architecture doc's
# cost rationale) — Redis serves as both cache and Celery broker/
# result-backend. This is a real change from the pre-merge
# identity_service, which used RABBITMQ_URL for CELERY_BROKER_URL;
# RabbitMQ comes back only when a module is later extracted to its own
# microservice (see the migration section of the architecture doc).
CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_IGNORE_RESULT = True

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://localhost:6379/1"),
        "KEY_PREFIX": "moraqebeman_backend",
    }
}
