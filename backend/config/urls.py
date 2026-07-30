"""
URL configuration for the moraqebeman monolith backend. All modules
live under one root now — this is the single URLConf that, per the
architecture doc, external clients (frontend, Postman) should treat as
a stable contract even across the eventual microservice migration.
"""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from config.health import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health-check"),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/auth/", include("apps.authorization.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.families.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
