"""
URL configuration for the moraqebeman monolith backend. All modules
live under one root now — this is the single URLConf that, per the
architecture doc, external clients (frontend, Postman) should treat as
a stable contract even across the eventual microservice migration.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from config.health import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health-check"),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/auth/", include("apps.authorization.urls")),
    path("api/", include("apps.families.urls")),
    path("api/", include("apps.caregivers.urls")),
    path("api/", include("apps.locations.urls")),
    path("api/", include("apps.care.urls")),
    path("api/", include("apps.agencies.urls")),
    path("api/", include("apps.reviews.urls")),
    path("api/", include("apps.audit.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    # Dev-only — a voice-note complaint attachment is the first
    # FileField anywhere in this project, and until now nothing ever
    # actually needed MEDIA_URL/MEDIA_ROOT to be servable (they were
    # defined in settings but never wired up here). Production serves
    # media through nginx/a real object store, not Django directly —
    # this block deliberately never runs there.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
