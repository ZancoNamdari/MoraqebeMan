from datetime import timedelta

from .security import JWT_SIGNING_KEY

REST_FRAMEWORK = {
    # A single authentication class for the whole monolith now — every
    # app shares one User table, so there's no more need for the
    # DB-lookup-free StatelessJWTAuthentication apps.families used when
    # it was a separate service (that class is still in
    # apps/families/authentication.py, kept for when this app is
    # eventually re-extracted to its own service — see the architecture
    # doc's migration section — just not wired in as the default here).
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/min",
        "register": "20/hour",
        "password_reset": "5/hour",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Moraqebeman — Monolith API",
    "DESCRIPTION": "احراز هویت، پروفایل خانواده/بیمار، و سایر ماژول‌های پلتفرم مراقب من (مونولیت ماژولار فاز ۱).",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": JWT_SIGNING_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
