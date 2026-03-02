from django.urls import path, include

from .views import GoogleLogin, UserProfileView, UserSettingsView

urlpatterns = [
    path("", include("dj_rest_auth.urls")),
    path("registration/", include("dj_rest_auth.registration.urls")),
    path("google/", GoogleLogin.as_view(), name="google_login"),
    path("profile/", UserProfileView.as_view(), name="user_profile"),
    path("settings/", UserSettingsView.as_view(), name="user_settings"),
]
