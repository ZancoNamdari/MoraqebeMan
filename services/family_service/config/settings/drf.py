REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.families.authentication.StatelessJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Moraqebeman — Family Service API",
    "DESCRIPTION": "پروفایل خانواده، بیمار، و پرسشنامه سازگاری فرهنگی برای تطبیق مراقب.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
