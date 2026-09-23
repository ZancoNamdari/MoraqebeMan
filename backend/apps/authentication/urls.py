from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    UpdateProfileView,
    LoginView,
    LogoutView,
    MeView,
    OTPLoginRequestView,
    OTPLoginVerifyView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    RequestOTPView,
    VerifyOTPView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("otp-login/request/", OTPLoginRequestView.as_view(), name="otp-login-request"),
    path("otp-login/verify/", OTPLoginVerifyView.as_view(), name="otp-login-verify"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path(
        "change-password/",
        ChangePasswordView.as_view(),
        name="change-password",
    ),    
    path(
        "profile/",
        UpdateProfileView.as_view(),
        name="update-profile",
    ),
    path("otp/request/", RequestOTPView.as_view(), name="otp-request"),
    path("otp/verify/", VerifyOTPView.as_view(), name="otp-verify"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]
