from django.urls import path

from .views import ChangeUserRoleView

urlpatterns = [
    path("users/<int:user_id>/role/", ChangeUserRoleView.as_view(), name="change-user-role"),
]
