from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import UserSettings
from .serializers import UserDetailSerializer, UserSettingsSerializer


class GoogleLogin(SocialLoginView):
    """
    Google OAuth2 login endpoint.
    Accepts an authorization code from the frontend and returns JWT tokens.
    """
    adapter_class = GoogleOAuth2Adapter
    callback_url = "http://localhost:3000/callback"
    client_class = OAuth2Client


class UserProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/profile/ — view and update current user's profile."""

    serializer_class = UserDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserSettingsView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/settings/ — user's preference settings."""

    serializer_class = UserSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, _ = UserSettings.objects.get_or_create(user=self.request.user)
        return obj
