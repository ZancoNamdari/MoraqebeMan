"""
URL configuration for the identity_service project.
"""
from django.contrib import admin
from django.urls import path

from config.health import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health-check"),
    # api/auth/ wiring lands here once apps.authentication has real
    # register/login/refresh views — intentionally not stubbed with
    # placeholder endpoints that would need to be torn out later.
]
