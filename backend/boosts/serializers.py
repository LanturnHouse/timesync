from rest_framework import serializers

from .models import Boost


class BoostSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_display_name = serializers.CharField(
        source="user.display_name", read_only=True
    )

    class Meta:
        model = Boost
        fields = (
            "id", "user", "user_email", "user_display_name",
            "group", "created_at",
        )
        read_only_fields = ("id", "user", "created_at")
