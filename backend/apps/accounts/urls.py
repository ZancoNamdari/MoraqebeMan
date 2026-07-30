from django.urls import path

from .views import MyIdentityProfileView

urlpatterns = [
    path("me/identity-profile/", MyIdentityProfileView.as_view(), name="my-identity-profile"),
]
