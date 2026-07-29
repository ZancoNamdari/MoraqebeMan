from datetime import timedelta

from .security import JWT_SIGNING_KEY

REST_FRAMEWORK = {
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
        # identity_service is the highest-value target for brute force —
        # throttle auth endpoints explicitly rather than relying on a
        # single global rate.
        "login": "10/min",
        "register": "20/hour",
        "password_reset": "5/hour",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Moraqebeman — Identity Service API",
    "DESCRIPTION": "احراز هویت، مدیریت نقش، تأیید شماره تلفن و بازیابی رمز عبور برای پلتفرم مراقب من.",
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
    # Custom claims (role, phone_number) are attached at issuance time in
    # apps/authentication/services.py — every other microservice trusts
    # these claims without a DB lookup back to identity_service.
}