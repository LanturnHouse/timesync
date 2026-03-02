from rest_framework import serializers

from .models import EventReminder


class EventReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventReminder
        fields = (
            "id",
            "event",
            "user",
            "remind_before_minutes",
            "is_sent",
            "sent_at",
            "created_at",
        )
        read_only_fields = ("id", "user", "is_sent", "sent_at", "created_at")
