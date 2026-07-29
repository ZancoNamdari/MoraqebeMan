"""
URL configuration for the identity_service project.
"""
from django.contrib import admin
from django.urls import include, path

from config.health import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health-check"),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/auth/", include("apps.authorization.urls")),
    path("api/auth/", include("apps.accounts.urls")),
]
