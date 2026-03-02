from rest_framework import serializers

from .models import Webhook, WebhookLog


class WebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Webhook
        fields = (
            "id",
            "group",
            "created_by",
            "url",
            "event_types",
            "is_active",
            "secret",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def validate_event_types(self, value):
        valid = {c[0] for c in Webhook.EventTypeChoices.choices}
        for et in value:
            if et not in valid:
                raise serializers.ValidationError(
                    f"Invalid event type: {et}. Valid: {', '.join(valid)}"
                )
        return value


class WebhookLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookLog
        fields = (
            "id",
            "webhook",
            "event_type",
            "payload",
            "response_status",
            "response_body",
            "success",
            "created_at",
        )
