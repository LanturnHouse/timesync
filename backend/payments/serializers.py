from rest_framework import serializers

from .models import BoostSubscription, SubscriptionPayment


class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPayment
        fields = ("id", "order_id", "amount", "status", "created_at")
        read_only_fields = fields


class BoostSubscriptionSerializer(serializers.ModelSerializer):
    payments = SubscriptionPaymentSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = BoostSubscription
        fields = (
            "id",
            "user",
            "user_email",
            "group",
            "plan",
            "status",
            "current_period_start",
            "current_period_end",
            "cancel_at_period_end",
            "failed_attempts",
            "payments",
            "created_at",
        )
        read_only_fields = fields
