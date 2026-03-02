from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer

from .models import User, UserSettings


class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id", "email", "display_name", "avatar_url",
            "plan", "timezone", "date_joined",
        )
        read_only_fields = ("id", "email", "date_joined")


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ("detect_self_conflicts", "detect_group_conflicts")


class CustomRegisterSerializer(RegisterSerializer):
    username = None
    display_name = serializers.CharField(max_length=100, required=False, default="")

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data["display_name"] = self.validated_data.get("display_name", "")
        return data

    def save(self, request):
        user = super().save(request)
        user.display_name = self.validated_data.get("display_name", "")
        user.save(update_fields=["display_name"])
        return user
